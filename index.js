const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    delay,
    Browsers
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

async function requestPairingCode(sock, phoneNumber) {
    console.log(`\n🔄 Meminta pairing code untuk: ${phoneNumber}`);
    
    try {
        // Coba request pairing code dengan retry
        let attempts = 0;
        const maxAttempts = 3;
        let pairingCode = null;
        
        while (attempts < maxAttempts && !pairingCode) {
            try {
                if (attempts > 0) {
                    console.log(`🔄 Mencoba ulang (${attempts + 1}/${maxAttempts})...`);
                    await delay(3000);
                }
                
                pairingCode = await sock.requestPairingCode(phoneNumber);
                
            } catch (err) {
                attempts++;
                console.log(`⚠️ Percobaan ${attempts} gagal: ${err.message}`);
                
                if (attempts >= maxAttempts) {
                    throw new Error(`Gagal mendapatkan pairing code setelah ${maxAttempts}x percobaan: ${err.message}`);
                }
            }
        }
        
        if (pairingCode) {
            // Format kode agar mudah dibaca
            const formattedCode = pairingCode.match(/.{1,4}/g)?.join('-') || pairingCode;
            
            console.log('\n═══════════════════════════════════════');
            console.log('✅ PAIRING CODE BERHASIL DIDAPATKAN');
            console.log('═══════════════════════════════════════');
            console.log(`📱 Nomor: ${phoneNumber}`);
            console.log(`🔑 Kode: ${formattedCode}`);
            console.log('═══════════════════════════════════════');
            console.log('\n📲 LANGKAH SELANJUTNYA:');
            console.log('1. Buka WhatsApp di HP Anda');
            console.log('2. Masuk ke Settings > Linked Devices');
            console.log('3. Pilih "Link with Phone Number"');
            console.log('4. Masukkan kode pairing di atas');
            console.log('5. Tunggu hingga bot terhubung\n');
            
            // Simpan info pairing untuk debugging
            try {
                const pairingDir = path.join('db', 'info');
                if (!fs.existsSync(pairingDir)) {
                    fs.mkdirSync(pairingDir, { recursive: true });
                }
                fs.writeFileSync(
                    path.join(pairingDir, 'last_pairing.json'), 
                    JSON.stringify({
                        phone: phoneNumber,
                        code: formattedCode,
                        timestamp: new Date().toISOString(),
                        success: true
                    }, null, 2)
                );
            } catch (e) {}
            
            return true;
        }
        
        return false;
        
    } catch (err) {
        console.error('\n❌ GAGAL MENDAPATKAN PAIRING CODE');
        console.error('Error:', err.message);
        console.log('\n💡 SOLUSI YANG BISA DICOBA:');
        console.log('1. Pastikan nomor WhatsApp valid dan terdaftar');
        console.log('2. Pastikan nomor bisa menerima kode verifikasi');
        console.log('3. Restart bot dan coba lagi');
        console.log('4. Pastikan koneksi internet stabil');
        console.log('5. Coba gunakan nomor yang berbeda\n');
        
        return false;
    }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(global.botConfig.sessionName);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📱 WhatsApp v${version.join('.')} (Latest: ${isLatest})`);
    
    const sock = makeWASocket({
        version, 
        logger: Pino({ level: 'silent' }), 
        printQRInTerminal: false, // Matikan QR
        auth: { 
            creds: state.creds, 
            keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'fatal' })) 
        },
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false, 
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 60_000,
        mobile: false, // Gunakan desktop mode untuk pairing code
    });
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'connecting') { 
            console.log('🔄 Menghubungkan...'); 
        } else if (connection === 'open') {
            console.log('═══════════════════════════════════════');
            console.log('✅ BOT CONNECTED SUCCESSFULLY!');
            console.log(`🤖 ${global.botConfig.name} v${global.botConfig.version}`);
            console.log(`👤 ${global.botConfig.owner} | 📱 ${global.botConfig.noBot}`);
            console.log(`💬 Prefix: ${global.botConfig.prefix}`);
            console.log('═══════════════════════════════════════');
            
            botSocket = sock;
            
            if (reminderSystem) { 
                try { 
                    reminderSystem.init(sock); 
                    console.log('✅ Reminder started'); 
                } catch (e) {
                    console.error('❌ Reminder error:', e.message);
                } 
            }
            
            if (getFeatureStatus('autopostsw')) { 
                try { 
                    await sock.sendMessage('status@broadcast', { text: getAutoPostSWCaption() }); 
                } catch (e) {
                    console.error('❌ Auto post SW error:', e.message);
                } 
            }
            
            startWebAndTunnel();
            
        } else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const disconnectReason = lastDisconnect?.error?.output?.payload?.disconnect_reason;
            
            console.log('❌ Terputus:', {
                statusCode,
                reason: disconnectReason,
                error: lastDisconnect?.error?.message
            });
            
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && 
                                   statusCode !== 401 &&
                                   disconnectReason !== 'device_removed';
            
            botSocket = null;
            
            if (shouldReconnect) {
                console.log('🔄 Mencoba reconnect dalam 5 detik...');
                await delay(5000);
                connectToWhatsApp();
            } else {
                console.log('🔒 Logged out atau device dihapus. Silakan hapus folder session dan mulai ulang.');
                if (reminderSystem) { 
                    try { 
                        reminderSystem.stop(); 
                    } catch (e) {} 
                }
                process.exit(0);
            }
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (getFeatureStatus('welcome') && action === 'add') {
            for (const p of participants) {
                try {
                    const userName = p.split('@')[0];
                    const displayName = userName.startsWith('62') ? '0' + userName.slice(2) : userName;
                    let gn = 'Grup'; 
                    try { 
                        gn = (await sock.groupMetadata(id)).subject; 
                    } catch (e) {}
                    let pp = null; 
                    try { 
                        pp = await sock.profilePictureUrl(p, 'image'); 
                    } catch (e) {}
                    const c = await createWelcomeCanvas(displayName, gn, pp);
                    await sock.sendMessage(id, { 
                        image: c, 
                        caption: `🎉 *WELCOME!*\n\nHai @${userName}!\nSelamat datang di *${gn}*!`, 
                        mentions: [p] 
                    });
                } catch (e) {
                    console.error('❌ Welcome error:', e.message);
                }
            }
        }
        if (getFeatureStatus('goodbye') && action === 'remove') {
            for (const p of participants) {
                try {
                    const userName = p.split('@')[0];
                    const displayName = userName.startsWith('62') ? '0' + userName.slice(2) : userName;
                    let gn = 'Grup'; 
                    try { 
                        gn = (await sock.groupMetadata(id)).subject; 
                    } catch (e) {}
                    const c = await createGoodbyeCanvas(displayName, gn);
                    await sock.sendMessage(id, { 
                        image: c, 
                        caption: `👋 *GOODBYE!*\n\n@${userName} telah meninggalkan *${gn}*!`, 
                        mentions: [p] 
                    });
                } catch (e) {
                    console.error('❌ Goodbye error:', e.message);
                }
            }
        }
    });
    
    // HANYA PAIRING CODE - Tidak ada QR sama sekali
    if (!sock.authState.creds.registered) {
        console.log('\n═══════════════════════════════════════');
        console.log('📱 PAIRING CODE SETUP');
        console.log('═══════════════════════════════════════\n');
        
        let phoneNumber = await askQuestion('📞 Masukkan nomor WhatsApp (contoh: 0858xxxxxx): ');
        
        // Bersihkan nomor telepon
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        // Validasi dan format nomor
        if (phoneNumber.startsWith('0')) {
            phoneNumber = '62' + phoneNumber.slice(1);
        } else if (phoneNumber.startsWith('62')) {
            // Sudah benar
        } else if (phoneNumber.startsWith('+62')) {
            phoneNumber = phoneNumber.slice(1);
        } else {
            // Anggap sebagai nomor 62
            phoneNumber = '62' + phoneNumber;
        }
        
        // Validasi panjang nomor
        if (phoneNumber.length < 10 || phoneNumber.length > 15) {
            console.error('❌ Nomor tidak valid! Panjang nomor harus 10-15 digit.');
            process.exit(1);
        }
        
        const success = await requestPairingCode(sock, phoneNumber);
        
        if (!success) {
            console.log('\n❌ Gagal mendapatkan pairing code. Bot akan berhenti.');
            console.log('💡 Silakan coba lagi dengan:');
            console.log('   1. Hapus folder "session" jika ada');
            console.log('   2. Jalankan ulang bot');
            console.log('   3. Gunakan nomor yang berbeda\n');
            process.exit(1);
        }
    }
    
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (msg.key.fromMe || m.type !== 'notify') return;
        try {
            const info = {
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
    if (m.imageMessage) return '[Img]'; 
    if (m.videoMessage) return '[Vid]';
    if (m.stickerMessage) return '[Sticker]'; 
    if (m.audioMessage) return '[Aud]';
    if (m.documentMessage) return '[Doc]'; 
    return '[?]';
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

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason?.message || reason);
});

process.on('SIGINT', async () => { 
    console.log('\n👋 Shutting down gracefully...'); 
    if (reminderSystem) { 
        try { 
            reminderSystem.stop(); 
        } catch (e) {} 
    }
    
    if (botSocket) {
        try {
            botSocket.end();
        } catch (e) {}
    }
    
    process.exit(0); 
});

main();
