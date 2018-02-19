import { EventEmitter } from 'events';
import { DataInterface } from './DataInterface';

class EventInterface extends EventEmitter
{
    dataInterface: DataInterface;

    constructor(dataInterface: DataInterface) {
        super();
        this.dataInterface = dataInterface;
        this.dataInterface.setCb(data => {
            this.emit(data.event, data.args);
        })
    }

    send(event: string, args = {}) {
        this.dataInterface.send({
            event,
            args
        });
    }
}

export {
    EventInterface
};
