// server.js
const WebSocket = require('ws');
const si = require("systeminformation")
const loudness = require("loudness");

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('New client connected.');

    ws.on('message', (message) => {
        console.log("message", message);
        
        handleRequest(message, ws)

    });

    // ws.send('Hello from server');
});

console.log('✅ WebSocket Server is running on ws://localhost:8080');


async function getSystemInfo(){
    const battery = await si.battery();
    const networkStatus = await si.networkStats()

    return {
        batteryLevel: battery.percent,
        networkStatus: networkStatus,
        systemTime: si.time(),
    };
}


async function handleRequest(message, ws){
    const {type} = JSON.parse(message);

    switch (type) {
        case "GET_STATUS":
            const systemInfo = await getSystemInfo();
            ws.send(JSON.stringify({type: "GET_STATUS", payload: systemInfo}));            
            break;

        case 'VOLUME_UP':
            {
                let vol = await loudness.getVolume();
            console.log("vol", vol);
            
            vol = Math.min(vol + 10, 100)
            await loudness.setVolume(vol);
            ws.send(JSON.stringify({type: 'VOLUME_CONTROL', payload: vol}));
            break;
            }

            case 'VOLUME_DOWN':
                let vol = await loudness.getVolume();
                console.log("vol", vol);
                
                vol = Math.max(vol - 10, 0)
                await loudness.setVolume(vol);
                ws.send(JSON.stringify({type: 'VOLUME_CONTROL', payload: vol}));
                break;    
    
        default:
            break;
    }
}