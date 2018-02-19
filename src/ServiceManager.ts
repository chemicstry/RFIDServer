import { EventInterface } from './EventInterface';
import { DataInterface } from './DataInterface';
import { RFIDService } from './RFIDService/RFIDService';
import { KeyProvider, ConstantKeyProvider } from './RFIDService/KeyProvider';
import { Log } from 'Utils/Log';

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

        this.keyProvider = new ConstantKeyProvider(Buffer.from('00102030405060708090A0B0B0A09080', 'hex'));

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
