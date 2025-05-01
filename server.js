// server.js
const WebSocket = require("ws");
const si = require("systeminformation");
const loudness = require("loudness");
const util = require("util");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const cron = require('node-cron');

const execPromise = util.promisify(exec);

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("New client connected.");

  ws.on("message", (message) => {
    console.log("message", message);

    handleRequest(message, ws);
  });

  // ws.send('Hello from server');
});

console.log("✅ WebSocket Server is running on ws://localhost:8080");

async function getSystemInfo() {
  const battery = await si.battery();
  const networkStatus = await si.networkStats();
  const currentBrightness = await getSystemBrightness();
  return {
    batteryLevel: battery.percent,
    networkStatus: networkStatus,
    systemTime: si.time(),
    currentBrightness,
  };
}

async function getSystemBrightness() {
  try {
    const { stdout } = await execPromise(
      "xrandr --verbose | grep -i brightness"
    );
    const match = stdout.match(/Brightness:\s*(\d*\.?\d*)/);

    return match ? parseFloat(match[1]) : null;
  } catch (error) {
    console.error("Error getSystemBrightness", error);
    return null;
  }
}

async function handleRequest(message, ws) {
  const { type, payload } = JSON.parse(message);
  console.log("payload", type, ":"+payload);

  switch (type) {
    case "GET_STATUS":
      const systemInfo = await getSystemInfo();
      ws.send(JSON.stringify({ type: "GET_STATUS", payload: systemInfo }));
      break;

    case "VOLUME_UP": {
      let vol = await loudness.getVolume();
      console.log("vol", vol);

      vol = Math.min(vol + 5, 100);
      await loudness.setVolume(vol);
      ws.send(JSON.stringify({ type: "VOLUME_CONTROL", payload: vol }));
      break;
    }

    case "VOLUME_DOWN":
      let vol = await loudness.getVolume();
      console.log("vol", vol);

      vol = Math.max(vol - 5, 0);
      await loudness.setVolume(vol);
      ws.send(JSON.stringify({ type: "VOLUME_CONTROL", payload: vol }));
      break;

    case "LOCK_SCREEN":
      exec("xdotool key Ctrl+alt+l", handleExecError);
      break;

    case "BRIGHTNESS_CONTROL": {
      exec(
        `xrandr --output eDP-1 --brightness ${Number(payload / 100).toFixed(1)}`
      );
      break;
    }

    case "FILE_TRANSFER": {
      // getting selected files

      console.log("payload server", payload);

      const base64Content = payload?.content?.replace(/^data:.+;base64,/, "");
      const buffer = Buffer.from(base64Content, "base64");

      // Define the upload directory
      const uploadDir = path.join(__dirname, "uploads");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`📁 Created directory: ${uploadDir}`);
      }

      const nameSplit = payload.name.split(".");
      const fileName = nameSplit[0]
      const extension = nameSplit[1]
      const filePath = path.join(uploadDir, fileName + Date.now() + `.${extension}`);

      fs.writeFileSync(filePath, buffer);

      ws.send(JSON.stringify({ type: "FILE_TRANSFER", payload: `📁 Created directory: ${uploadDir}` }));
      break;
    }

    default:
      break;
  }
}

function handleExecError(err, stdout, stderr) {
  if (err) {
    console.error("err", err);
    return;
  }

  if (stderr) {
    console.error("stderr", stderr);
    return;
  }

  console.log("success", stdout);
}



// run every day at 23:50 (11: 50 PM)

cron.schedule('50 23 * * *', () => {
  exec("xdotool key Ctrl+alt+l", handleExecError);
});