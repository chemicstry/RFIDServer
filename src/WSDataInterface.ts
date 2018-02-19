import { DataInterface } from './DataInterface';
import * as WebSocket from 'ws';

class WSDataInterface extends DataInterface {
    constructor(ws: WebSocket) {
        // Set upstream callback
        super((data: any) => {
            ws.send(JSON.stringify(data));
        });

        // Send websocket messages to downstream
        ws.on('message', (message: string): void => {
            if (this.downstream)
                this.downstream(JSON.parse(message));
        });
    }
}

export {
    WSDataInterface
};
