import { EventInterface } from '../EventInterface';
import { Tag, TagInfo } from './Tag';
import { TagFactory } from './TagFactory';
import { KeyProvider } from './KeyProvider';
import { Log } from 'Utils/Log';

const TAG_TRANSCEIVE_TIMEOUT = 1000;

interface TransceivePromise
{
    reject: (error: string) => void,
    resolve: (buf: Buffer) => void
}

class RFIDService
{
    eventInterface: EventInterface;
    keyProvider: KeyProvider;
    transceiveReqItr: number = 0;
    transceivePromises: TransceivePromise[] = [];

    constructor(eventInterface: EventInterface, keyProvider: KeyProvider)
    {
        this.eventInterface = eventInterface;
        this.keyProvider = keyProvider;

        this.eventInterface.on("RFIDService_NewTarget", this.OnNewTarget.bind(this));
        this.eventInterface.on("RFIDService_TagTransceive", this.OnTagTransceive.bind(this));
    }

    async TagTransceive(buf: Buffer)
    {
        // Get new transceive id (to match incoming )
        var id = this.transceiveReqItr++;

        this.eventInterface.send("RFIDService_TagTransceive", {
            id: id,
            data: buf.toString('hex')
        });

        return new Promise<Buffer>((resolve, reject) => {
            // Create timeout in case transceive gets stuck
            var timeout = setTimeout(() => {
                Log.error("RFIDService::TagTransceive(): request timed out");
                reject("Transceive timeout");
            }, TAG_TRANSCEIVE_TIMEOUT);

            // Create callback function to resolve promise
            this.transceivePromises[id] = {
                reject: reject,
                resolve: (buf) => {
                    delete this.transceivePromises[id];
                    clearTimeout(timeout);
                    resolve(buf);
                }
            };
        })
    }

    OnTagTransceive(args: any)
    {
        var id = args.id;

        if (!this.transceivePromises[id])
            return Log.error("RFIDService::OnTagTransceive(): Promise not found", {id});

        var error = args.error;

        if (error)
        {
            this.transceivePromises[id].reject(error);
            Log.error("RFIDService::OnTagTransceive(): Failed", {id, error});
            return;
        }

        // Resolve promise
        this.transceivePromises[id].resolve(Buffer.from(args.data, 'hex'));
    }

    async OnNewTarget(args: any)
    {
        Log.debug("RFIDService::OnNewTarget()", args);

        const taginfo: TagInfo = {
            ATQA: args.ATQA,
            SAK: args.SAK,
            UID: Buffer.from(args.UID, 'hex'),
            ATS: Buffer.from(args.ATS, 'hex')
        };

        var TagClass: typeof Tag;

        try {
            TagClass = TagFactory.Identify(taginfo);
        } catch (e) {
            return Log.error("RFIDService::OnNewTarget(): Identify failed.");
        }
        
        // Initialize tag
        var tag = new TagClass(taginfo, (buf: Buffer) => this.TagTransceive(buf));

        // Authenticate
        var res = await tag.Authenticate(this.keyProvider);

        if (res) {
            // Send unlock signal
            this.eventInterface.send("unlock", {});
            Log.info("RFIDService::OnNewTarget(): Authentication success!");
        } else
            Log.error("RFIDService::OnNewTarget(): Authentication FAILED!");

        // Release target
        this.eventInterface.send("RFIDService_ReleaseTarget");
    }
}

export {
    RFIDService
};
