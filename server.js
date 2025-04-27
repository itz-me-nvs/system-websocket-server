// server.js
const WebSocket = require('ws');
const si = require("systeminformation")

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('New client connected.');

    ws.on('message', (message) => {

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
            ws.send(JSON.stringify({type: "STATUS", payload: systemInfo}));            
            break;
    
        default:
            break;
    }
}