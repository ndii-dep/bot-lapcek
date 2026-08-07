const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const FEEDBACK_FILE = './data/feedback.json';
const WEB_CONFIG_FILE = './data/webconfig.json';

function loadJSON(file, fallback = []) {
    try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8')); }
    catch (e) {}
    return fallback;
}

function saveJSON(file, data) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadWebConfig() {
    return loadJSON(WEB_CONFIG_FILE, {
        title: 'NeoGoforward Dashboard',
        theme: 'dark',
        autoRefresh: true,
        refreshInterval: 30000,
        showAnimations: true
    });
}

function saveWebConfig(config) {
    saveJSON(WEB_CONFIG_FILE, config);
}

function createServer(botSocket) {
    return new Promise((resolve, reject) => {
        const app = express();
        const PORT = global.botConfig?.webPort || 3000;

        app.use(cors());
        app.use(express.json());
        app.use(express.static(path.join(__dirname, 'public')));

        app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

        app.get('/api/config', (req, res) => res.json(loadWebConfig()));

        app.post('/api/config', (req, res) => {
            saveWebConfig({ ...loadWebConfig(), ...req.body });
            res.json({ success: true });
        });

        app.get('/api/status', (req, res) => {
            try {
                const { getFeatureStatus } = require('./lib/autoFeatures');
                const { getWebStatus } = require('./lib/webManager');
                res.json({
                    connected: !!botSocket,
                    uptime: process.uptime(),
                    memory: process.memoryUsage().heapUsed / 1024 / 1024,
                    cpu: process.cpuUsage().user / 1000000,
                    botName: global.botConfig.name,
                    version: global.botConfig.version,
                    owner: global.botConfig.owner,
                    prefix: global.botConfig.prefix,
                    web: getWebStatus(),
                    autoFeatures: {
                        welcome: getFeatureStatus('welcome'),
                        goodbye: getFeatureStatus('goodbye'),
                        typing: getFeatureStatus('autotyping'),
                        record: getFeatureStatus('autorecord'),
                        read: getFeatureStatus('autoread'),
                        postsw: getFeatureStatus('autopostsw'),
                        reactsw: getFeatureStatus('autoreactsw'),
                    }
                });
            } catch (e) {
                const { getWebStatus } = require('./lib/webManager');
                res.json({ connected: !!botSocket, uptime: process.uptime(), memory: process.memoryUsage().heapUsed / 1024 / 1024, web: getWebStatus() });
            }
        });

        app.get('/api/pr', (req, res) => {
            try { res.json(require('./lib/prTracker').getPRs()); }
            catch (e) { res.json([]); }
        });

        app.post('/api/pr/add', (req, res) => {
            try {
                const { addPR, formatPRDetail } = require('./lib/prTracker');
                const pr = addPR({ ...req.body, addedBy: 'Web Dashboard' });
                if (botSocket) {
                    const { getAllTargets } = require('./lib/channelManager');
                    const targets = getAllTargets();
                    const detail = formatPRDetail(pr);
                    for (const ch of targets.channels) { try { botSocket.sendMessage(ch.id, { text: `📢 PR BARU!\n\n${detail}` }); } catch (e) {} }
                    for (const gr of targets.groups) { try { botSocket.sendMessage(gr.id, { text: `📢 PR BARU!\n\n${detail}` }); } catch (e) {} }
                }
                res.json({ success: true, pr });
            } catch (e) { res.status(500).json({ success: false, error: e.message }); }
        });

        app.delete('/api/pr/:id', (req, res) => {
            try { require('./lib/prTracker').deletePR(req.params.id); res.json({ success: true }); }
            catch (e) { res.status(500).json({ success: false, error: e.message }); }
        });

        app.get('/api/schedule', (req, res) => {
            try { res.json(require('./lib/schoolData').getFullSchedule()); }
            catch (e) { res.json({}); }
        });

        app.get('/api/piket', (req, res) => {
            try { res.json(require('./lib/schoolData').getFullPiket()); }
            catch (e) { res.json({}); }
        });

        app.post('/api/send-message', async (req, res) => {
            if (!botSocket) return res.status(500).json({ success: false, error: 'Bot tidak terhubung' });
            const { number, message } = req.body;
            if (!number || !message) return res.status(400).json({ success: false, error: 'Nomor dan pesan wajib diisi' });
            try {
                let jid = number.replace(/[^0-9]/g, '');
                if (jid.startsWith('0')) jid = '62' + jid.slice(1);
                if (!jid.startsWith('62')) jid = '62' + jid;
                await botSocket.sendMessage(jid + '@s.whatsapp.net', { text: message });
                res.json({ success: true });
            } catch (e) { res.status(500).json({ success: false, error: e.message }); }
        });

        app.get('/api/feedback', (req, res) => res.json(loadJSON(FEEDBACK_FILE)));

        app.post('/api/feedback', async (req, res) => {
            try {
                const { name, category, message } = req.body;
                if (!message) return res.status(400).json({ success: false, error: 'Pesan wajib diisi' });
                const feedbacks = loadJSON(FEEDBACK_FILE);
                const fb = { id: 'FB' + Date.now(), name: name || 'Anonim', category: category || 'Lainnya', message, createdAt: new Date().toISOString() };
                feedbacks.unshift(fb);
                if (feedbacks.length > 100) feedbacks.pop();
                saveJSON(FEEDBACK_FILE, feedbacks);
                if (botSocket) {
                    try {
                        const owner = require('./lib/dbManager').getOwner();
                        if (owner.number) {
                            await botSocket.sendMessage(owner.number + '@s.whatsapp.net', {
                                text: `💬 *FEEDBACK BARU!*\n━━━━━━━━━━━━━━\n👤 ${fb.name}\n📂 ${fb.category}\n💬 ${fb.message}\n🕐 ${new Date().toLocaleString('id-ID')}\n🆔 ${fb.id}\n\n_Dari Web Dashboard_`
                            });
                        }
                    } catch (e) {}
                }
                res.json({ success: true, feedback: fb });
            } catch (e) { res.status(500).json({ success: false, error: e.message }); }
        });

        app.get('/api/partners', (req, res) => {
            try { res.json(require('./lib/permission').getPartners()); }
            catch (e) { res.json([]); }
        });

        app.get('/api/channels', (req, res) => {
            try {
                const { getChannels, getGroups } = require('./lib/channelManager');
                res.json({ channels: getChannels(), groups: getGroups() });
            } catch (e) { res.json({ channels: [], groups: [] }); }
        });

        app.get('/api/preview', (req, res) => {
            res.send(`
                <!DOCTYPE html>
                <html><head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Preview - NeoGoforward</title>
                <style>
                    *{margin:0;padding:0;box-sizing:border-box}
                    body{font-family:system-ui;background:#0a0a12;color:#e2e8f0;padding:20px;min-height:100vh}
                    h1{color:#6366f1;margin-bottom:20px}
                    .card{background:#1a1a27;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:15px}
                    .stat{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #1e293b}
                    .stat:last-child{border:none}
                    .online{color:#10b981}.offline{color:#ef4444}
                    a{color:#6366f1}
                </style></head><body>
                <h1>🤖 NeoGoforward Preview</h1>
                <div class="card">
                    <div class="stat"><span>Status</span><span class="${!!botSocket?'online':'offline'}">${!!botSocket?'🟢 Online':'🔴 Offline'}</span></div>
                    <div class="stat"><span>Uptime</span><span>${Math.floor(process.uptime())}s</span></div>
                    <div class="stat"><span>Memory</span><span>${Math.round(process.memoryUsage().heapUsed/1024/1024)} MB</span></div>
                </div>
                <p><a href="/">Buka Dashboard →</a></p>
                </body></html>
            `);
        });

        const server = app.listen(PORT, () => {
            console.log(`🌐 Dashboard: http://localhost:${PORT}`);
            resolve(server);
        });

        server.on('error', reject);
    });
}

module.exports = { createServer };
