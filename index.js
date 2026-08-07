const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    delay
} = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Pino = require('pino');
const readline = require('readline');
const { 
    getFeatureStatus, 
    createWelcomeCanvas, 
    createGoodbyeCanvas, 
    getAutoPostSWCaption,
} = require('./lib/autoFeatures');

global.botConfig = {
    name: 'NeoGoforward',
    version: '1.2.2',
    owner: 'ndiidepzX',
    noOwner: '085800650661',
    noBot: '087717274346',
    prefix: '.',
    sessionName: 'session',
    channelId: '120363416897292688@newsletter',
    groupId: '@g.us',
    webPort: 3000,
};

let botSocket = null;
let caseHandler = null;
let reminderSystem = null;

const FEEDBACK_FILE = './data/feedback.json';

function loadFeedback() {
    try {
        if (fs.existsSync(FEEDBACK_FILE)) {
            return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
        }
    } catch (e) {}
    return [];
}

function saveFeedback(feedbacks) {
    const dir = path.dirname(FEEDBACK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2));
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

function createRequiredFolders() {
    const folders = [
        'db', 'db/info', 'db/info/reminder',
        'lib', 'data', 'temp', 'temp/sticker',
        'alight-output', 'assets', 'assets/fonts',
        'public',
    ];
    
    folders.forEach(folder => {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
            console.log(`📁 Created folder: ${folder}`);
        }
    });
}

function loadModules() {
    try {
        caseHandler = require('./case');
        console.log('✅ Case handler loaded');
    } catch (err) {
        console.error('❌ Failed to load case.js:', err.message);
        process.exit(1);
    }
    
    try {
        reminderSystem = require('./lib/reminder');
        console.log('✅ Reminder system loaded');
    } catch (err) {
        console.error('❌ Failed to load reminder system:', err.message);
    }
}

