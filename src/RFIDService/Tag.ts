import { KeyProvider } from './KeyProvider';

// Info provided when a new tag is detected (used to determine tag type)
interface TagInfo
{
    ATQA: [number, number],
    SAK: number,
    UID: Buffer,
    ATS: Buffer,
}

// Function used to transceive raw data with tag
type TagTransceiveFn = (data: Buffer) => Promise<Buffer>;

class Tag
{
    info: TagInfo;
    Transceive: TagTransceiveFn;

    constructor(info: TagInfo, transceiveFn: TagTransceiveFn)
    {
        this.info = info;
        this.Transceive = transceiveFn;
    }

    async Authenticate(keyProvider: KeyProvider): Promise<boolean>
    {
        return false;
    }

    // returns true if taginfo matches the specific card type
    static Identify(info: TagInfo): boolean
    {
        return false;
    }
}

export {
    Tag,
    TagInfo,
    TagTransceiveFn
};
