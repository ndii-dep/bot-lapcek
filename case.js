// case.js
// Command handler untuk bot

const schoolData = require('./lib/schoolData');
const reminderSystem = require('./lib/reminder');
const { alightMotion } = require('./lib/alightMotion');
const { addSongFess, getSongFessStats, getAllSongFess } = require('./lib/songFess');
const { addConfess, getConfessQueue, removeConfess } = require('./lib/confess');
const { createSticker, checkFfmpeg, CONFIG: STICKER_CONFIG } = require('./lib/sticker');
const { formatDuration } = require('./lib/stickerUtils');

module.exports = async function(sock, messageInfo) {
    const { from, pushName, isGroup, isChannel, message, key } = messageInfo;
    
    // ============================================
    // EKSTRAK TEKS DARI PESAN
    // ============================================
    let text = '';
    if (message?.conversation) {
        text = message.conversation;
    } else if (message?.extendedTextMessage?.text) {
        text = message.extendedTextMessage.text;
    } else if (message?.imageMessage?.caption) {
        text = message.imageMessage.caption;
    } else if (message?.videoMessage?.caption) {
        text = message.videoMessage.caption;
    }
    
    // Skip jika tidak ada teks
    if (!text) return;
    
    // Skip jika tidak diawali prefix
    const prefix = global.botConfig.prefix;
    if (!text.startsWith(prefix)) return;
    
    // ============================================
    // PARSE COMMAND
    // ============================================
    const args = text.slice(prefix.length).trim().split(/ +/);
    const cmd = args[0]?.toLowerCase() || '';
    const commandArgs = args.slice(1);
    
    // Log command
    const chatType = isChannel ? 'Channel' : isGroup ? 'Group' : 'Private';
    console.log(`⚡ [${chatType}] ${pushName}: ${cmd} ${commandArgs.join(' ')}`);
    
    // ============================================
    // COMMAND HANDLERS
    // ============================================
    try {
        switch(cmd) {
            
            case 'sticker':
case 'stiker':
case 's':
    await cmdSticker(sock, from, commandArgs, pushName, messageInfo);
    break;
            case 'info':
            case 'menu':
                await cmdInfo(sock, from);
                break;
                
            case 'owner':
                await cmdOwner(sock, from);
                break;
                
            case 'walas':
                await cmdWalas(sock, from);
                break;
                
            // SCHEDULE COMMANDS
            case 'today':
                await cmdToday(sock, from);
                break;
                
            case 'tomorrow':
            case 'besok':
                await cmdTomorrow(sock, from);
                break;
                
            case 'mapel':
                await cmdMapel(sock, from, commandArgs);
                break;
                
            case 'piket':
                await cmdPiket(sock, from, commandArgs);
                break;
                
            case 'jadwal':
                await cmdJadwal(sock, from);
                break;
                
            // REMINDER COMMANDS
            case 'sendreminder':
            case 'kirimreminder':
                await cmdSendReminder(sock, from, pushName);
                break;
                
            case 'reminder':
                await cmdReminderMenu(sock, from);
                break;
                
            // ALIGHT MOTION COMMANDS
            case 'alight':
            case 'alightmotion':
            case 'am':
                await cmdAlightMotion(sock, from, commandArgs, pushName);
                break;
                
            // SONGFESS COMMANDS
            case 'songfess':
            case 'sf':
                await cmdSongFess(sock, from, commandArgs, pushName, messageInfo);
                break;
                
            // MENFESS / CONFESS COMMANDS
            case 'menfess':
            case 'confess':
            case 'confes':
            case 'menfes':
                await cmdConfess(sock, from, commandArgs, pushName, messageInfo);
                break;
                
            // UTILITY COMMANDS
            case 'getid':
                await cmdGetId(sock, from, messageInfo);
                break;
                
            case 'ping':
                await sock.sendMessage(from, { text: '🏓 *Pong!*\n\nBot is running normally.\n' +
                    `⏰ ${new Date().toLocaleTimeString('id-ID')}` });
                break;
                
            // UNKNOWN COMMAND
            default:
                if (cmd) {
                    await sock.sendMessage(from, { 
                        text: `❌ *Unknown Command*\n\n` +
                              `Command *${prefix}${cmd}* tidak ditemukan.\n\n` +
                              `Ketik *${prefix}menu* untuk melihat daftar command.`
                    });
                }
                break;
        }
    } catch (err) {
        console.error(`❌ Error executing ${cmd}:`, err.message);
        try {
            await sock.sendMessage(from, { 
                text: '❌ Maaf, terjadi kesalahan saat memproses command.' 
            });
        } catch (e) {
            // Ignore send error
        }
    }
};

// ============================================
// COMMAND FUNCTIONS
// ============================================






// ============================================
// STICKER MAKER COMMAND
// ============================================

