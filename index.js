const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    delay
} = require('@whiskeysockets/baileys');
const Pino = require('pino');
const fs = require('fs');
const path = require('path');
const { 
    getFeatureStatus, 
    createWelcomeCanvas, 
    createGoodbyeCanvas, 
    getAutoPostSWCaption,
} = require('./lib/autoFeatures');

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

function createRequiredFolders() {
    const folders = [
        'db', 'db/info', 'db/info/reminder',
        'lib', 'data', 'temp', 'temp/sticker',
        'alight-output', 'assets', 'assets/fonts',
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
        process.exit(1);
    }
    
    try {
        reminderSystem = require('./lib/reminder');
        console.log('✅ Reminder system loaded');
    } catch (err) {
        console.error('❌ Failed to load reminder system:', err.message);
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
                    console.log('⚠️  Reminder system init failed');
                }
            }
            
            if (getFeatureStatus('autopostsw')) {
                try {
                    const caption = getAutoPostSWCaption();
                    await sock.sendMessage('status@broadcast', { text: caption });
                    console.log('✅ Auto Post SW sent');
                } catch (e) {
                    console.log('⚠️  Auto Post SW failed');
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
    
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        
        if (getFeatureStatus('welcome') && action === 'add') {
            for (const participant of participants) {
                try {
                    const userName = participant.split('@')[0];
                    const displayName = userName.startsWith('62') ? '0' + userName.slice(2) : userName;
                    
                    let groupName = 'Grup';
                    try {
                        const meta = await sock.groupMetadata(id);
                        groupName = meta.subject;
                    } catch (e) {}
                    
                    let profilePic = null;
                    try {
                        const pp = await sock.profilePictureUrl(participant, 'image');
                        profilePic = pp;
                    } catch (e) {}
                    
                    const canvasBuffer = await createWelcomeCanvas(displayName, groupName, profilePic);
                    
                    await sock.sendMessage(id, {
                        image: canvasBuffer,
                        caption: `🎉 *WELCOME!*\n\nHai @${participant.split('@')[0]}!\nSelamat datang di *${groupName}*!\n\nJangan lupa baca rules grup ya!`,
                        mentions: [participant]
                    });
                    
                } catch (e) {
                    console.error('Welcome error:', e.message);
                }
            }
        }
        
        if (getFeatureStatus('goodbye') && action === 'remove') {
            for (const participant of participants) {
                try {
                    const userName = participant.split('@')[0];
                    const displayName = userName.startsWith('62') ? '0' + userName.slice(2) : userName;
                    
                    let groupName = 'Grup';
                    try {
                        const meta = await sock.groupMetadata(id);
                        groupName = meta.subject;
                    } catch (e) {}
                    
                    const canvasBuffer = await createGoodbyeCanvas(displayName, groupName);
                    
                    await sock.sendMessage(id, {
                        image: canvasBuffer,
                        caption: `👋 *GOODBYE!*\n\n@${userName} telah meninggalkan *${groupName}*.\n\nSemoga sukses selalu! ✨`,
                        mentions: [participant]
                    });
                    
                } catch (e) {
                    console.error('Goodbye error:', e.message);
                }
            }
        }
    });
    
    if (!sock.authState.creds.registered) {
        const phoneNumber = global.botConfig.noBot || global.botConfig.noOwner;
        const cleaned = phoneNumber.replace(/\D/g, '');
        const formattedNumber = cleaned.startsWith('0') ? '62' + cleaned.slice(1) : cleaned.startsWith('62') ? cleaned : '62' + cleaned;
        
        console.log('\n📱 BOT BELUM TERDAFTAR');
        console.log('═══════════════════════════════════════');
        console.log(`🔄 Menggunakan nomor: ${phoneNumber}`);
        console.log(`📞 Format: ${formattedNumber}`);
        console.log('═══════════════════════════════════════\n');
        
        try {
            const code = await sock.requestPairingCode(formattedNumber);
            console.log('═══════════════════════════════════════');
            console.log('✅ PAIRING CODE BERHASIL DIBUAT');
            console.log('═══════════════════════════════════════');
            console.log(`🔢 Kode: ${code?.match(/.{1,4}/g)?.join('-') || code}`);
            console.log('═══════════════════════════════════════');
            console.log('\n📲 CARA MEMASUKKAN KODE:');
            console.log('1. Buka WhatsApp di HP Anda');
            console.log('2. Masuk ke Settings > Linked Devices');
            console.log('3. Pilih "Link with Phone Number"');
            console.log('4. Masukkan kode di atas');
            console.log('5. Tunggu hingga terhubung\n');
        } catch (error) {
            console.error('❌ Gagal membuat pairing code:', error.message);
            console.log('💡 Coba cek nomor di noBot atau noOwner');
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
            
            if (getFeatureStatus('autotyping')) {
                await sock.sendPresenceUpdate('composing', messageInfo.from);
            }
            
            if (getFeatureStatus('autorecord')) {
                await sock.sendPresenceUpdate('recording', messageInfo.from);
            }
            
            if (getFeatureStatus('autoread')) {
                await sock.readMessages([msg.key]);
            }
            
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
    console.log(`📌 Mode    : Pairing Code (Auto)`);
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
