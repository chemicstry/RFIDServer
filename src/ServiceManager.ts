import { EventInterface } from './EventInterface';
import { DataInterface } from './DataInterface';
import { RFIDService } from './RFIDService/RFIDService';
import { KeyProvider, HKDF } from './RFIDService/KeyProvider';
import { Log } from 'Utils/Log';

let IKM = Buffer.from('00102030405060708090A0B0B0A09080', 'hex');

class ServiceManager
{
    dataInterface: DataInterface;
    eventInterface: EventInterface;
    rfidService: RFIDService;
    keyProvider: KeyProvider;

    constructor(dataInterface: DataInterface)
    {
        this.dataInterface = dataInterface;
        this.eventInterface = new EventInterface(dataInterface);

        this.keyProvider = new HKDF(IKM, 'sha256', Buffer.from('RFIDService'));

        this.rfidService = new RFIDService(this.eventInterface, this.keyProvider);

        // Send server hello
        this.eventInterface.send("hello");
        this.eventInterface.on("hello", this.OnHello.bind(this));
    }

    OnHello(args: any): void
    {
        Log.info("ServiceManager::OnHello(): Client hello", {args});
    }
}

export {
    ServiceManager
};