function startWebServer() {
    const app = express();
    const PORT = global.botConfig.webPort || 3000;

    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.get('/api/status', (req, res) => {
        res.json({
            connected: !!botSocket,
            uptime: process.uptime(),
            memory: process.memoryUsage().heapUsed / 1024 / 1024,
            botName: global.botConfig.name,
            version: global.botConfig.version,
            owner: global.botConfig.owner,
            prefix: global.botConfig.prefix,
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
    });

    app.get('/api/pr', (req, res) => {
        try {
            const { getPRs } = require('./lib/prTracker');
            res.json(getPRs());
        } catch (e) {
            res.json([]);
        }
    });

    app.post('/api/pr/add', (req, res) => {
        try {
            const { addPR, formatPRDetail } = require('./lib/prTracker');
            const { subject, description, deadline } = req.body;
            const pr = addPR({ subject, description, deadline, addedBy: 'Web Dashboard' });
            
            const { getAllTargets } = require('./lib/channelManager');
            const targets = getAllTargets();
            const prDetail = formatPRDetail(pr);
            
            for (const ch of targets.channels) {
                try { botSocket.sendMessage(ch.id, { text: `📢 PR BARU!\n\n${prDetail}` }); } catch (e) {}
            }
            for (const gr of targets.groups) {
                try { botSocket.sendMessage(gr.id, { text: `📢 PR BARU!\n\n${prDetail}` }); } catch (e) {}
            }
            
            res.json({ success: true, pr });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    app.delete('/api/pr/:id', (req, res) => {
        try {
            const { deletePR } = require('./lib/prTracker');
            deletePR(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    app.get('/api/schedule', (req, res) => {
        try {
            const schoolData = require('./lib/schoolData');
            res.json(schoolData.getFullSchedule());
        } catch (e) {
            res.json({});
        }
    });

    app.get('/api/piket', (req, res) => {
        try {
            const schoolData = require('./lib/schoolData');
            res.json(schoolData.getFullPiket());
        } catch (e) {
            res.json({});
        }
    });

    app.post('/api/send-message', async (req, res) => {
        const { number, message } = req.body;
        if (!botSocket) return res.status(500).json({ success: false, error: 'Bot tidak terhubung' });
        if (!number || !message) return res.status(400).json({ success: false, error: 'Nomor dan pesan wajib diisi' });
        
        try {
            let jid = number.replace(/[^0-9]/g, '');
            if (jid.startsWith('0')) jid = '62' + jid.slice(1);
            if (!jid.startsWith('62')) jid = '62' + jid;
            jid += '@s.whatsapp.net';
            
            await botSocket.sendMessage(jid, { text: message });
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    app.get('/api/feedback', (req, res) => {
        res.json(loadFeedback());
    });

    app.post('/api/feedback', async (req, res) => {
        try {
            const { name, category, message } = req.body;
            if (!message) return res.status(400).json({ success: false, error: 'Pesan wajib diisi' });
            
            const feedbacks = loadFeedback();
            const feedback = {
                id: 'FB' + Date.now(),
                name: name || 'Anonim',
                category: category || 'Lainnya',
                message,
                createdAt: new Date().toISOString()
            };
            
            feedbacks.unshift(feedback);
            if (feedbacks.length > 100) feedbacks.pop();
            saveFeedback(feedbacks);
            
            if (botSocket) {
                try {
                    const { getOwner } = require('./lib/dbManager');
                    const owner = getOwner();
                    if (owner.number) {
                        const ownerJid = owner.number + '@s.whatsapp.net';
                        await botSocket.sendMessage(ownerJid, {
                            text: `💬 *FEEDBACK BARU!*\n━━━━━━━━━━━━━━\n\n👤 ${feedback.name}\n📂 ${feedback.category}\n💬 ${feedback.message}\n🕐 ${new Date().toLocaleString('id-ID')}\n🆔 ${feedback.id}\n\n_Dari Web Dashboard_`
                        });
                    }
                } catch (e) {}
            }
            
            res.json({ success: true, feedback });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    app.get('/api/partners', (req, res) => {
        try {
            const { getPartners } = require('./lib/permission');
            res.json(getPartners());
        } catch (e) {
            res.json([]);
        }
    });

    app.get('/api/channels', (req, res) => {
        try {
            const { getChannels, getGroups } = require('./lib/channelManager');
            res.json({ channels: getChannels(), groups: getGroups() });
        } catch (e) {
            res.json({ channels: [], groups: [] });
        }
    });

    app.listen(PORT, () => {
        console.log('═══════════════════════════════════════');
        console.log(`🌐 Dashboard: http://localhost:${PORT}`);
        console.log('═══════════════════════════════════════');
    });
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(global.botConfig.sessionName);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(`📱 WhatsApp Version: ${version.join('.')} (Latest: ${isLatest})`);
    
    const sock = makeWASocket({
        version,
        logger: Pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'fatal' })),
        },
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
    });
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'connecting') {
            console.log('🔄 Menghubungkan ke WhatsApp...');
        } else if (connection === 'open') {
            console.log('═══════════════════════════════════════');
            console.log('✅ BOT CONNECTED SUCCESSFULLY!');
            console.log('═══════════════════════════════════════');
            console.log(`🤖 ${global.botConfig.name} v${global.botConfig.version}`);
            console.log(`👤 ${global.botConfig.owner}`);
            console.log(`📱 ${global.botConfig.noBot}`);
            console.log(`💬 Prefix: ${global.botConfig.prefix}`);
            console.log('═══════════════════════════════════════');
            
            botSocket = sock;
            
            if (reminderSystem) {
                try { reminderSystem.init(sock); console.log('✅ Reminder started'); } catch (e) {}
            }
            
            if (getFeatureStatus('autopostsw')) {
                try { await sock.sendMessage('status@broadcast', { text: getAutoPostSWCaption() }); } catch (e) {}
            }
            
        } else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log('❌ Koneksi terputus');
            if (lastDisconnect?.error) console.log('Error:', lastDisconnect.error.message);
            
            botSocket = null;
            
            if (shouldReconnect) {
                console.log('🔄 Mencoba reconnect dalam 5 detik...');
                await delay(5000);
                connectToWhatsApp();
            } else {
                console.log('🔒 Logged out.');
                if (reminderSystem) { try { reminderSystem.stop(); } catch (e) {} }
            }
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        
        if (getFeatureStatus('welcome') && action === 'add') {
            for (const participant of participants) {
                try {
                    const userName = participant.split('@')[0];
                    const displayName = userName.startsWith('62') ? '0' + userName.slice(2) : userName;
                    let groupName = 'Grup';
                    try { groupName = (await sock.groupMetadata(id)).subject; } catch (e) {}
                    let profilePic = null;
                    try { profilePic = await sock.profilePictureUrl(participant, 'image'); } catch (e) {}
                    const canvas = await createWelcomeCanvas(displayName, groupName, profilePic);
                    await sock.sendMessage(id, { image: canvas, caption: `🎉 *WELCOME!*\n\nHai @${userName}!\nSelamat datang di *${groupName}*!\n\nJangan lupa baca rules grup ya!`, mentions: [participant] });
                } catch (e) {}
            }
        }
        
        if (getFeatureStatus('goodbye') && action === 'remove') {
            for (const participant of participants) {
                try {
                    const userName = participant.split('@')[0];
                    const displayName = userName.startsWith('62') ? '0' + userName.slice(2) : userName;
                    let groupName = 'Grup';
                    try { groupName = (await sock.groupMetadata(id)).subject; } catch (e) {}
                    const canvas = await createGoodbyeCanvas(displayName, groupName);
                    await sock.sendMessage(id, { image: canvas, caption: `👋 *GOODBYE!*\n\n@${userName} telah meninggalkan *${groupName}*.\n\nSemoga sukses selalu! ✨`, mentions: [participant] });
                } catch (e) {}
            }
        }
    });
    
    if (!sock.authState.creds.registered) {
        console.log('\n📱 BOT BELUM TERDAFTAR');
        console.log('═══════════════════════════════════════');
        const phoneNumber = await askQuestion('📞 Masukkan nomor WhatsApp: ');
        console.log(`🔄 Memproses: ${phoneNumber}`);
        
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log('═══════════════════════════════════════');
            console.log('✅ PAIRING CODE BERHASIL DIBUAT');
            console.log(`🔢 Kode: ${code?.match(/.{1,4}/g)?.join('-') || code}`);
            console.log('═══════════════════════════════════════');
            console.log('\n📲 Masukkan kode di HP > Settings > Linked Devices > Link with Phone Number\n');
        } catch (error) {
            console.error('❌ Gagal:', error.message);
            process.exit(1);
        }
    }
    
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (msg.key.fromMe) return;
        if (m.type !== 'notify') return;
        
        try {
            const messageInfo = {
                id: msg.key.id,
                from: msg.key.remoteJid,
                pushName: msg.pushName || 'Unknown',
                isGroup: msg.key.remoteJid.endsWith('@g.us'),
                isChannel: msg.key.remoteJid.endsWith('@newsletter'),
                message: msg.message,
                key: msg.key,
                timestamp: msg.messageTimestamp,
                participant: msg.key.participant,
            };
            
            const chatType = messageInfo.isChannel ? 'Channel' : messageInfo.isGroup ? 'Group' : 'Private';
            console.log(`📩 [${chatType}] ${messageInfo.pushName}: ${getTextPreview(msg.message)}`);
            
            if (getFeatureStatus('autotyping')) await sock.sendPresenceUpdate('composing', messageInfo.from);
            if (getFeatureStatus('autorecord')) await sock.sendPresenceUpdate('recording', messageInfo.from);
            if (getFeatureStatus('autoread')) await sock.readMessages([msg.key]);
            if (caseHandler) await caseHandler(sock, messageInfo);
        } catch (err) {
            console.error('❌ Error:', err.message);
        }
    });
    
    return sock;
}

function getTextPreview(message) {
    if (!message) return '[Non-text]';
    if (message.conversation) return message.conversation.length > 50 ? message.conversation.substring(0, 50) + '...' : message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text.length > 50 ? message.extendedTextMessage.text.substring(0, 50) + '...' : message.extendedTextMessage.text;
    if (message.imageMessage) return '[Image]';
    if (message.videoMessage) return '[Video]';
    if (message.stickerMessage) return '[Sticker]';
    if (message.audioMessage) return '[Audio]';
    if (message.documentMessage) return '[Document]';
    return '[Other]';
}

async function main() {
    console.clear();
    console.log('═══════════════════════════════════════');
    console.log('🤖 WHATSAPP BOT + WEB DASHBOARD');
    console.log('═══════════════════════════════════════');
    console.log(`📌 Bot     : ${global.botConfig.name}`);
    console.log(`📌 Version : ${global.botConfig.version}`);
    console.log(`📌 Owner   : ${global.botConfig.owner}`);
    console.log('═══════════════════════════════════════\n');
    
    createRequiredFolders();
    loadModules();
    startWebServer();
    
    try {
        await connectToWhatsApp();
    } catch (err) {
        console.error('❌ Fatal error:', err.message);
        process.exit(1);
    }
}

process.on('uncaughtException', (err) => console.error('❌', err.message));
process.on('unhandledRejection', (reason) => console.error('❌', reason?.message || reason));
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    if (reminderSystem) { try { reminderSystem.stop(); } catch (e) {} }
    process.exit(0);
});

main();