async function cmdSticker(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    // Cek ffmpeg
    const hasFfmpeg = await checkFfmpeg();
    if (!hasFfmpeg) {
        await sock.sendMessage(from, {
            text: '❌ *FFmpeg tidak terinstall!*\n\n' +
                  'Sticker maker membutuhkan FFmpeg.\n' +
                  'Silakan install FFmpeg terlebih dahulu.\n\n' +
                  '💡 *Cara install:*\n' +
                  '• Linux: apt install ffmpeg\n' +
                  '• Termux: pkg install ffmpeg\n' +
                  '• Windows: Download dari ffmpeg.org'
        });
        return;
    }
    
    // Parse arguments
    let stickerType = 'full';
    let packName = STICKER_CONFIG.PACK;
    let authorName = STICKER_CONFIG.AUTHOR;
    
    args.forEach(arg => {
        const lower = arg.toLowerCase();
        if (['full', 'circle', 'rounded'].includes(lower)) {
            stickerType = lower;
        } else if (lower.startsWith('pack=')) {
            packName = arg.replace('pack=', '').replace(/"/g, '');
        } else if (lower.startsWith('author=')) {
            authorName = arg.replace('author=', '').replace(/"/g, '');
        }
    });
    
    // Jika user minta help
    if (args.includes('help') || args.includes('?')) {
        await showStickerHelp(sock, from, prefix);
        return;
    }
    
    // Cek apakah ada media (gambar/video)
    const message = messageInfo.message;
    let hasMedia = false;
    let mediaType = '';
    let mediaDuration = 0;
    
    // Cek direct message
    if (message.imageMessage) {
        hasMedia = true;
        mediaType = 'image';
    } else if (message.videoMessage) {
        hasMedia = true;
        mediaType = 'video';
        mediaDuration = message.videoMessage.seconds || 0;
    }
    
    // Cek quoted message (reply)
    if (!hasMedia && message.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = message.extendedTextMessage.contextInfo.quotedMessage;
        if (quoted.imageMessage) {
            hasMedia = true;
            mediaType = 'image';
        } else if (quoted.videoMessage) {
            hasMedia = true;
            mediaType = 'video';
            mediaDuration = quoted.videoMessage.seconds || 0;
        }
    }
    
    if (!hasMedia) {
        // Tampilkan menu sticker maker
        await showStickerMenu(sock, from, prefix);
        return;
    }
    
    // Cek durasi video
    if (mediaType === 'video' && mediaDuration > STICKER_CONFIG.MAX_VIDEO_DURATION) {
        await sock.sendMessage(from, {
            text: `❌ *Video terlalu panjang!*\n\n` +
                  `⏱️ Durasi: ${formatDuration(mediaDuration)}\n` +
                  `📏 Maksimal: ${STICKER_CONFIG.MAX_VIDEO_DURATION} detik\n\n` +
                  `💡 Tips: Potong video dulu atau kirim video yang lebih pendek.`
        });
        return;
    }
    
    // Kirim status
    await sock.sendMessage(from, { 
        text: '🔄 *Membuat sticker...*\n\n' +
              `📸 Tipe: ${mediaType === 'image' ? 'Gambar' : 'Video'}\n` +
              `🎨 Style: ${stickerType}\n` +
              (mediaType === 'video' ? `⏱️ Durasi: ${formatDuration(mediaDuration)}\n` : '') +
              '\n⏳ Mohon tunggu sebentar...'
    });
    
    try {
        // Create sticker
        const result = await createSticker(sock, messageInfo, {
            type: stickerType,
            pack: packName,
            author: authorName
        });
        
        // Kirim sticker
        const stickerMsg = {
            sticker: result.sticker
        };
        
        await sock.sendMessage(from, stickerMsg);
        
        // Kirim info tambahan
        setTimeout(async () => {
            const info = `✅ *Sticker Berhasil!*\n\n` +
                        `📸 Tipe: ${result.type === 'animated' ? '🎬 Animasi' : '🖼️ Statis'}\n` +
                        `🎨 Style: ${stickerType === 'full' ? '📱 Full' : stickerType === 'circle' ? '⭕ Circle' : '🔲 Rounded'}\n` +
                        `📦 Pack: ${packName}\n` +
                        `✍️ Author: ${authorName}\n\n` +
                        `💡 *Tips:*\n` +
                        `• ${prefix}s circle - Sticker bulat\n` +
                        `• ${prefix}s rounded - Sticker rounded\n` +
                        `• ${prefix}s pack="Nama" - Custom pack`;
            
            await sock.sendMessage(from, { text: info });
        }, 500);
        
    } catch (err) {
        console.error('Sticker Error:', err.message);
        await sock.sendMessage(from, {
            text: `❌ *Gagal membuat sticker!*\n\n` +
                  `Error: ${err.message}\n\n` +
                  `💡 *Tips:*\n` +
                  `• Pastikan gambar/video tidak rusak\n` +
                  `• Video maksimal ${STICKER_CONFIG.MAX_VIDEO_DURATION} detik\n` +
                  `• Ukuran file maksimal 10 MB`
        });
    }
}

/**
 * Tampilkan menu sticker maker
 */
async function showStickerMenu(sock, from, prefix) {
    const message = {
        image: { url: 'https://files.catbox.moe/sticker-banner.jpg' },
        caption: `╔══════════════════════════╗\n` +
                 `║   🎨 STICKER MAKER     ║\n` +
                 `║   Foto & Video (15s)   ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `📌 *Cara Membuat Sticker:*\n\n` +
                 `*1️⃣ Kirim/Reply Gambar:*\n` +
                 `${prefix}s\n` +
                 `${prefix}s circle\n` +
                 `${prefix}s rounded\n\n` +
                 `*2️⃣ Kirim/Reply Video:*\n` +
                 `${prefix}s\n` +
                 `${prefix}s circle\n\n` +
                 `*3️⃣ Custom Pack:*\n` +
                 `${prefix}s pack="Namaku" author="Bot"\n\n` +
                 `🎨 *Style Tersedia:*\n` +
                 `• full - Sticker penuh\n` +
                 `• circle - Sticker bulat ⭕\n` +
                 `• rounded - Ujung tumpul 🔲\n\n` +
                 `📏 *Batasan:*\n` +
                 `• Gambar: Tidak terbatas\n` +
                 `• Video: Maksimal 15 detik\n` +
                 `• File: Maksimal 10 MB\n\n` +
                 `💡 *Contoh:*\n` +
                 `Reply gambar → ${prefix}s circle\n` +
                 `Kirim video → ${prefix}s rounded\n\n` +
                 `🔍 ${prefix}s help - Bantuan lengkap`,
        footer: '🎨 Sticker Maker v1.0',
        buttons: [
            { 
                buttonId: `${prefix}s full`, 
                buttonText: { displayText: '📱 Full Sticker' }, 
                type: 1 
            },
            { 
                buttonId: `${prefix}s circle`, 
                buttonText: { displayText: '⭕ Circle' }, 
                type: 1 
            },
            { 
                buttonId: `${prefix}s help`, 
                buttonText: { displayText: '📖 Bantuan' }, 
                type: 1 
            }
        ],
        viewOnce: false
    };

    try {
        await sock.sendMessage(from, message);
    } catch (e) {
        await sock.sendMessage(from, {
            text: `🎨 *STICKER MAKER*\n\n` +
                  `📌 Cara pakai:\n` +
                  `1. Kirim/reply gambar atau video (max 15s)\n` +
                  `2. Ketik ${prefix}s\n\n` +
                  `Style: ${prefix}s full | circle | rounded\n` +
                  `Help: ${prefix}s help`
        });
    }
}

/**
 * Tampilkan bantuan lengkap
 */
async function showStickerHelp(sock, from, prefix) {
    const text = `╔══════════════════════════╗\n` +
                 `║  📖 BANTUAN STICKER    ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `🎨 *STICKER MAKER HELP*\n\n` +
                 `*Command Dasar:*\n` +
                 `${prefix}s - Buat sticker (full)\n` +
                 `${prefix}sticker - Sama seperti ${prefix}s\n` +
                 `${prefix}stiker - Alias\n\n` +
                 `*Style Sticker:*\n` +
                 `${prefix}s full - Sticker full (default)\n` +
                 `${prefix}s circle - Sticker bulat\n` +
                 `${prefix}s rounded - Sticker rounded\n\n` +
                 `*Custom Metadata:*\n` +
                 `${prefix}s pack="Nama Pack" author="Nama"\n\n` +
                 `*Cara Pakai:*\n` +
                 `1️⃣ Kirim gambar/video ke chat\n` +
                 `2️⃣ Reply gambar/video itu\n` +
                 `3️⃣ Ketik ${prefix}s [style]\n\n` +
                 `ATAU langsung kirim gambar/video\n` +
                 `dengan caption ${prefix}s\n\n` +
                 `*Batasan:*\n` +
                 `• Gambar: Bebas ukuran\n` +
                 `• Video: Maks 15 detik\n` +
                 `• File: Maks 10 MB\n\n` +
                 `*FFmpeg Required!*\n` +
                 `Install FFmpeg dulu untuk pakai fitur ini.\n\n` +
                 `💡 Tips: Sticker bulat bagus\n` +
                 `buat foto profil!`;
    
    await sock.sendMessage(from, { text });
        }

// .info / .menu - With Thumbnail & Button List
async function cmdInfo(sock, from) {
    const prefix = global.botConfig.prefix;
    const sections = [
        {
            title: '📋 *INFO BOT*',
            rows: [
                {
                    title: '🤖 Info Bot',
                    description: 'Lihat informasi lengkap tentang bot',
                    id: `${prefix}infobot`
                },
                {
                    title: '👤 Owner Bot',
                    description: 'Kontak dan info owner/pembuat bot',
                    id: `${prefix}owner`
                },
                {
                    title: '👩‍🏫 Wali Kelas',
                    description: 'Informasi wali kelas 8C',
                    id: `${prefix}walas`
                }
            ]
        },
        {
            title: '📅 *JADWAL SEKOLAH*',
            rows: [
                {
                    title: '📆 Jadwal Hari Ini',
                    description: 'Lihat jadwal pelajaran hari ini',
                    id: `${prefix}today`
                },
                {
                    title: '📅 Reminder Besok',
                    description: 'Lihat jadwal pelajaran untuk besok',
                    id: `${prefix}tomorrow`
                },
                {
                    title: '📚 Jadwal Mapel',
                    description: 'Cari jadwal per hari (senin-jumat)',
                    id: `${prefix}mapel senin`
                },
                {
                    title: '🧹 Jadwal Piket',
                    description: 'Lihat jadwal piket per hari',
                    id: `${prefix}piket`
                },
                {
                    title: '📖 Jadwal Lengkap',
                    description: 'Lihat seluruh jadwal dan piket',
                    id: `${prefix}jadwal`
                }
            ]
        },
        {
            title: '⏰ *REMINDER*',
            rows: [
                {
                    title: '📋 Status Reminder',
                    description: 'Cek status sistem reminder otomatis',
                    id: `${prefix}reminder`
                },
                {
                    title: '📤 Kirim Reminder',
                    description: 'Kirim reminder manual (owner only)',
                    id: `${prefix}sendreminder`
                }
            ]
        },
        {
            title: '🎬 *ALIGHT MOTION*',
            rows: [
                {
                    title: '✨ Generate Premium',
                    description: 'Generate Alight Motion Premium 1 Tahun',
                    id: `${prefix}alight`
                }
            ]
        },
        {
            title: '🎵 *SONGFESS*',
            rows: [
                {
                    title: '🎵 Kirim SongFess',
                    description: 'Kirim lagu + pesan ke channel',
                    id: `${prefix}songfess`
                }
            ]
        },
        {
            title: '💌 *MENFESS / CONFESS*',
            rows: [
                {
                    title: '💌 Kirim Menfess',
                    description: 'Kirim pesan anonim ke seseorang',
                    id: `${prefix}menfess`
                }
            ]
        },
        {
            title: '🛠️ *UTILITY*',
            rows: [
                {
                    title: '🆔 Get ID Chat',
                    description: 'Lihat ID chat untuk konfigurasi bot',
                    id: `${prefix}getid`
                },
                {
                    title: '🏓 Ping',
                    description: 'Cek status bot',
                    id: `${prefix}ping`
                }
            ]
        }
    ];

    const message = {
        image: { url: 'https://files.catbox.moe/placeholder.jpg' },
        caption: `╔══════════════════════════╗\n` +
                 `║     🤖 ${global.botConfig.name}     ║\n` +
                 `║   v${global.botConfig.version}  |  By ${global.botConfig.owner}   ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `📌 *Pilih menu di bawah ini:*\n\n` +
                 `⏰ Reminder Otomatis:\n` +
                 `🌅 12:00 | ☀️ 16:00 | 🌙 20:00`,
        footer: '© 2024 School Assistant Bot',
        buttons: [
            { buttonId: `${prefix}today`, buttonText: { displayText: '📅 Hari Ini' }, type: 1 },
            { buttonId: `${prefix}tomorrow`, buttonText: { displayText: '🔮 Besok' }, type: 1 },
            { buttonId: `${prefix}songfess`, buttonText: { displayText: '🎵 SongFess' }, type: 1 }
        ],
        viewOnce: false
    };

    try {
        await sock.sendMessage(from, message);
    } catch (e) {
        // Fallback ke text
        await sock.sendMessage(from, {
            text: `╔══════════════════════════╗\n` +
                  `║     🤖 ${global.botConfig.name}     ║\n` +
                  `║   v${global.botConfig.version}  |  By ${global.botConfig.owner}   ║\n` +
                  `╚══════════════════════════╝\n\n` +
                  `📌 *DAFTAR COMMAND*\n\n` +
                  `📋 *Info:* ${prefix}info, ${prefix}owner, ${prefix}walas\n` +
                  `📅 *Jadwal:* ${prefix}today, ${prefix}tomorrow, ${prefix}mapel, ${prefix}piket, ${prefix}jadwal\n` +
                  `⏰ *Reminder:* ${prefix}reminder, ${prefix}sendreminder\n` +
                  `🎬 *Alight:* ${prefix}alight\n` +
                  `🎵 *SongFess:* ${prefix}songfess\n` +
                  `💌 *Menfess:* ${prefix}menfess\n` +
                  `🛠️ *Utility:* ${prefix}getid, ${prefix}ping\n\n` +
                  `💡 Contoh: ${prefix}songfess judul|pesan`
        });
    }
}

// .owner - With Button
async function cmdOwner(sock, from) {
    const ownerNumber = global.botConfig.noOwner.replace(/^0/, '62');
    
    const message = {
        image: { url: 'https://files.catbox.moe/owner-banner.jpg' },
        caption: `╔══════════════════════════╗\n` +
                 `║       👤 OWNER BOT       ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `👤 *Nama:* ${global.botConfig.owner}\n` +
                 `📞 *WhatsApp:* ${global.botConfig.noOwner}\n` +
                 `💬 *Telegram:* @ndiidepzX\n\n` +
                 `📧 *Email:* owner@example.com\n\n` +
                 `💡 Untuk pertanyaan atau request,\n` +
                 `silakan hubungi owner melalui tombol di bawah.`,
        footer: '👆 Klik tombol untuk menghubungi owner',
        buttons: [
            { 
                buttonId: 'owner_chat', 
                buttonText: { displayText: '💬 Chat Owner' }, 
                type: 1 
            },
            { 
                buttonId: 'owner_profile', 
                buttonText: { displayText: '👤 Profil Owner' }, 
                type: 1 
            }
        ],
        viewOnce: false
    };

    try {
        await sock.sendMessage(from, message);
    } catch (e) {
        await sock.sendMessage(from, {
            text: `╔══════════════════════════╗\n` +
                  `║       👤 OWNER BOT       ║\n` +
                  `╚══════════════════════════╝\n\n` +
                  `👤 Nama: *${global.botConfig.owner}*\n` +
                  `📞 WhatsApp: *${global.botConfig.noOwner}*\n` +
                  `💬 Telegram: @ndiidepzX\n\n` +
                  `🔗 Link WA: https://wa.me/${ownerNumber}\n\n` +
                  `💡 Untuk pertanyaan atau request,\n` +
                  `silakan hubungi owner.`
        });
    }
}

// .walas
async function cmdWalas(sock, from) {
    const text = `╔══════════════════════════╗\n` +
                 `║    👩‍🏫 WALI KELAS 8C     ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `📌 *Informasi Wali Kelas*\n\n` +
                 `👤 Nama: Ibu Sari, S.Pd.\n` +
                 `🏫 Kelas: 8C\n` +
                 `📞 No. HP: 081234567890\n\n` +
                 `🕐 Jam Konsultasi:\n` +
                 `   Senin - Jumat: 08.00 - 14.00\n` +
                 `   Sabtu: 08.00 - 12.00\n\n` +
                 `📍 Ruang: Kantor Guru Lt. 2`;
    
    await sock.sendMessage(from, { text });
}

// ... (fungsi today, tomorrow, mapel, piket, jadwal, reminder, sendreminder tetap sama) ...

// ============================================
// SONGFESS COMMAND
// ============================================

// .songfess / .sf - Kirim songfess ke channel
async function cmdSongFess(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    const channelId = global.botConfig.channelId || '120363xxxxx@newsletter';
    
    if (args.length === 0) {
        const message = {
            image: { url: 'https://files.catbox.moe/songfess-banner.jpg' },
            caption: `╔══════════════════════════╗\n` +
                     `║    🎵 S O N G F E S S   ║\n` +
                     `╚══════════════════════════╝\n\n` +
                     `📌 *Cara Pakai SongFess:*\n\n` +
                     `*Format 1 - Judul + Pesan:*\n` +
                     `${prefix}songfess judul lagu | pesan kamu\n\n` +
                     `*Format 2 - Judul aja:*\n` +
                     `${prefix}songfess judul lagu\n\n` +
                     `*Format 3 - Reply lagu:*\n` +
                     `Reply pesan yang berisi audio/lagu\n` +
                     `lalu ketik: ${prefix}songfess pesan\n\n` +
                     `💡 *Contoh:*\n` +
                     `${prefix}songfess Night Changes | lagu ini bikin nangis 😭\n` +
                     `${prefix}songfess Sempurna\n\n` +
                     `🎵 SongFess akan dikirim ke channel!\n` +
                     `🕐 Delay: ~5 menit (antrian)`,
            footer: '🎵 Kirim lagu favoritmu secara anonim',
            buttons: [
                { 
                    buttonId: `${prefix}songfess help`, 
                    buttonText: { displayText: '📖 Cara Pakai' }, 
                    type: 1 
                },
                { 
                    buttonId: `${prefix}songfess stats`, 
                    buttonText: { displayText: '📊 Stats' }, 
                    type: 1 
                }
            ],
            viewOnce: false
        };

        try {
            await sock.sendMessage(from, message);
        } catch (e) {
            await sock.sendMessage(from, {
                text: `╔══════════════════════════╗\n` +
                      `║    🎵 S O N G F E S S   ║\n` +
                      `╚══════════════════════════╝\n\n` +
                      `📌 *Cara Pakai:*\n\n` +
                      `*Format 1:* ${prefix}songfess judul | pesan\n` +
                      `*Format 2:* ${prefix}songfess judul\n\n` +
                      `💡 Contoh:\n` +
                      `${prefix}songfess Night Changes | lagu ini bikin nangis 😭`
            });
        }
        return;
    }

    // Command: stats
    if (args[0] === 'stats') {
        const stats = getSongFessStats();
        const text = `╔══════════════════════════╗\n` +
                     `║  🎵 SONGFESS STATS     ║\n` +
                     `╚══════════════════════════╝\n\n` +
                     `📊 *Total SongFess:* ${stats.total}\n` +
                     `⏳ *Dalam Antrian:* ${stats.pending}\n` +
                     `✅ *Terkirim Hari Ini:* ${stats.sentToday}\n` +
                     `🕐 *Delay Kirim:* ${stats.interval} menit\n\n` +
                     `💡 Kirim songfess sekarang:\n` +
                     `${prefix}songfess judul lagu | pesan`;
        await sock.sendMessage(from, { text });
        return;
    }

    // Cek apakah user mereply pesan audio
    let quotedAudio = null;
    if (messageInfo.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = messageInfo.message.extendedTextMessage.contextInfo.quotedMessage;
        if (quoted.audioMessage) {
            quotedAudio = quoted.audioMessage;
        }
    }

    // Gabungkan args dan split dengan |
    const fullArgs = args.join(' ');
    const parts = fullArgs.split('|').map(p => p.trim());
    
    const songTitle = parts[0] || '';
    const songMessage = parts[1] || '';
    
    if (!songTitle) {
        await sock.sendMessage(from, { text: '❌ Judul lagu tidak boleh kosong!' });
        return;
    }

    // Cek panjang
    if (songTitle.length > 100) {
        await sock.sendMessage(from, { text: '❌ Judul lagu maksimal 100 karakter!' });
        return;
    }
    
    if (songMessage.length > 500) {
        await sock.sendMessage(from, { text: '❌ Pesan maksimal 500 karakter!' });
        return;
    }

    // Dapatkan nomor pengirim (anonim)
    const senderNumber = from.split('@')[0];
    const anonId = senderNumber.slice(-4);

    // Simpan songfess
    const songFessData = {
        title: songTitle,
        message: songMessage,
        sender: pushName,
        anonId: `#${anonId}`,
        timestamp: Date.now(),
        hasAudio: !!quotedAudio
    };

    const queueId = addSongFess(songFessData);

    // Kirim konfirmasi ke pengirim
    const confirmText = `╔══════════════════════════╗\n` +
                        `║  🎵 SONGFESS TERKIRIM  ║\n` +
                        `╚══════════════════════════╝\n\n` +
                        `🎶 *Judul:* ${songTitle}\n` +
                        (songMessage ? `💬 *Pesan:* ${songMessage}\n` : '') +
                        `🆔 *ID:* ${queueId}\n` +
                        `👤 *Anonim ID:* ${anonId}\n\n` +
                        `⏳ SongFess kamu akan dikirim\n` +
                        `ke channel dalam ~5 menit.\n\n` +
                        `💡 *Info:* Identitas kamu dirahasiakan.\n` +
                        `Hanya 4 digit terakhir nomor yang tampil.`;

    const confirmMsg = {
        text: confirmText,
        footer: '🎵 SongFess - Anonim',
        buttons: [
            { 
                buttonId: `${prefix}songfess stats`, 
                buttonText: { displayText: '📊 Lihat Stats' }, 
                type: 1 
            }
        ],
        viewOnce: false
    };

    try {
        await sock.sendMessage(from, confirmMsg);
    } catch (e) {
        await sock.sendMessage(from, { text: confirmText });
    }

    // Kirim ke channel (dengan delay dari queue system)
    // Queue system akan handle pengiriman otomatis
}

// ============================================
// MENFESS / CONFESS COMMAND
// ============================================

// .menfess / .confess - Kirim pesan anonim ke seseorang
async function cmdConfess(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const message = {
            image: { url: 'https://files.catbox.moe/confess-banner.jpg' },
            caption: `╔══════════════════════════╗\n` +
                     `║  💌 M E N F E S S      ║\n` +
                     `║    CONFESS ANONIM       ║\n` +
                     `╚══════════════════════════╝\n\n` +
                     `📌 *Cara Pakai Menfess:*\n\n` +
                     `*Format:*\n` +
                     `${prefix}menfess 628xxxx|pesan kamu\n\n` +
                     `💡 *Contoh:*\n` +
                     `${prefix}menfess 628123456789|hai kamu cantik banget 🥰\n\n` +
                     `🔒 *Privasi:*\n` +
                     `• Pengirim dirahasiakan\n` +
                     `• Nomor tujuan tidak ditampilkan\n` +
                     `• Pesan dikirim langsung ke orangnya\n\n` +
                     `⚠️ *Rules:*\n` +
                     `• Dilarang spam\n` +
                     `• Dilarang kirim konten negatif\n` +
                     `• Maksimal 5x per hari`,
            footer: '💌 Kirim pesan rahasiamu secara anonim',
            buttons: [
                { 
                    buttonId: `${prefix}menfess help`, 
                    buttonText: { displayText: '📖 Cara Pakai' }, 
                    type: 1 
                },
                { 
                    buttonId: `${prefix}menfess stats`, 
                    buttonText: { displayText: '📊 Stats' }, 
                    type: 1 
                }
            ],
            viewOnce: false
        };

        try {
            await sock.sendMessage(from, message);
        } catch (e) {
            await sock.sendMessage(from, {
                text: `╔══════════════════════════╗\n` +
                      `║  💌 M E N F E S S      ║\n` +
                      `╚══════════════════════════╝\n\n` +
                      `📌 *Cara Pakai:*\n` +
                      `${prefix}menfess 628xxxx|pesan kamu\n\n` +
                      `💡 Contoh:\n` +
                      `${prefix}menfess 628123456789|hai kamu cantik 🥰`
            });
        }
        return;
    }

    // Command: stats
    if (args[0] === 'stats') {
        const queue = getConfessQueue();
        const senderNumber = from.split('@')[0];
        const senderConfesses = queue.filter(c => c.senderNumber === senderNumber);
        
        const text = `╔══════════════════════════╗\n` +
                     `║  💌 MENFESS STATS      ║\n` +
                     `╚══════════════════════════╝\n\n` +
                     `📊 *Total Antrian:* ${queue.length}\n` +
                     `✉️ *Kamu Hari Ini:* ${senderConfesses.length}/5\n` +
                     `⏳ *Status:* ${queue.length > 0 ? 'Processing' : 'Idle'}\n\n` +
                     `💡 Kirim menfess:\n` +
                     `${prefix}menfess 628xxxx|pesan`;
        await sock.sendMessage(from, { text });
        return;
    }

    // Gabungkan args dan split dengan |
    const fullArgs = args.join(' ');
    const parts = fullArgs.split('|').map(p => p.trim());
    
    const targetNumber = parts[0]?.replace(/[^0-9]/g, '') || '';
    const confessMessage = parts.slice(1).join('|').trim();
    
    // Validasi nomor
    if (!targetNumber || targetNumber.length < 10) {
        await sock.sendMessage(from, { 
            text: '❌ *Nomor tujuan tidak valid!*\n\n' +
                  'Format: 628xxxxxxxxxx\n\n' +
                  `Contoh: ${prefix}menfess 628123456789|pesan`
        });
        return;
    }

    // Validasi pesan
    if (!confessMessage) {
        await sock.sendMessage(from, { 
            text: '❌ *Pesan tidak boleh kosong!*\n\n' +
                  `Format: ${prefix}menfess nomor|pesan\n\n` +
                  `Contoh: ${prefix}menfess 628123456789|hai!`
        });
        return;
    }

    if (confessMessage.length > 1000) {
        await sock.sendMessage(from, { text: '❌ Pesan maksimal 1000 karakter!' });
        return;
    }

    // Cek limit (maks 5x per hari per pengirim)
    const senderNumber = from.split('@')[0];
    const queue = getConfessQueue();
    const senderConfesses = queue.filter(c => c.senderNumber === senderNumber);
    
    if (senderConfesses.length >= 5) {
        await sock.sendMessage(from, { 
            text: '❌ *Limit Harian Tercapai!*\n\n' +
                  'Kamu sudah mengirim 5 menfess hari ini.\n' +
                  'Silakan coba lagi besok.'
        });
        return;
    }

    // Cek apakah nomor tujuan sama dengan pengirim
    if (targetNumber === senderNumber || targetNumber === senderNumber.replace(/^62/, '0')) {
        await sock.sendMessage(from, { 
            text: '😅 *Tidak bisa kirim ke diri sendiri!*\n\n' +
                  'Menfess hanya untuk mengirim ke orang lain.'
        });
        return;
    }

    // Format nomor tujuan
    const formattedTarget = targetNumber.startsWith('62') ? targetNumber : 
                           targetNumber.startsWith('0') ? '62' + targetNumber.slice(1) : 
                           '62' + targetNumber;
    
    const targetJid = formattedTarget + '@s.whatsapp.net';

    // Simpan confess
    const confessData = {
        targetNumber: formattedTarget,
        targetJid: targetJid,
        message: confessMessage,
        senderName: pushName,
        senderNumber: senderNumber,
        anonId: `#${senderNumber.slice(-4)}`,
        timestamp: Date.now()
    };

    const confessId = addConfess(confessData);

    // Kirim konfirmasi ke pengirim
    const confirmText = `╔══════════════════════════╗\n` +
                        `║  💌 MENFESS TERKIRIM   ║\n` +
                        `╚══════════════════════════╝\n\n` +
                        `📱 *Ke:* ${formattedTarget.slice(0, 6)}xxxx\n` +
                        `💬 *Pesan:* ${confessMessage.slice(0, 100)}${confessMessage.length > 100 ? '...' : ''}\n` +
                        `🆔 *ID:* ${confessId}\n` +
                        `👤 *Anonim ID:* #${senderNumber.slice(-4)}\n\n` +
                        `✅ Menfess kamu akan segera dikirim!\n\n` +
                        `💡 Penerima tidak akan tahu\n` +
                        `siapa pengirimnya 🤫`;

    const confirmMsg = {
        text: confirmText,
        footer: '💌 Menfess - Anonim & Rahasia',
        buttons: [
            { 
                buttonId: `${prefix}menfess stats`, 
                buttonText: { displayText: '📊 Cek Stats' }, 
                type: 1 
            }
        ],
        viewOnce: false
    };

    try {
        await sock.sendMessage(from, confirmMsg);
    } catch (e) {
        await sock.sendMessage(from, { text: confirmText });
    }

    // Kirim langsung ke target
    try {
        const targetText = `╔══════════════════════════╗\n` +
                          `║  💌 KAMU DAPAT MENFESS! ║\n` +
                          `╚══════════════════════════╝\n\n` +
                          `💌 *Pesan Rahasia Untukmu:*\n\n` +
                          `_"${confessMessage}"_\n\n` +
                          `─────────────────────────\n` +
                          `👤 *Dari:* Anonim #${senderNumber.slice(-4)}\n` +
                          `🕐 *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n` +
                          `💡 Seseorang mengirimkan pesan\n` +
                          `ini untukmu secara anonim.\n\n` +
                          `🔒 Identitas pengirim dirahasiakan.\n\n` +
                          `✨ Mau balas? Kirim menfess juga!\n` +
                          `Ketik: ${prefix}menfess <nomor>|<pesan>`;

        // Coba kirim dengan button
        const targetMsg = {
            text: targetText,
            footer: '💌 Menfess - Pesan Rahasia',
            buttons: [
                { 
                    buttonId: `${prefix}menfess`, 
                    buttonText: { displayText: '💌 Balas Menfess' }, 
                    type: 1 
                }
            ],
            viewOnce: false
        };

        try {
            await sock.sendMessage(targetJid, targetMsg);
        } catch (e) {
            await sock.sendMessage(targetJid, { text: targetText });
        }

        // Update status di queue
        removeConfess(confessId, true);

        // Kirim notifikasi sukses ke pengirim
        setTimeout(async () => {
            await sock.sendMessage(from, {
                text: `✅ *Menfess Terkirim!*\n\n` +
                      `Pesan kamu (#${confessId}) sudah\n` +
                      `berhasil dikirim ke tujuan.\n\n` +
                      `🕐 ${new Date().toLocaleTimeString('id-ID')}`
            });
        }, 2000);

    } catch (err) {
        console.error('Gagal kirim menfess:', err.message);
        
        // Update status gagal
        removeConfess(confessId, false);

        await sock.sendMessage(from, {
            text: `❌ *Gagal Mengirim Menfess!*\n\n` +
                  `Pesan tidak bisa dikirim ke nomor tujuan.\n\n` +
                  `Kemungkinan:\n` +
                  `• Nomor tidak terdaftar di WhatsApp\n` +
                  `• Nomor salah\n` +
                  `• Pengguna memblokir bot\n\n` +
                  `💡 Coba cek kembali nomor tujuannya.`
        });
    }
}

// ... (fungsi getid dan ping tetap sama) ...

// .getid
async function cmdGetId(sock, from, messageInfo) {
    const text = `🆔 *CHAT ID INFORMATION*\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `📱 Chat ID: \`${from}\`\n` +
                 `📋 Tipe: ${messageInfo.isChannel ? 'Channel' : messageInfo.isGroup ? 'Group' : 'Private Chat'}\n` +
                 `👤 Nama: ${messageInfo.pushName}\n\n` +
                 `💡 Gunakan ID ini untuk konfigurasi bot.\n` +
                 `   Update \`channelId\` atau \`groupId\` di index.js`;
    
    await sock.sendMessage(from, { text });
}
