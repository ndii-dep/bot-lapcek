const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

let publicUrl = null;
let tunnelProcess = null;
let webServer = null;
let webPort = 3000;

function getPublicUrl() {
    return publicUrl || `http://localhost:${webPort}`;
}

function setWebPort(port) {
    webPort = port;
}

async function startTunnel(port) {
    return new Promise((resolve, reject) => {
        try {
            const ngrokPath = path.join(__dirname, '..', 'ngrok');
            const cmd = `${ngrokPath} http ${port} --log=stdout`;
            
            tunnelProcess = exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.log('⚠️ Ngrok not found, using localhost only');
                    resolve(`http://localhost:${port}`);
                    return;
                }
            });

            setTimeout(() => {
                http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const tunnels = JSON.parse(data);
                            if (tunnels.tunnels && tunnels.tunnels.length > 0) {
                                publicUrl = tunnels.tunnels[0].public_url;
                                console.log(`🌍 Public URL: ${publicUrl}`);
                                resolve(publicUrl);
                            } else {
                                resolve(`http://localhost:${port}`);
                            }
                        } catch (e) {
                            resolve(`http://localhost:${port}`);
                        }
                    });
                }).on('error', () => {
                    resolve(`http://localhost:${port}`);
                });
            }, 3000);

        } catch (e) {
            console.log('⚠️ Tunnel failed, using localhost');
            resolve(`http://localhost:${port}`);
        }
    });
}

function stopTunnel() {
    if (tunnelProcess) {
        tunnelProcess.kill();
        tunnelProcess = null;
    }
    publicUrl = null;
}

async function restartWebServer(botSocket) {
    try {
        if (webServer) {
            await new Promise(resolve => webServer.close(resolve));
            console.log('🔄 Web server stopped');
        }
        
        const { createServer } = require('../server');
        webServer = await createServer(botSocket);
        
        console.log('✅ Web server restarted');
        return true;
    } catch (e) {
        console.error('❌ Failed to restart web server:', e.message);
        return false;
    }
}

function getWebStatus() {
    return {
        running: !!webServer,
        port: webPort,
        publicUrl: publicUrl || `http://localhost:${webPort}`,
        uptime: process.uptime(),
        memory: process.memoryUsage().heapUsed / 1024 / 1024,
        cpu: process.cpuUsage().user / 1000000
    };
}

function updateWebPort(port, botSocket) {
    webPort = port;
    return restartWebServer(botSocket);
}

module.exports = {
    startTunnel,
    stopTunnel,
    restartWebServer,
    getWebStatus,
    getPublicUrl,
    setWebPort,
    updateWebPort
};
