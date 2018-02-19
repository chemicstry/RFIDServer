import * as WebSocket from 'ws';
import { Log } from 'Utils/Log';
import { WSDataInterface } from './WSDataInterface';
import { ServiceManager } from './ServiceManager';

const wss = new WebSocket.Server({ port: 3000 });

wss.on('connection', (ws: WebSocket) => {
    Log.info("index: New websocket connection");

    let wsif = new WSDataInterface(ws);

    let svcMgr = new ServiceManager(wsif);
});

process.on('unhandledRejection', (reason, p) => {
    Log.error("Unhandled promise rejection");
    console.log(reason);
    console.log(p);
});
