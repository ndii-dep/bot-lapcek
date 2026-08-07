const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    delay
} = require('@whiskeysockets/baileys');
const Pino = require('pino');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { 
    getFeatureStatus, 
    createWelcomeCanvas, 
    createGoodbyeCanvas, 
    getAutoPostSWCaption,
} = require('./lib/autoFeatures');
const { createServer } = require('./server');
const { startTunnel, getPublicUrl, getWebStatus, restartWebServer } = require('./lib/webManager');

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
let webServerInstance = null;

function askQuestion(query) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

function createRequiredFolders() {
    const folders = ['db', 'db/info', 'db/info/reminder', 'lib', 'data', 'temp', 'temp/sticker', 'alight-output', 'assets', 'assets/fonts', 'public'];
    folders.forEach(folder => { if (!fs.existsSync(folder)) { fs.mkdirSync(folder, { recursive: true }); console.log(`📁 ${folder}`); } });
}

function loadModules() {
    try { caseHandler = require('./case'); console.log('✅ Case handler loaded'); } catch (err) { console.error('❌ case.js:', err.message); process.exit(1); }
    try { reminderSystem = require('./lib/reminder'); console.log('✅ Reminder system loaded'); } catch (err) { console.error('❌ reminder:', err.message); }
}

async function startWebAndTunnel() {
    try {
        webServerInstance = await createServer(botSocket);
        console.log('🌐 Web server started');
        
        const publicUrl = await startTunnel(global.botConfig.webPort || 3000);
        console.log(`🌍 Public: ${publicUrl}`);
        
        try {
            const { getOwner } = require('./lib/dbManager');
            const owner = getOwner();
            if (owner.number && botSocket) {
                await botSocket.sendMessage(owner.number + '@s.whatsapp.net', {
                    text: `🌐 *DASHBOARD ONLINE*\n━━━━━━━━━━━━━━━━━━━━━━\n\n🔗 Local: http://localhost:${global.botConfig.webPort || 3000}\n🌍 Public: ${publicUrl}\n\n💡 .web untuk control dashboard.`
                });
            }
        } catch (e) {}
        
        return publicUrl;
    } catch (e) {
        console.log('⚠️ Web start failed:', e.message);
        return null;
    }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(global.botConfig.sessionName);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📱 WhatsApp v${version.join('.')} (Latest: ${isLatest})`);
    
    const sock = makeWASocket({
        version, logger: Pino({ level: 'silent' }), printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'fatal' })) },
        browser: ['Ubuntu', 'Chrome', '20.0.04'], syncFullHistory: false, generateHighQualityLinkPreview: true,
    });
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'connecting') { console.log('🔄 Connecting...'); }
        else if (connection === 'open') {
            console.log('═══════════════════════════════════════');
            console.log('✅ BOT CONNECTED SUCCESSFULLY!');
            console.log(`🤖 ${global.botConfig.name} v${global.botConfig.version}`);
            console.log(`👤 ${global.botConfig.owner} | 📱 ${global.botConfig.noBot}`);
            console.log(`💬 Prefix: ${global.botConfig.prefix}`);
            console.log('═══════════════════════════════════════');
            
            botSocket = sock;
            if (reminderSystem) { try { reminderSystem.init(sock); console.log('✅ Reminder started'); } catch (e) {} }
            if (getFeatureStatus('autopostsw')) { try { await sock.sendMessage('status@broadcast', { text: getAutoPostSWCaption() }); } catch (e) {} }
            
            startWebAndTunnel();
        } else if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const reconnect = code !== DisconnectReason.loggedOut;
            console.log('❌ Disconnected');
            if (lastDisconnect?.error) console.log('Error:', lastDisconnect.error.message);
            botSocket = null;
            if (reconnect) { console.log('🔄 Reconnect in 5s...'); await delay(5000); connectToWhatsApp(); }
            else { console.log('🔒 Logged out.'); if (reminderSystem) { try { reminderSystem.stop(); } catch (e) {} } }
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (getFeatureStatus('welcome') && action === 'add') {
            for (const p of participants) {
                try {
                    const userName = p.split('@')[0], displayName = userName.startsWith('62') ? '0' + userName.slice(2) : userName;
                    let gn = 'Grup'; try { gn = (await sock.groupMetadata(id)).subject; } catch (e) {}
                    let pp = null; try { pp = await sock.profilePictureUrl(p, 'image'); } catch (e) {}
                    const c = await createWelcomeCanvas(displayName, gn, pp);
                    await sock.sendMessage(id, { image: c, caption: `🎉 *WELCOME!*\n\nHai @${userName}!\nSelamat datang di *${gn}*!`, mentions: [p] });
                } catch (e) {}
            }
        }
        if (getFeatureStatus('goodbye') && action === 'remove') {
            for (const p of participants) {
                try {
                    const userName = p.split('@')[0], displayName = userName.startsWith('62') ? '0' + userName.slice(2) : userName;
                    let gn = 'Grup'; try { gn = (await sock.groupMetadata(id)).subject; } catch (e) {}
                    const c = await createGoodbyeCanvas(displayName, gn);
                    await sock.sendMessage(id, { image: c, caption: `👋 *GOODBYE!*\n\n@${userName} telah meninggalkan *${gn}*!`, mentions: [p] });
                } catch (e) {}
            }
        }
    });
    
    if (!sock.authState.creds.registered) {
        console.log('\n📱 BOT BELUM TERDAFTAR\n');
        const phone = await askQuestion('📞 Masukkan nomor WhatsApp: ');
        console.log(`🔄 Memproses: ${phone}`);
        try {
            const code = await sock.requestPairingCode(phone);
            console.log(`\n✅ PAIRING CODE: ${code?.match(/.{1,4}/g)?.join('-') || code}`);
            console.log('📲 Masukkan di HP > Settings > Linked Devices > Link with Phone Number\n');
        } catch (err) { console.error('❌ Gagal:', err.message); process.exit(1); }
    }
    
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (msg.key.fromMe || m.type !== 'notify') return;
        try {
            const info = {
                id: msg.key.id, from: msg.key.remoteJid, pushName: msg.pushName || 'Unknown',
                isGroup: msg.key.remoteJid.endsWith('@g.us'), isChannel: msg.key.remoteJid.endsWith('@newsletter'),
                message: msg.message, key: msg.key, timestamp: msg.messageTimestamp, participant: msg.key.participant,
            };
            const ct = info.isChannel ? 'Ch' : info.isGroup ? 'Gr' : 'Pv';
            console.log(`📩 [${ct}] ${info.pushName}: ${getTextPreview(msg.message)}`);
            if (getFeatureStatus('autotyping')) await sock.sendPresenceUpdate('composing', info.from);
            if (getFeatureStatus('autorecord')) await sock.sendPresenceUpdate('recording', info.from);
            if (getFeatureStatus('autoread')) await sock.readMessages([msg.key]);
            if (caseHandler) await caseHandler(sock, info);
        } catch (err) { console.error('❌', err.message); }
    });
    
    return sock;
}

function getTextPreview(m) {
    if (!m) return '[?]';
    if (m.conversation) return m.conversation.slice(0, 50);
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text.slice(0, 50);
    if (m.imageMessage) return '[Img]'; if (m.videoMessage) return '[Vid]';
    if (m.stickerMessage) return '[Sticker]'; if (m.audioMessage) return '[Aud]';
    if (m.documentMessage) return '[Doc]'; return '[?]';
}

async function main() {
    console.clear();
    console.log('═══════════════════════════════════════');
    console.log('🤖 NEOGOFORWARD BOT + WEB DASHBOARD');
    console.log('═══════════════════════════════════════');
    console.log(`📌 ${global.botConfig.name} v${global.botConfig.version}`);
    console.log(`👤 ${global.botConfig.owner}`);
    console.log('═══════════════════════════════════════\n');
    
    createRequiredFolders();
    loadModules();
    
    try { await connectToWhatsApp(); }
    catch (err) { console.error('❌', err.message); process.exit(1); }
}

process.on('uncaughtException', (err) => console.error('❌', err.message));
process.on('unhandledRejection', (r) => console.error('❌', r?.message || r));
process.on('SIGINT', () => { console.log('\n👋 Shutting down...'); if (reminderSystem) { try { reminderSystem.stop(); } catch (e) {} } process.exit(0); });

main();
