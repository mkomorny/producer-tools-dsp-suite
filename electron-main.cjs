const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');

let win;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function waitForServer(port, retries, delay) {
  return new Promise((resolve, reject) => {
    function attempt(n) {
      http.get(`http://localhost:${port}`, (res) => {
        resolve();
      }).on('error', () => {
        if (n <= 0) return reject(new Error(`Server did not start on port ${port}`));
        setTimeout(() => attempt(n - 1), delay);
      });
    }
    attempt(retries);
  });
}

function createWindow(port) {
  win = new BrowserWindow({
    width: 1280,
    height: 850,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'build', 'icon.ico'),
    show: false // wait until ready-to-show
  });

  win.once('ready-to-show', () => win.show());
  win.loadURL(`http://localhost:${port}`);
  win.on('closed', () => { win = null; });
}

app.whenReady().then(async () => {
  // Find a free port dynamically
  let port;
  try {
    port = await getFreePort();
  } catch (e) {
    port = 3000; // fallback
  }

  // Set environment before requiring the server
  process.env.APP_ROOT = __dirname;
  process.env.NODE_ENV = 'production';
  process.env.PORT = port.toString();

  // Start the Express server in-process
  try {
    require('./dist/server.cjs');
  } catch (err) {
    dialog.showErrorBox('Server failed to start', String(err));
    app.quit();
    return;
  }

  // Wait until the server is actually responding before opening the window
  try {
    await waitForServer(port, 40, 250); // up to 10 seconds
    createWindow(port);
  } catch (err) {
    dialog.showErrorBox('Server timed out', 'The internal server did not respond in time.\n\n' + String(err));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
