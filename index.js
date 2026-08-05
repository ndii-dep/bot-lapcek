const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    delay
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const Pino = require('pino');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

global.botConfig = {
    name: 'NeoGoforward',
    version: '1.2.1',
    owner: 'ndiidepzX',
    noOwner: '085800650661',
    noBot: '087717274346',
    prefix: '.',
    sessionName: 'session',
    channelId: '120363416897292688@newsletter',
    groupId: '@g.us',
};

function formatPhoneNumber(number) {
    let cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('62')) {
    } else if (cleaned.length >= 8) {
        cleaned = '62' + cleaned;
    }
    return cleaned;
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
        'db',
        'db/info',
        'db/info/reminder',
        'lib',
        'data',
        'temp',
        'temp/sticker',
        'alight-output',
    ];
    
    folders.forEach(folder => {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
            console.log(`📁 Created folder: ${folder}`);
        }
    });
}

let caseHandler = null;
let reminderSystem = null;

function loadModules() {
    try {
        caseHandler = require('./case');
        console.log('✅ Case handler loaded');
    } catch (err) {
        console.error('❌ Failed to load case.js:', err.message);
        console.log('⚠️  Please make sure case.js exists in the same folder');
        process.exit(1);
    }
    
    try {
        reminderSystem = require('./lib/reminder');
        console.log('✅ Reminder system loaded');
    } catch (err) {
        console.error('❌ Failed to load reminder system:', err.message);
        console.log('⚠️  Please make sure lib/reminder.js exists');
    }
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
            console.log(`🤖 Bot Name : ${global.botConfig.name}`);
            console.log(`📌 Version  : ${global.botConfig.version}`);
            console.log(`👤 Owner    : ${global.botConfig.owner}`);
            console.log(`📞 No Owner : ${global.botConfig.noOwner}`);
            console.log(`📱 No Bot   : ${global.botConfig.noBot}`);
            console.log(`💬 Prefix   : ${global.botConfig.prefix}`);
            console.log('═══════════════════════════════════════');
            
            if (reminderSystem) {
                try {
                    reminderSystem.init(sock);
                    console.log('✅ Reminder system started');
                } catch (e) {
                    console.log('⚠️  Reminder system init failed:', e.message);
                }
            }
            
        } else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log('❌ Koneksi terputus');
            
            if (lastDisconnect?.error) {
                console.log('Error:', lastDisconnect.error.message);
            }
            
            if (shouldReconnect) {
                console.log('🔄 Mencoba reconnect dalam 5 detik...');
                await delay(5000);
                connectToWhatsApp();
            } else {
                console.log('🔒 Logged out. Hapus folder session dan jalankan ulang bot.');
                if (reminderSystem) {
                    try { reminderSystem.stop(); } catch (e) {}
                }
            }
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    if (!sock.authState.creds.registered) {
        console.log('\n📱 BOT BELUM TERDAFTAR');
        console.log('═══════════════════════════════════════');
        console.log('Silakan lakukan pairing code');
        console.log('Masukkan nomor dengan awalan 0');
        console.log('Contoh: 08771987646');
        console.log('═══════════════════════════════════════\n');
        
        const phoneNumber = await askQuestion('📞 Masukkan nomor WhatsApp: ');
        const formattedNumber = formatPhoneNumber(phoneNumber);
        console.log(`🔄 Memproses nomor: ${formattedNumber}`);
        
        try {
            const code = await sock.requestPairingCode(formattedNumber);
            console.log('\n═══════════════════════════════════════');
            console.log('✅ PAIRING CODE BERHASIL DIBUAT');
            console.log('═══════════════════════════════════════');
            console.log(`🔢 Kode: ${code}`);
            console.log('═══════════════════════════════════════');
            console.log('\n📲 CARA MEMASUKKAN KODE:');
            console.log('1. Buka WhatsApp di HP Anda');
            console.log('2. Masuk ke Settings > Linked Devices');
            console.log('3. Pilih "Link with Phone Number"');
            console.log('4. Masukkan kode di atas');
            console.log('5. Tunggu hingga terhubung\n');
        } catch (error) {
            console.error('❌ Gagal membuat pairing code:', error.message);
            console.log('💡 Tips: Pastikan nomor sudah benar dan coba lagi');
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
            
            const chatType = messageInfo.isChannel ? 'Channel' : 
                           messageInfo.isGroup ? 'Group' : 'Private';
            
            const preview = getTextPreview(msg.message);
            console.log(`📩 [${chatType}] ${messageInfo.pushName}: ${preview}`);
            
            if (caseHandler) {
                await caseHandler(sock, messageInfo);
            }
            
        } catch (err) {
            console.error('❌ Error processing message:', err.message);
        }
    });
    
    return sock;
}

function getTextPreview(message) {
    if (!message) return '[Non-text]';
    if (message.conversation) {
        return message.conversation.length > 50 ? 
               message.conversation.substring(0, 50) + '...' : 
               message.conversation;
    }
    if (message.extendedTextMessage?.text) {
        const txt = message.extendedTextMessage.text;
        return txt.length > 50 ? txt.substring(0, 50) + '...' : txt;
    }
    if (message.imageMessage) return '[Image]';
    if (message.videoMessage) return '[Video]';
    if (message.stickerMessage) return '[Sticker]';
    if (message.audioMessage) return '[Audio]';
    if (message.documentMessage) return '[Document]';
    if (message.contactMessage) return '[Contact]';
    if (message.locationMessage) return '[Location]';
    return '[Other]';
}

async function main() {
    console.clear();
    console.log('═══════════════════════════════════════');
    console.log('🤖 WHATSAPP BOT - SCHOOL REMINDER');
    console.log('═══════════════════════════════════════');
    console.log(`📌 Bot     : ${global.botConfig.name}`);
    console.log(`📌 Version : ${global.botConfig.version}`);
    console.log(`📌 Owner   : ${global.botConfig.owner}`);
    console.log(`📌 Mode    : Pairing Code`);
    console.log('═══════════════════════════════════════\n');
    
    createRequiredFolders();
    loadModules();
    
    try {
        await connectToWhatsApp();
    } catch (err) {
        console.error('❌ Fatal error:', err.message);
        process.exit(1);
    }
}

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason?.message || reason);
});

process.on('SIGINT', () => {
    console.log('\n👋 Bot shutting down...');
    if (reminderSystem) {
        try { reminderSystem.stop(); } catch (e) {}
    }
    process.exit(0);
});

main();
