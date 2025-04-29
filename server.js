// server.js
const WebSocket = require('ws');
const si = require("systeminformation")
const loudness = require("loudness");
const util = require('util');
const {exec} = require("child_process")

const execPromise = util.promisify(exec)

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
    const currentBrightness = await getSystemBrightness()
    return {
        batteryLevel: battery.percent,
        networkStatus: networkStatus,
        systemTime: si.time(),
        currentBrightness
    };
}


async function getSystemBrightness() {
    try {
        const {stdout} = await execPromise('xrandr --verbose | grep -i brightness');
        const match = stdout.match(/Brightness:\s*(\d*\.?\d*)/);

        return match ? parseFloat(match[1]) : null;
        
    } catch (error) {
        console.error('Error getSystemBrightness', error);
        return null;
    }
    
}


async function handleRequest(message, ws){
    const {type, payload} = JSON.parse(message);

    switch (type) {
        case "GET_STATUS":
            const systemInfo = await getSystemInfo();
            ws.send(JSON.stringify({type: "GET_STATUS", payload: systemInfo}));            
            break;

        case 'VOLUME_UP':
            {
                let vol = await loudness.getVolume();
            console.log("vol", vol);
            
            vol = Math.min(vol + 5, 100)
            await loudness.setVolume(vol);
            ws.send(JSON.stringify({type: 'VOLUME_CONTROL', payload: vol}));
            break;
            }

            case 'VOLUME_DOWN':
                let vol = await loudness.getVolume();
                console.log("vol", vol);
                
                vol = Math.max(vol - 5, 0)
                await loudness.setVolume(vol);
                ws.send(JSON.stringify({type: 'VOLUME_CONTROL', payload: vol}));
                break;
                
            case "LOCK_SCREEN":
                exec("xdotool key Ctrl+alt+l", handleExecError)
                break;

            case "BRIGHTNESS_CONTROL": {
                exec(`xrandr --output eDP-1 --brightness ${Number(payload / 100).toFixed(1)}`)
            }    

    
        default:
            break;
    }
}


function handleExecError(err, stdout, stderr) {
    if(err){
        console.error('err', err)
        return;
    }

    if(stderr){
        console.error('stderr', stderr)
        return;
    }

    console.log("success", stdout);
    
}