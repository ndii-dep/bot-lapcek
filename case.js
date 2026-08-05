const schoolData = require('./lib/schoolData');
const reminderSystem = require('./lib/reminder');
const { alightMotion } = require('./lib/alightMotion');
const { addSongFess, getSongFessStats, getAllSongFess } = require('./lib/songFess');
const { addConfess, getConfessQueue, removeConfess } = require('./lib/confess');
const { createSticker, checkFfmpeg, CONFIG: STICKER_CONFIG } = require('./lib/sticker');
const { formatDuration } = require('./lib/stickerUtils');
const { addPR, deletePR, getPRs, getPRById, getPRStats, formatPRList, formatPRDetail } = require('./lib/prTracker');
const { getUserLevel, hasPermission, getLevelName, addPartner, removePartner, listPartners, LEVELS, PERMISSIONS, getPermissionList } = require('./lib/permission');
const { addChannel, addGroup, removeChannel, removeGroup, getChannels, getGroups, getAllTargets } = require('./lib/channelManager');
const { toAudio, toPTT, toVideo, ffmpeg } = require('./lib/converter');
const didYouMean = require('didyoumean');

// Ambil semua command dari file ini secara otomatis
const fs = require('fs');
const path = require('path');

function getAllCommands() {
    const commands = [];
    const filePath = __filename;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Cari semua case di switch statement
    const caseRegex = /case\s+['"]([^'"]+)['"]\s*:/g;
    let match;
    while ((match = caseRegex.exec(content)) !== null) {
        commands.push(match[1]);
    }
    
    return [...new Set(commands)]; // Hapus duplikat
}

const allCommands = getAllCommands();

module.exports = async function(sock, messageInfo) {
    const { from, pushName, isGroup, isChannel, message, key } = messageInfo;
    
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
    
    if (!text) return;
    
    const prefix = global.botConfig.prefix;
    if (!text.startsWith(prefix)) return;

    // ============ QUOTED MESSAGE UTILITY ============

const createQuoted = {
    // Untuk message dari Shop/Store
    shop: (text) => ({
        key: {
            remoteJid: '0@s.whatsapp.net',
            participant: '0@s.whatsapp.net'
        },
        message: {
            newsletterAdminInviteMessage: {
                newsletterJid: '120363166641556515@newsletter',
                newsletterName: 'FestiveShopID',
                caption: text || '🛍️ FestiveShopID - Belanja Mudah & Terpercaya!'
            }
        }
    }),

    // Untuk message dari Owner
    owner: (text) => ({
        key: {
            remoteJid: '0@s.whatsapp.net',
            participant: '0@s.whatsapp.net'
        },
        message: {
            newsletterAdminInviteMessage: {
                newsletterJid: '120363303234567890@newsletter',
                newsletterName: 'Owner NeoGoforward',
                caption: text || '👑 Official Owner Bot'
            }
        }
    }),

    // Untuk message dari Bot
    bot: (text) => ({
        key: {
            remoteJid: '0@s.whatsapp.net',
            participant: '0@s.whatsapp.net'
        },
        message: {
            newsletterAdminInviteMessage: {
                newsletterJid: '120363299999999999@newsletter',
                newsletterName: `${global.botConfig.name}`,
                caption: text || `🤖 ${global.botConfig.name} v${global.botConfig.version}`
            }
        }
    }),

    // Untuk message dengan timestamp
    time: (text) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Jakarta'
        });
        const dateStr = now.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Jakarta'
        });

        return {
            key: {
                remoteJid: '0@s.whatsapp.net',
                participant: '0@s.whatsapp.net'
            },
            message: {
                newsletterAdminInviteMessage: {
                    newsletterJid: '120363333333333333@newsletter',
                    newsletterName: `⏰ ${timeStr}`,
                    caption: text || `📅 ${dateStr}\n🕐 ${timeStr} WIB`
                }
            }
        };
    },

    // Untuk message dari Channel tertentu
    channel: (channelId, channelName, text) => ({
        key: {
            remoteJid: '0@s.whatsapp.net',
            participant: '0@s.whatsapp.net'
        },
        message: {
            newsletterAdminInviteMessage: {
                newsletterJid: channelId || '120363000000000000@newsletter',
                newsletterName: channelName || 'Channel WhatsApp',
                caption: text || '📢 Official Channel'
            }
        }
    }),

    // Untuk message dengan custom
    custom: (jid, name, text) => ({
        key: {
            remoteJid: '0@s.whatsapp.net',
            participant: '0@s.whatsapp.net'
        },
        message: {
            newsletterAdminInviteMessage: {
                newsletterJid: jid || '0@newsletter',
                newsletterName: name || 'Unknown',
                caption: text || ''
            }
        }
    })
};

// Fungsi untuk mendapatkan quoted berdasarkan tipe
function getQuoted(type, text) {
    const types = {
        shop: createQuoted.shop,
        owner: createQuoted.owner,
        bot: createQuoted.bot,
        time: createQuoted.time,
        channel: createQuoted.channel,
        custom: createQuoted.custom
    };

    const func = types[type];
    if (!func) return null;

    if (type === 'channel') {
        return func(text?.channelId, text?.channelName, text?.caption);
    } else if (type === 'custom') {
        return func(text?.jid, text?.name, text?.caption);
    } else {
        return func(text);
    }
}
    
    const args = text.slice(prefix.length).trim().split(/ +/);
    const cmd = args[0]?.toLowerCase() || '';
    const commandArgs = args.slice(1);
    
    const senderNumber = from.split('@')[0];
    const userLevel = getUserLevel(senderNumber, pushName);
    const levelName = getLevelName(userLevel);
    
    const chatType = isChannel ? 'Channel' : isGroup ? 'Group' : 'Private';
    console.log(`⚡ [${chatType}] ${levelName} ${pushName}: ${cmd} ${commandArgs.join(' ')}`);
    
    if (!hasPermission(senderNumber, cmd, pushName)) {
        await sock.sendMessage(from, {
            text: `🔒 *Akses Ditolak!*\n\nCommand *${prefix}${cmd}* membutuhkan level yang lebih tinggi.\n\n👤 Level kamu: ${levelName}\n🔑 Dibutuhkan: Partner atau Owner\n\n💡 Hubungi owner untuk jadi partner.`
        });
        return;
    }
    
    try {
        switch(cmd) {
            case 'info':
            case 'menu':
            case 'help':
            case '?':
                await cmdInfo(sock, from);
                break;
                
            case 'owner':
            case 'pemilik':
            case 'creator':
            case 'dev':
                await cmdOwner(sock, from);
                break;
                
            case 'walas':
            case 'walikelas':
            case 'guru':
            case 'teacher':
                await cmdWalas(sock, from);
                break;
                
            case 'today':
            case 'hariini':
            case 'sekarang':
                await cmdToday(sock, from);
                break;
                
            case 'tomorrow':
            case 'besok':
            case 'reminderbesok':
                await cmdTomorrow(sock, from);
                break;
                
            case 'mapel':
            case 'pelajaran':
            case 'matapelajaran':
            case 'subject':
                await cmdMapel(sock, from, commandArgs);
                break;
                
            case 'piket':
            case 'clean':
            case 'bersih':
            case 'duty':
                await cmdPiket(sock, from, commandArgs);
                break;
                
            case 'jadwal':
            case 'schedule':
            case 'fullschedule':
            case 'lengkap':
                await cmdJadwal(sock, from);
                break;
                
            case 'sendreminder':
            case 'kirimreminder':
            case 'sendnotif':
            case 'kirimnotif':
                await cmdSendReminder(sock, from, pushName);
                break;
                
            case 'reminder':
            case 'reminders':
            case 'pengingat':
            case 'notif':
                await cmdReminderMenu(sock, from);
                break;
                
            case 'alight':
            case 'alightmotion':
            case 'am':
            case 'alightpremium':
            case 'premium':
                await cmdAlightMotion(sock, from, commandArgs, pushName);
                break;
                
            case 'songfess':
            case 'sf':
            case 'song':
            case 'lagu':
            case 'musicfess':
                await cmdSongFess(sock, from, commandArgs, pushName, messageInfo);
                break;
                
            case 'menfess':
            case 'confess':
            case 'confes':
            case 'menfes':
            case 'anon':
            case 'rahasia':
                await cmdConfess(sock, from, commandArgs, pushName, messageInfo);
                break;
                
            case 'sticker':
            case 'stiker':
            case 's':
            case 'stick':
            case 'stickerwa':
                await cmdSticker(sock, from, commandArgs, pushName, messageInfo);
                break;
                
            case 'search':
            case 'cari':
            case 'find':
            case 'cmd':
                await cmdSearch(sock, from, commandArgs, prefix);
                break;
                
            case 'addpr':
            case 'tambahpr':
            case 'addtugas':
                await cmdAddPR(sock, from, commandArgs, pushName, messageInfo);
                break;
                
            case 'delpr':
            case 'hapuspr':
            case 'deletepr':
                await cmdDeletePR(sock, from, commandArgs, pushName);
                break;
                
            case 'pr':
            case 'listpr':
            case 'tugas':
            case 'dafpus':
                await cmdListPR(sock, from, commandArgs);
                break;
                
            case 'addpartner':
                await cmdAddPartner(sock, from, commandArgs, pushName);
                break;
                
            case 'delpartner':
            case 'removepartner':
                await cmdRemovePartner(sock, from, commandArgs, pushName);
                break;
                
            case 'listpartner':
            case 'partners':
                await cmdListPartners(sock, from);
                break;
                
            case 'addch':
            case 'addchannel':
                await cmdAddChannel(sock, from, commandArgs, pushName);
                break;
                
            case 'delch':
            case 'removechannel':
                await cmdRemoveChannel(sock, from, commandArgs, pushName);
                break;
                
            case 'listch':
            case 'channels':
                await cmdListChannels(sock, from);
                break;
                
            case 'addgroup':
            case 'addgrup':
                await cmdAddGroupCmd(sock, from, commandArgs, pushName);
                break;
                
            case 'delgroup':
            case 'removegroup':
                await cmdRemoveGroupCmd(sock, from, commandArgs, pushName);
                break;
                
            case 'listgroup':
            case 'groups':
            case 'grup':
                await cmdListGroups(sock, from);
                break;
                
            case 'broadcast':
            case 'bc':
                await cmdBroadcast(sock, from, commandArgs, pushName, messageInfo);
                break;
                
            case 'getid':
            case 'id':
            case 'chatid':
            case 'cekid':
            case 'myid':
                await cmdGetId(sock, from, messageInfo);
                break;
                
            case 'ping':
            case 'cek':
            case 'test':
            case 'status':
            case 'botstatus':
                await cmdPing(sock, from);
                break;
                
            case 'mylevel':
            case 'level':
            case 'role':
                await cmdMyLevel(sock, from, pushName, senderNumber);
                break;
                
            case 'tqto':
            case 'thanks':
            case 'thanksto':
            case 'credits':
            case 'credit':
            case 'specialthanks':
                await cmdTqto(sock, from);
                break;
                
            case 'toaudio':
            case 'mp3':
            case 'audio':
                await cmdToAudio(sock, from, commandArgs, messageInfo);
                break;
                
            case 'toptt':
            case 'ptt':
            case 'voice':
                await cmdToPTT(sock, from, commandArgs, messageInfo);
                break;
                
            case 'convert':
            case 'converter':
                await cmdConvert(sock, from, commandArgs, messageInfo);
                break;
                
            default:
                if (cmd) {
                    // Gunakan didyoumean untuk suggest command
                    didYouMean.threshold = 0.4;
                    didYouMean.caseSensitive = false;
                    
                    const suggestion = didYouMean(cmd, allCommands);
                    
                    if (suggestion && suggestion !== cmd) {
                        await sock.sendMessage(from, { 
                            text: `❌ *Command tidak ditemukan!*\n\nCommand *${prefix}${cmd}* tidak ditemukan.\n\n💡 Mungkin maksud kamu: *${prefix}${suggestion}*\n\nKetik *${prefix}menu* untuk melihat semua command.`
                        });
                    } else {
                        await sock.sendMessage(from, { 
                            text: `❌ *Unknown Command*\n\nCommand *${prefix}${cmd}* tidak ditemukan.\n\nKetik *${prefix}menu* untuk melihat semua command.`
                        });
                    }
                }
                break;
        }
    } catch (err) {
        console.error(`❌ Error executing ${cmd}:`, err.message);
        try {
            await sock.sendMessage(from, { 
                text: '❌ Maaf, terjadi kesalahan saat memproses command.' 
            });
        } catch (e) {}
    }
};

async function cmdInfo(sock, from) {
    const prefix = global.botConfig.prefix;
    
    const buttons = [
        { buttonId: `${prefix}owner`, buttonText: { displayText: '👑 Owner' }, type: 1 },
        { buttonId: `${prefix}today`, buttonText: { displayText: '📅 Hari Ini' }, type: 1 },
        { buttonId: `${prefix}tqto`, buttonText: { displayText: '🙏 Credits' }, type: 1 },
        { buttonId: `${prefix}mylevel`, buttonText: { displayText: '👤 My Level' }, type: 1 },
        { buttonId: `${prefix}ping`, buttonText: { displayText: '🏓 Ping' }, type: 1 }
    ];
    
    const text = `╔══════════════════════════╗\n` +
                 `║     🤖 ${global.botConfig.name}     ║\n` +
                 `║   v${global.botConfig.version}  |  By ${global.botConfig.owner}   ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `📌 *DAFTAR COMMAND*\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `📋 *Info:*\n` +
                 `  ${prefix}info - Info bot\n` +
                 `  ${prefix}owner - Info owner\n` +
                 `  ${prefix}walas - Info wali kelas\n\n` +
                 `📅 *Jadwal:*\n` +
                 `  ${prefix}today - Jadwal hari ini\n` +
                 `  ${prefix}tomorrow - Reminder besok\n` +
                 `  ${prefix}mapel [hari] - Jadwal mapel\n` +
                 `  ${prefix}piket [hari] - Jadwal piket\n` +
                 `  ${prefix}jadwal - Semua jadwal\n\n` +
                 `⏰ *Reminder:*\n` +
                 `  ${prefix}reminder - Info reminder\n` +
                 `  ${prefix}sendreminder - Kirim manual\n\n` +
                 `🎬 *Alight Motion:*\n` +
                 `  ${prefix}alight - Generate premium\n\n` +
                 `🎵 *SongFess:*\n` +
                 `  ${prefix}songfess - Kirim lagu ke channel\n\n` +
                 `💌 *Menfess:*\n` +
                 `  ${prefix}menfess - Pesan anonim\n\n` +
                 `🎨 *Sticker:*\n` +
                 `  ${prefix}s - Buat sticker\n\n` +
                 `🎵 *Converter:*\n` +
                 `  ${prefix}toaudio - Convert ke audio\n` +
                 `  ${prefix}toptt - Convert ke voice note\n` +
                 `  ${prefix}convert - Convert video ke audio\n\n` +
                 `📚 *PR/Tugas:*\n` +
                 `  ${prefix}addpr - Tambah PR\n` +
                 `  ${prefix}delpr - Hapus PR\n` +
                 `  ${prefix}pr - Daftar PR\n\n` +
                 `⭐ *Partner:*\n` +
                 `  ${prefix}addpartner - Tambah partner\n` +
                 `  ${prefix}delpartner - Hapus partner\n` +
                 `  ${prefix}listpartner - List partner\n\n` +
                 `📢 *Channel/Group:*\n` +
                 `  ${prefix}addch - Tambah channel\n` +
                 `  ${prefix}delch - Hapus channel\n` +
                 `  ${prefix}listch - List channel\n` +
                 `  ${prefix}addgroup - Tambah group\n` +
                 `  ${prefix}delgroup - Hapus group\n` +
                 `  ${prefix}listgroup - List group\n` +
                 `  ${prefix}bc - Broadcast\n\n` +
                 `🔍 *Search:*\n` +
                 `  ${prefix}search - Cari command\n\n` +
                 `🛠️ *Utility:*\n` +
                 `  ${prefix}getid - Lihat ID chat\n` +
                 `  ${prefix}ping - Cek status bot\n` +
                 `  ${prefix}mylevel - Cek level user\n` +
                 `  ${prefix}tqto - Credits & Thanks\n\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━\n` +
                 `⏰ Reminder otomatis:\n` +
                 `🌅 12:00 | ☀️ 16:00 | 🌙 20:00\n\n` +
                 `💡 Contoh: ${prefix}mapel senin\n` +
                 `         ${prefix}piket 1`;
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdOwner(sock, from) {
    const ownerNumber = global.botConfig.noOwner.replace(/^0/, '62');
    
    const buttons = [
        { buttonId: `https://wa.me/${ownerNumber}`, buttonText: { displayText: '📞 Hubungi Owner' }, type: 1 },
        { buttonId: `${global.botConfig.prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
    ];
    
    const text = `╔══════════════════════════╗\n` +
                 `║       👤 OWNER BOT       ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `👤 *Nama:* ${global.botConfig.owner}\n` +
                 `📞 *WhatsApp:* ${global.botConfig.noOwner}\n` +
                 `💬 *Telegram:* @ndiidepzX\n\n` +
                 `🔗 *Link WA:* https://wa.me/${ownerNumber}\n\n` +
                 `💡 Untuk pertanyaan atau request,\n` +
                 `silakan hubungi owner.`;
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdWalas(sock, from) {
    const buttons = [
        { buttonId: `${global.botConfig.prefix}info`, buttonText: { displayText: '📋 Menu' }, type: 1 },
        { buttonId: `${global.botConfig.prefix}today`, buttonText: { displayText: '📅 Hari Ini' }, type: 1 }
    ];
    
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
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdToday(sock, from) {
    try {
        const data = schoolData.getTodayReminder();
        const text = schoolData.formatReminderText(data);
        
        const buttons = [
            { buttonId: `${global.botConfig.prefix}tomorrow`, buttonText: { displayText: '📅 Besok' }, type: 1 },
            { buttonId: `${global.botConfig.prefix}jadwal`, buttonText: { displayText: '📚 Jadwal' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil jadwal hari ini.' });
    }
}

async function cmdTomorrow(sock, from) {
    try {
        const data = schoolData.getTomorrowReminder();
        const text = schoolData.formatReminderText(data);
        
        const buttons = [
            { buttonId: `${global.botConfig.prefix}today`, buttonText: { displayText: '📅 Hari Ini' }, type: 1 },
            { buttonId: `${global.botConfig.prefix}reminder`, buttonText: { displayText: '⏰ Reminder' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil reminder besok.' });
    }
}

async function cmdMapel(sock, from, args) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const text = `📅 *PILIH HARI*\n\nGunakan: ${prefix}mapel <hari>\n\n📌 Pilihan hari:\n  • senin / 1\n  • selasa / 2\n  • rabu / 3\n  • kamis / 4\n  • jumat / 5\n\n💡 Contoh: ${prefix}mapel senin`;
        
        const buttons = [
            { buttonId: `${prefix}mapel senin`, buttonText: { displayText: '📆 Senin' }, type: 1 },
            { buttonId: `${prefix}mapel selasa`, buttonText: { displayText: '📆 Selasa' }, type: 1 },
            { buttonId: `${prefix}mapel rabu`, buttonText: { displayText: '📆 Rabu' }, type: 1 },
            { buttonId: `${prefix}mapel kamis`, buttonText: { displayText: '📆 Kamis' }, type: 1 },
            { buttonId: `${prefix}mapel jumat`, buttonText: { displayText: '📆 Jumat' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
        return;
    }
    
    const result = schoolData.getScheduleByDay(args[0]);
    
    if (!result) {
        await sock.sendMessage(from, { 
            text: '❌ Hari tidak valid. Gunakan: senin, selasa, rabu, kamis, jumat, atau 1-5' 
        });
        return;
    }
    
    let text = `╔══════════════════════════╗\n`;
    text += `║  📅 JADWAL ${result.day.toUpperCase().padEnd(14)} ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    
    Object.entries(result.schedule).forEach(([key, lesson]) => {
        if (lesson.subject === 'ISTIRAHAT') {
            text += `🍽️  *Istirahat*\n   ⏰ ${lesson.time}\n\n`;
        } else {
            text += `📚 *Jam ke-${key}*\n`;
            text += `   📖 ${lesson.subject}\n`;
            text += `   ⏰ ${lesson.time}\n`;
            text += `   👨‍🏫 ${lesson.teacher}\n\n`;
        }
    });
    
    const buttons = [
        { buttonId: `${prefix}piket ${args[0]}`, buttonText: { displayText: '🧹 Piket' }, type: 1 },
        { buttonId: `${prefix}jadwal`, buttonText: { displayText: '📚 Full' }, type: 1 }
    ];
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdPiket(sock, from, args) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const text = `🧹 *PILIH HARI PIKET*\n\nGunakan: ${prefix}piket <hari>\n\n📌 Pilihan hari:\n  • senin / 1\n  • selasa / 2\n  • rabu / 3\n  • kamis / 4\n  • jumat / 5\n\n💡 Contoh: ${prefix}piket senin`;
        
        const buttons = [
            { buttonId: `${prefix}piket senin`, buttonText: { displayText: '🧹 Senin' }, type: 1 },
            { buttonId: `${prefix}piket selasa`, buttonText: { displayText: '🧹 Selasa' }, type: 1 },
            { buttonId: `${prefix}piket rabu`, buttonText: { displayText: '🧹 Rabu' }, type: 1 },
            { buttonId: `${prefix}piket kamis`, buttonText: { displayText: '🧹 Kamis' }, type: 1 },
            { buttonId: `${prefix}piket jumat`, buttonText: { displayText: '🧹 Jumat' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
        return;
    }
    
    const result = schoolData.getPiketByDay(args[0]);
    
    if (!result) {
        await sock.sendMessage(from, { 
            text: '❌ Hari tidak valid. Gunakan: senin, selasa, rabu, kamis, jumat, atau 1-5' 
        });
        return;
    }
    
    let text = `╔══════════════════════════╗\n`;
    text += `║  🧹 PIKET ${result.day.toUpperCase().padEnd(17)} ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    text += `👥 *Anggota Piket:*\n\n`;
    
    result.members.forEach((name, i) => {
        text += `   ${i + 1}. ${name}\n`;
    });
    
    text += `\n📌 *Tugas Piket:*\n`;
    text += `   • Membersihkan ruang kelas\n`;
    text += `   • Menghapus papan tulis\n`;
    text += `   • Merapikan meja dan kursi\n`;
    text += `   • Membuang sampah\n`;
    text += `   • Menyapu dan mengepel lantai\n\n`;
    text += `💡 Jangan lupa bawa peralatan kebersihan ✨`;
    
    const buttons = [
        { buttonId: `${prefix}mapel ${args[0]}`, buttonText: { displayText: '📚 Mapel' }, type: 1 },
        { buttonId: `${prefix}jadwal`, buttonText: { displayText: '📚 Full' }, type: 1 }
    ];
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdJadwal(sock, from) {
    try {
        let text = `╔══════════════════════════╗\n`;
        text += `║  📚 JADWAL KELAS 8C     ║\n`;
        text += `╚══════════════════════════╝\n\n`;
        
        text += `📅 *JADWAL PELAJARAN*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        const fullSchedule = schoolData.getFullSchedule();
        for (const [day, lessons] of Object.entries(fullSchedule)) {
            text += `📆 *${day.toUpperCase()}*\n`;
            Object.values(lessons).forEach(lesson => {
                if (lesson.subject === 'ISTIRAHAT') {
                    text += `   🍽️  Istirahat (${lesson.time})\n`;
                } else {
                    text += `   📖 ${lesson.subject} (${lesson.time})\n`;
                }
            });
            text += `\n`;
        }
        
        text += `🧹 *JADWAL PIKET*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        const fullPiket = schoolData.getFullPiket();
        for (const [day, members] of Object.entries(fullPiket)) {
            text += `📆 *${day.toUpperCase()}:*\n`;
            members.forEach((name, i) => {
                text += `   ${i + 1}. ${name}\n`;
            });
            text += `\n`;
        }
        
        const buttons = [
            { buttonId: `${global.botConfig.prefix}today`, buttonText: { displayText: '📅 Hari Ini' }, type: 1 },
            { buttonId: `${global.botConfig.prefix}tomorrow`, buttonText: { displayText: '📅 Besok' }, type: 1 }
        ];
        
        if (text.length > 4000) {
            const parts = text.match(/[\s\S]{1,4000}/g) || [text];
            for (const part of parts) {
                await sock.sendMessage(from, { text: part });
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            await sock.sendMessage(from, {
                text: text,
                buttons: buttons,
                headerType: 1
            });
        }
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil jadwal lengkap.' });
    }
}

async function cmdSendReminder(sock, from, pushName) {
    await sock.sendMessage(from, { text: '🔄 *Mengirim reminder...*\n\nMohon tunggu sebentar...' });
    
    try {
        await reminderSystem.sendManualReminder();
        
        const text = `✅ *Reminder berhasil dikirim!*\n\n📢 Terkirim ke:\n   • Channel WhatsApp\n   • Grup WhatsApp\n\n⏰ Waktu: ${new Date().toLocaleTimeString('id-ID')}`;
        
        const buttons = [
            { buttonId: `${global.botConfig.prefix}reminder`, buttonText: { displayText: '⏰ Reminder' }, type: 1 },
            { buttonId: `${global.botConfig.prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
    } catch (e) {
        await sock.sendMessage(from, { 
            text: '❌ Gagal mengirim reminder. Coba lagi nanti.' 
        });
    }
}

async function cmdReminderMenu(sock, from) {
    const prefix = global.botConfig.prefix;
    const text = `╔══════════════════════════╗\n` +
                 `║  ⏰ SISTEM REMINDER     ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `📋 *Status:* 🟢 AKTIF\n\n` +
                 `🕐 *Jadwal Kirim (3x sehari):*\n` +
                 `   🌅 Siang : 12:00 WIB\n` +
                 `   ☀️ Sore  : 16:00 WIB\n` +
                 `   🌙 Malam : 20:00 WIB\n\n` +
                 `📅 *Hari Kirim:*\n` +
                 `   Senin - Jumat (H-1)\n` +
                 `   Sabtu & Minggu libur\n\n` +
                 `📢 *Target Kirim:*\n` +
                 `   • Channel WhatsApp\n` +
                 `   • Grup WhatsApp\n\n` +
                 `💡 *Command terkait:*\n` +
                 `   ${prefix}tomorrow - Lihat reminder\n` +
                 `   ${prefix}sendreminder - Kirim manual`;
    
    const buttons = [
        { buttonId: `${prefix}tomorrow`, buttonText: { displayText: '📅 Besok' }, type: 1 },
        { buttonId: `${prefix}sendreminder`, buttonText: { displayText: '📤 Kirim' }, type: 1 }
    ];
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdAlightMotion(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const text = `╔══════════════════════════╗\n` +
                     `║  ✨ ALIGHT MOTION GEN   ║\n` +
                     `║    PREMIUM GENERATOR    ║\n` +
                     `╚══════════════════════════╝\n\n` +
                     `🎬 *Generate Alight Motion Premium*\n` +
                     `📅 *Durasi:* 1 Tahun\n\n` +
                     `📌 *Cara Penggunaan:*\n\n` +
                     `*Step 1 - Kirim Email:*\n` +
                     `${prefix}alight email@gmail.com\n\n` +
                     `*Step 2 - Verifikasi:*\n` +
                     `${prefix}alight email@gmail.com link_raw\n\n` +
                     `💡 *Contoh Step 1:*\n` +
                     `${prefix}alight user@gmail.com\n\n` +
                     `💡 *Contoh Step 2:*\n` +
                     `${prefix}alight user@gmail.com https://alightcreative.com/verify?code=xxx`;
        
        const buttons = [
            { buttonId: `${prefix}alight help`, buttonText: { displayText: '📖 Bantuan' }, type: 1 },
            { buttonId: `${prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
        return;
    }

    if (args.length === 1) {
        const email = args[0];
        
        if (!email.includes('@') || !email.includes('.')) {
            await sock.sendMessage(from, {
                text: '❌ *Email tidak valid!*\n\nFormat: nama@domain.com\n\nContoh: ${prefix}alight user@gmail.com'
            });
            return;
        }

        await sock.sendMessage(from, { 
            text: '🔄 *Mengirim magic link...*\n\n📧 Email: ${email}\n\n⏳ Mohon tunggu sebentar...'
        });

        try {
            const result = await alightMotion(email);

            if (result.success) {
                const text = `✅ *Magic Link Terkirim!*\n\n📧 *Email:* ${email}\n📝 *Order Code:* ${result.orderCode || 'N/A'}\n\n📌 *LANGKAH SELANJUTNYA:*\n\n1️⃣ Buka inbox email kamu (cek folder Spam juga)\n2️⃣ Cari email dari "Alight Motion" / "Alight Creative"\n3️⃣ Tekan-tahan tombol "Login ke Alight Creative"\n4️⃣ Pilih "Salin URL" (jangan klik langsung!)\n5️⃣ Kirim link yang dicopy dengan command:\n   ${prefix}alight ${email} <link>\n\n⚠️ *PENTING:* Jangan klik link langsung,\ncopy link-nya saja!`;
                
                const buttons = [
                    { buttonId: `${prefix}alight help`, buttonText: { displayText: '📖 Bantuan' }, type: 1 }
                ];
                
                await sock.sendMessage(from, {
                    text: text,
                    buttons: buttons,
                    headerType: 1
                });
            } else {
                await sock.sendMessage(from, {
                    text: `❌ *Gagal Mengirim!*\n\nError: ${result.error}\n\n💡 Pastikan email valid dan coba lagi.`
                });
            }
        } catch (err) {
            await sock.sendMessage(from, {
                text: `❌ *Error:* ${err.message}\n\nSilakan coba lagi nanti atau hubungi owner.`
            });
        }
        return;
    }

    if (args.length >= 2) {
        const email = args[0];
        const rawLink = args.slice(1).join(' ');

        await sock.sendMessage(from, { 
            text: '🔄 *Memverifikasi akun...*\n\n📧 Email: ${email}\n⏳ Mohon tunggu sebentar...'
        });

        try {
            const result = await alightMotion(email, rawLink);

            if (result.success) {
                const text = `╔══════════════════════════╗\n` +
                            `║  ✅ PREMIUM BERHASIL!   ║\n` +
                            `╚══════════════════════════╝\n\n` +
                            `📧 *Email:* ${email}\n` +
                            `⭐ *Status:* PREMIUM\n` +
                            `📅 *Durasi:* 1 Tahun\n` +
                            `🔑 *oobCode:* ${result.oobCode || 'N/A'}\n\n` +
                            `🎉 *Selamat!* Akun Alight Motion kamu\n` +
                            `sekarang sudah PREMIUM!\n\n` +
                            `📱 Silakan login di aplikasi Alight Motion\n` +
                            `menggunakan email ${email}\n\n` +
                            `💡 Simpan oobCode untuk backup.`;
                
                const buttons = [
                    { buttonId: `${prefix}alight help`, buttonText: { displayText: '📖 Bantuan' }, type: 1 },
                    { buttonId: `${prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
                ];
                
                await sock.sendMessage(from, {
                    text: text,
                    buttons: buttons,
                    headerType: 1
                });
            } else {
                await sock.sendMessage(from, {
                    text: `❌ *Verifikasi Gagal!*\n\nError: ${result.error}\n\n💡 *Tips:*\n• Pastikan link yang dicopy benar\n• Link hanya bisa dipakai 1x\n• Coba kirim ulang magic link\n\n🔄 Kirim ulang: ${prefix}alight ${email}`
                });
            }
        } catch (err) {
            await sock.sendMessage(from, {
                text: `❌ *Error:* ${err.message}\n\nSilakan coba lagi nanti atau hubungi owner.`
            });
        }
        return;
    }
}

async function cmdSongFess(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const text = `╔══════════════════════════╗\n` +
                     `║    🎵 S O N G F E S S   ║\n` +
                     `╚══════════════════════════╝\n\n` +
                     `📌 *Cara Pakai SongFess:*\n\n` +
                     `*Format 1 - Judul + Pesan:*\n` +
                     `${prefix}songfess judul lagu | pesan kamu\n\n` +
                     `*Format 2 - Judul aja:*\n` +
                     `${prefix}songfess judul lagu\n\n` +
                     `💡 *Contoh:*\n` +
                     `${prefix}songfess Night Changes | lagu ini bikin nangis 😭\n` +
                     `${prefix}songfess Sempurna\n\n` +
                     `🎵 SongFess akan dikirim ke channel!\n` +
                     `🕐 Delay: ~5 menit (antrian)`;
        
        const buttons = [
            { buttonId: `${prefix}songfess stats`, buttonText: { displayText: '📊 Stats' }, type: 1 },
            { buttonId: `${prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
        return;
    }

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

    const fullArgs = args.join(' ');
    const parts = fullArgs.split('|').map(p => p.trim());
    
    const songTitle = parts[0] || '';
    const songMessage = parts[1] || '';
    
    if (!songTitle) {
        await sock.sendMessage(from, { text: '❌ Judul lagu tidak boleh kosong!' });
        return;
    }

    if (songTitle.length > 100) {
        await sock.sendMessage(from, { text: '❌ Judul lagu maksimal 100 karakter!' });
        return;
    }
    
    if (songMessage.length > 500) {
        await sock.sendMessage(from, { text: '❌ Pesan maksimal 500 karakter!' });
        return;
    }

    const anonId = `#${from.split('@')[0].slice(-4)}`;

    const songFessData = {
        title: songTitle,
        message: songMessage,
        sender: pushName,
        anonId: anonId,
        timestamp: Date.now()
    };

    const queueId = addSongFess(songFessData);

    const confirmText = `╔══════════════════════════╗\n` +
                        `║  🎵 SONGFESS TERKIRIM  ║\n` +
                        `╚══════════════════════════╝\n\n` +
                        `🎶 *Judul:* ${songTitle}\n` +
                        (songMessage ? `💬 *Pesan:* ${songMessage}\n` : '') +
                        `🆔 *ID:* ${queueId}\n` +
                        `👤 *Anonim ID:* ${anonId}\n\n` +
                        `⏳ SongFess kamu akan dikirim\n` +
                        `ke channel dalam ~5 menit.\n\n` +
                        `💡 *Info:* Identitas kamu dirahasiakan.`;
    
    await sock.sendMessage(from, { text: confirmText });
}

async function cmdConfess(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const text = `╔══════════════════════════╗\n` +
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
                     `• Maksimal 5x per hari`;
        
        const buttons = [
            { buttonId: `${prefix}menfess stats`, buttonText: { displayText: '📊 Stats' }, type: 1 },
            { buttonId: `${prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
        return;
    }

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

    const fullArgs = args.join(' ');
    const parts = fullArgs.split('|').map(p => p.trim());
    
    const targetNumber = parts[0]?.replace(/[^0-9]/g, '') || '';
    const confessMessage = parts.slice(1).join('|').trim();
    
    if (!targetNumber || targetNumber.length < 10) {
        await sock.sendMessage(from, { 
            text: '❌ *Nomor tujuan tidak valid!*\n\nFormat: 628xxxxxxxxxx\n\nContoh: ${prefix}menfess 628123456789|pesan'
        });
        return;
    }

    if (!confessMessage) {
        await sock.sendMessage(from, { 
            text: '❌ *Pesan tidak boleh kosong!*\n\nFormat: ${prefix}menfess nomor|pesan\n\nContoh: ${prefix}menfess 628123456789|hai!'
        });
        return;
    }

    if (confessMessage.length > 1000) {
        await sock.sendMessage(from, { text: '❌ Pesan maksimal 1000 karakter!' });
        return;
    }

    const senderNumber = from.split('@')[0];
    const queue = getConfessQueue();
    const senderConfesses = queue.filter(c => c.senderNumber === senderNumber);
    
    if (senderConfesses.length >= 5) {
        await sock.sendMessage(from, { 
            text: '❌ *Limit Harian Tercapai!*\n\nKamu sudah mengirim 5 menfess hari ini.\nSilakan coba lagi besok.'
        });
        return;
    }

    if (targetNumber === senderNumber || targetNumber === senderNumber.replace(/^62/, '0')) {
        await sock.sendMessage(from, { 
            text: '😅 *Tidak bisa kirim ke diri sendiri!*\n\nMenfess hanya untuk mengirim ke orang lain.'
        });
        return;
    }

    const formattedTarget = targetNumber.startsWith('62') ? targetNumber : 
                           targetNumber.startsWith('0') ? '62' + targetNumber.slice(1) : 
                           '62' + targetNumber;
    
    const targetJid = formattedTarget + '@s.whatsapp.net';

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
    
    await sock.sendMessage(from, { text: confirmText });

    try {
        const targetText = `╔══════════════════════════╗\n` +
                          `║  💌 KAMU DAPAT MENFESS! ║\n` +
                          `╚══════════════════════════╝\n\n` +
                          `💌 *Pesan Rahasia Untukmu:*\n\n` +
                          `_"${confessMessage}"_\n\n` +
                          `━━━━━━━━━━━━━━━━━━━━━━\n` +
                          `👤 *Dari:* Anonim #${senderNumber.slice(-4)}\n` +
                          `🕐 *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n` +
                          `💡 Seseorang mengirimkan pesan\n` +
                          `ini untukmu secara anonim.\n\n` +
                          `🔒 Identitas pengirim dirahasiakan.\n\n` +
                          `✨ Mau balas? Kirim menfess juga!\n` +
                          `Ketik: ${prefix}menfess <nomor>|<pesan>`;

        await sock.sendMessage(targetJid, { text: targetText });

        removeConfess(confessId, true);

        setTimeout(async () => {
            await sock.sendMessage(from, {
                text: `✅ *Menfess Terkirim!*\n\nPesan kamu (#${confessId}) sudah\nberhasil dikirim ke tujuan.\n\n🕐 ${new Date().toLocaleTimeString('id-ID')}`
            });
        }, 2000);

    } catch (err) {
        console.error('Gagal kirim menfess:', err.message);
        
        removeConfess(confessId, false);

        await sock.sendMessage(from, {
            text: `❌ *Gagal Mengirim Menfess!*\n\nPesan tidak bisa dikirim ke nomor tujuan.\n\nKemungkinan:\n• Nomor tidak terdaftar di WhatsApp\n• Nomor salah\n• Pengguna memblokir bot\n\n💡 Coba cek kembali nomor tujuannya.`
        });
    }
}

async function cmdSticker(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    const hasFfmpeg = await checkFfmpeg();
    if (!hasFfmpeg) {
        await sock.sendMessage(from, {
            text: '❌ *FFmpeg tidak terinstall!*\n\nSticker maker membutuhkan FFmpeg.\nSilakan install FFmpeg terlebih dahulu.'
        });
        return;
    }
    
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
    
    if (args.includes('help') || args.includes('?')) {
        const text = `╔══════════════════════════╗\n` +
                     `║  📖 BANTUAN STICKER    ║\n` +
                     `╚══════════════════════════╝\n\n` +
                     `🎨 *STICKER MAKER HELP*\n\n` +
                     `*Command Dasar:*\n` +
                     `${prefix}s - Buat sticker (full)\n\n` +
                     `*Style Sticker:*\n` +
                     `${prefix}s full - Sticker full\n` +
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
                     `• File: Maks 10 MB`;
        
        const buttons = [
            { buttonId: `${prefix}s`, buttonText: { displayText: '🎨 Buat Sticker' }, type: 1 },
            { buttonId: `${prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
        return;
    }
    
    const msg = messageInfo.message;
    let hasMedia = false;
    let mediaType = '';
    let mediaDuration = 0;
    
    if (msg.imageMessage) {
        hasMedia = true;
        mediaType = 'image';
    } else if (msg.videoMessage) {
        hasMedia = true;
        mediaType = 'video';
        mediaDuration = msg.videoMessage.seconds || 0;
    }
    
    if (!hasMedia && msg.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = msg.extendedTextMessage.contextInfo.quotedMessage;
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
        const text = `╔══════════════════════════╗\n` +
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
                     `🎨 *Style:* full, circle, rounded\n` +
                     `📏 Video: Maks 15 detik\n` +
                     `📦 File: Maks 10 MB\n\n` +
                     `💡 Reply gambar → ${prefix}s circle`;
        
        const buttons = [
            { buttonId: `${prefix}s help`, buttonText: { displayText: '📖 Bantuan' }, type: 1 },
            { buttonId: `${prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
        return;
    }
    
    if (mediaType === 'video' && mediaDuration > STICKER_CONFIG.MAX_VIDEO_DURATION) {
        await sock.sendMessage(from, {
            text: `❌ *Video terlalu panjang!*\n\n⏱️ Durasi: ${formatDuration(mediaDuration)}\n📏 Maksimal: ${STICKER_CONFIG.MAX_VIDEO_DURATION} detik`
        });
        return;
    }
    
    await sock.sendMessage(from, { 
        text: '🔄 *Membuat sticker...*\n\n📸 Tipe: ${mediaType === 'image' ? 'Gambar' : 'Video'}\n🎨 Style: ${stickerType}\n\n⏳ Mohon tunggu sebentar...'
    });
    
    try {
        const result = await createSticker(sock, messageInfo, {
            type: stickerType,
            pack: packName,
            author: authorName
        });
        
        await sock.sendMessage(from, { sticker: result.sticker });
        
        setTimeout(async () => {
            const info = `✅ *Sticker Berhasil!*\n\n📸 Tipe: ${result.type === 'animated' ? '🎬 Animasi' : '🖼️ Statis'}\n🎨 Style: ${stickerType === 'full' ? '📱 Full' : stickerType === 'circle' ? '⭕ Circle' : '🔲 Rounded'}`;
            
            await sock.sendMessage(from, { text: info });
        }, 500);
        
    } catch (err) {
        console.error('Sticker Error:', err.message);
        await sock.sendMessage(from, {
            text: `❌ *Gagal membuat sticker!*\n\nError: ${err.message}\n\n💡 Pastikan gambar/video tidak rusak dan ukuran tidak lebih dari 10 MB.`
        });
    }
}

async function cmdSearch(sock, from, args, prefix) {
    if (args.length === 0) {
        const text = `🔍 *COMMAND SEARCH*\n\nCari command berdasarkan kata kunci.\n\n📌 *Cara pakai:*\n${prefix}search <kata kunci>\n\n💡 *Contoh:*\n${prefix}search jadwal\n${prefix}cari piket`;
        
        await sock.sendMessage(from, { text });
        return;
    }

    const query = args.join(' ').toLowerCase();
    const suggestions = allCommands.filter(cmd => cmd.includes(query));
    
    if (suggestions.length === 0) {
        await sock.sendMessage(from, {
            text: `🔍 *Pencarian: "${query}"*\n\n❌ Tidak ada command yang cocok.\n\n💡 Coba kata kunci lain atau\nketik *${prefix}menu* untuk lihat semua.`
        });
        return;
    }

    let text = `╔══════════════════════════╗\n`;
    text += `║  🔍 SEARCH RESULTS     ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    text += `🔎 *Pencarian:* "${query}"\n`;
    text += `📊 *Ditemukan:* ${suggestions.length} command\n\n`;

    suggestions.slice(0, 20).forEach((cmd, i) => {
        text += `${i + 1}. ${prefix}${cmd}\n`;
    });

    if (suggestions.length > 20) {
        text += `\n... dan ${suggestions.length - 20} command lainnya`;
    }

    await sock.sendMessage(from, { text });
}

async function cmdAddPR(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const text = `📚 *TAMBAH PR/TUGAS*\n\n📌 *Format:*\n${prefix}addpr <mapel>|<deskripsi>|<deadline>\n\n💡 *Contoh:*\n${prefix}addpr Matematika|Halaman 100-101|2024-12-20\n${prefix}addpr IPA|Buat laporan praktikum|2024-12-25\n\n📎 *Bisa juga reply:*\nReply gambar/file/link → ${prefix}addpr mapel|deskripsi|deadline\n\n📅 Format deadline: YYYY-MM-DD`;
        
        await sock.sendMessage(from, { text });
        return;
    }
    
    const fullArgs = args.join(' ');
    const parts = fullArgs.split('|').map(p => p.trim());
    
    const subject = parts[0] || 'Umum';
    const description = parts[1] || '';
    const deadline = parts[2] || null;
    
    if (deadline) {
        const deadlineRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!deadlineRegex.test(deadline)) {
            await sock.sendMessage(from, {
                text: '❌ Format deadline salah!\n\nGunakan format: YYYY-MM-DD\nContoh: 2024-12-20'
            });
            return;
        }
    }
    
    let media = null;
    const msg = messageInfo.message;
    
    if (msg?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = msg.extendedTextMessage.contextInfo.quotedMessage;
        
        if (quoted.imageMessage) {
            media = { type: 'image', filename: 'image.jpg' };
        } else if (quoted.videoMessage) {
            media = { type: 'video', filename: 'video.mp4' };
        } else if (quoted.audioMessage) {
            media = { type: 'audio', filename: 'audio.mp3' };
        } else if (quoted.documentMessage) {
            media = { type: 'document', filename: quoted.documentMessage.fileName || 'file' };
        } else if (quoted.extendedTextMessage?.text) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = quoted.extendedTextMessage.text.match(urlRegex);
            if (urls) {
                media = { type: 'link', url: urls[0] };
            }
        }
    }
    
    const pr = addPR({
        subject,
        description,
        deadline,
        addedBy: pushName,
        media
    });
    
    const targets = getAllTargets();
    const prDetail = formatPRDetail(pr);
    
    for (const ch of targets.channels) {
        try {
            await sock.sendMessage(ch.id, { text: `📢 *PR BARU!*\n\n${prDetail}` });
        } catch (e) {}
    }
    
    for (const gr of targets.groups) {
        try {
            await sock.sendMessage(gr.id, { text: `📢 *PR BARU!*\n\n${prDetail}` });
        } catch (e) {}
    }
    
    const buttons = [
        { buttonId: `${prefix}pr`, buttonText: { displayText: '📚 Daftar PR' }, type: 1 },
        { buttonId: `${prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
    ];
    
    await sock.sendMessage(from, {
        text: `✅ *PR Berhasil Ditambahkan!*\n\n${prDetail}`,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdDeletePR(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `❌ *HAPUS PR*\n\n📌 Format: ${prefix}delpr <id>\n\n💡 Contoh: ${prefix}delpr PR241201ABC\n\n🔍 Cari ID: ${prefix}pr (lihat daftar PR)`
        });
        return;
    }
    
    const id = args[0];
    const pr = getPRById(id);
    
    if (!pr) {
        await sock.sendMessage(from, {
            text: `❌ PR dengan ID *${id}* tidak ditemukan.\n\n🔍 Cek daftar PR: ${prefix}pr`
        });
        return;
    }
    
    if (deletePR(id)) {
        await sock.sendMessage(from, {
            text: `✅ PR berhasil dihapus!\n\n📌 ${pr.subject}\n🆔 ${pr.id}`
        });
    } else {
        await sock.sendMessage(from, { text: '❌ Gagal menghapus PR.' });
    }
}

async function cmdListPR(sock, from, args) {
    let filter = 'active';
    let page = 1;
    
    if (args.includes('all')) filter = 'all';
    else if (args.includes('expired')) filter = 'expired';
    
    const pageArg = args.find(a => !isNaN(a));
    if (pageArg) page = parseInt(pageArg);
    
    const prs = getPRs(filter);
    const result = formatPRList(prs, page);
    
    const buttons = [
        { buttonId: `${global.botConfig.prefix}addpr`, buttonText: { displayText: '📝 Tambah PR' }, type: 1 },
        { buttonId: `${global.botConfig.prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
    ];
    
    await sock.sendMessage(from, {
        text: result.text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdAddPartner(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `⭐ *TAMBAH PARTNER*\n\n📌 Format: ${prefix}addpartner <nomor>|<nama>\n\n💡 Contoh:\n${prefix}addpartner 628123456789|Budi\n${prefix}addpartner 08123456789|Ani`
        });
        return;
    }
    
    const fullArgs = args.join(' ');
    const parts = fullArgs.split('|').map(p => p.trim());
    const number = parts[0]?.replace(/[^0-9]/g, '') || '';
    const name = parts[1] || '';
    
    if (!number || number.length < 10) {
        await sock.sendMessage(from, { text: '❌ Nomor tidak valid!' });
        return;
    }
    
    const result = addPartner(number, name, pushName);
    
    if (result.success) {
        await sock.sendMessage(from, {
            text: `✅ *Partner Berhasil Ditambahkan!*\n\n👤 Nama: ${result.partner.name}\n📱 Nomor: ${result.partner.number}\n🕐 Ditambah: ${new Date().toLocaleString('id-ID')}`
        });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdRemovePartner(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `❌ *HAPUS PARTNER*\n\n📌 Format: ${prefix}delpartner <nomor>\n\n💡 Contoh: ${prefix}delpartner 628123456789`
        });
        return;
    }
    
    const number = args[0].replace(/[^0-9]/g, '');
    const result = removePartner(number);
    
    if (result.success) {
        await sock.sendMessage(from, {
            text: `✅ Partner berhasil dihapus!\n\n👤 ${result.partner.name}\n📱 ${result.partner.number}`
        });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdListPartners(sock, from) {
    const partners = listPartners();
    
    if (partners.length === 0) {
        await sock.sendMessage(from, { text: '⭐ *Belum ada partner terdaftar.*' });
        return;
    }
    
    let text = `╔══════════════════════════╗\n`;
    text += `║  ⭐ DAFTAR PARTNER     ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    
    partners.forEach((p, i) => {
        text += `${i + 1}. 👤 ${p.name}\n`;
        text += `   📱 ${p.number}\n`;
        text += `   📅 ${new Date(p.addedAt).toLocaleDateString('id-ID')}\n\n`;
    });
    
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Total: ${partners.length} partner`;
    
    const buttons = [
        { buttonId: `${global.botConfig.prefix}addpartner`, buttonText: { displayText: '⭐ Tambah' }, type: 1 },
        { buttonId: `${global.botConfig.prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
    ];
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdAddChannel(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `📢 *TAMBAH CHANNEL*\n\n📌 Format: ${prefix}addch <channel_id>|<nama>\n\n💡 Cara dapat ID:\n1. Masuk ke channel\n2. Ketik ${prefix}getid\n3. Copy Channel ID\n\nContoh: ${prefix}addch 120363xxxxx@newsletter|Channel Kelas`
        });
        return;
    }
    
    const fullArgs = args.join(' ');
    const parts = fullArgs.split('|').map(p => p.trim());
    const channelId = parts[0] || '';
    const name = parts[1] || '';
    
    const result = addChannel(channelId, name, pushName);
    
    if (result.success) {
        await sock.sendMessage(from, {
            text: `✅ *Channel Berhasil Ditambahkan!*\n\n📢 ${result.channel.name}\n🆔 ${result.channel.id}\n\n📌 Channel ini akan menerima:\n• Reminder otomatis\n• PR/Tugas baru\n• Pengumuman`
        });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdRemoveChannel(sock, from, args, pushName) {
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `❌ Format: ${global.botConfig.prefix}delch <channel_id>`
        });
        return;
    }
    
    const result = removeChannel(args[0]);
    
    if (result.success) {
        await sock.sendMessage(from, { text: '✅ Channel berhasil dihapus!' });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdListChannels(sock, from) {
    const channels = getChannels();
    
    if (channels.length === 0) {
        await sock.sendMessage(from, { text: '📢 *Belum ada channel terdaftar.*' });
        return;
    }
    
    let text = `╔══════════════════════════╗\n`;
    text += `║  📢 DAFTAR CHANNEL     ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    
    channels.forEach((ch, i) => {
        text += `${i + 1}. 📢 ${ch.name}\n`;
        text += `   🆔 \`${ch.id}\`\n\n`;
    });
    
    const buttons = [
        { buttonId: `${global.botConfig.prefix}addch`, buttonText: { displayText: '📢 Tambah' }, type: 1 },
        { buttonId: `${global.botConfig.prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
    ];
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdAddGroupCmd(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `👥 *TAMBAH GROUP*\n\n📌 Format: ${prefix}addgroup <group_id>|<nama>\n\n💡 Cara dapat ID:\n1. Masuk ke group\n2. Ketik ${prefix}getid\n3. Copy Group ID\n\nContoh: ${prefix}addgroup 120363xxxxx@g.us|Grup Kelas`
        });
        return;
    }
    
    const fullArgs = args.join(' ');
    const parts = fullArgs.split('|').map(p => p.trim());
    const groupId = parts[0] || '';
    const name = parts[1] || '';
    
    const result = addGroup(groupId, name, pushName);
    
    if (result.success) {
        await sock.sendMessage(from, {
            text: `✅ *Group Berhasil Ditambahkan!*\n\n👥 ${result.group.name}\n🆔 ${result.group.id}`
        });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdRemoveGroupCmd(sock, from, args, pushName) {
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `❌ Format: ${global.botConfig.prefix}delgroup <group_id>`
        });
        return;
    }
    
    const result = removeGroup(args[0]);
    
    if (result.success) {
        await sock.sendMessage(from, { text: '✅ Group berhasil dihapus!' });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdListGroups(sock, from) {
    const groups = getGroups();
    
    if (groups.length === 0) {
        await sock.sendMessage(from, { text: '👥 *Belum ada group terdaftar.*' });
        return;
    }
    
    let text = `╔══════════════════════════╗\n`;
    text += `║  👥 DAFTAR GROUP       ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    
    groups.forEach((gr, i) => {
        text += `${i + 1}. 👥 ${gr.name}\n`;
        text += `   🆔 \`${gr.id}\`\n\n`;
    });
    
    const buttons = [
        { buttonId: `${global.botConfig.prefix}addgroup`, buttonText: { displayText: '👥 Tambah' }, type: 1 },
        { buttonId: `${global.botConfig.prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
    ];
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdBroadcast(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `📢 *BROADCAST*\n\n📌 Format: ${prefix}bc <pesan>\n\n💡 Bisa reply gambar/video untuk broadcast media.\n\nPesan akan dikirim ke semua channel & group terdaftar.`
        });
        return;
    }
    
    const message = args.join(' ');
    const targets = getAllTargets();
    let sentCount = 0;
    let failCount = 0;
    
    for (const ch of targets.channels) {
        try {
            await sock.sendMessage(ch.id, { 
                text: `📢 *BROADCAST*\n\n${message}\n\n━━━━━━━━━━━━━━━━━━━━━━\n👑 Dari: ${global.botConfig.owner}`
            });
            sentCount++;
        } catch (e) {
            failCount++;
        }
    }
    
    for (const gr of targets.groups) {
        try {
            await sock.sendMessage(gr.id, { 
                text: `📢 *BROADCAST*\n\n${message}\n\n━━━━━━━━━━━━━━━━━━━━━━\n👑 Dari: ${global.botConfig.owner}`
            });
            sentCount++;
        } catch (e) {
            failCount++;
        }
    }
    
    await sock.sendMessage(from, {
        text: `✅ *Broadcast Selesai!*\n\n📊 Terkirim: ${sentCount}\n❌ Gagal: ${failCount}\n📢 Total target: ${targets.channels.length + targets.groups.length}`
    });
}

async function cmdGetId(sock, from, messageInfo) {
    const prefix = global.botConfig.prefix;
    const msg = messageInfo.message;
    
    const chatType = messageInfo.isChannel ? 'channel' : 
                     messageInfo.isGroup ? 'group' : 'private';
    
    let taggedUsers = [];
    
    if (msg?.extendedTextMessage?.contextInfo?.mentionedJid) {
        taggedUsers = msg.extendedTextMessage.contextInfo.mentionedJid;
    }
    
    if (msg?.message?.extendedTextMessage?.contextInfo?.participant) {
        const participant = msg.message.extendedTextMessage.contextInfo.participant;
        if (participant && !taggedUsers.includes(participant)) {
            taggedUsers.push(participant);
        }
    }
    
    if (taggedUsers.length > 0) {
        if (taggedUsers.length === 1) {
            const userJid = taggedUsers[0];
            const userId = userJid.split('@')[0];
            const domain = userJid.split('@')[1] || 's.whatsapp.net';
            
            let formattedNumber = userId;
            if (userId.startsWith('62')) {
                formattedNumber = '0' + userId.slice(2);
            }
            
            const text = `╔══════════════════════════╗\n` +
                         `║  👤 TAGGED USER ID     ║\n` +
                         `╚══════════════════════════╝\n\n` +
                         `👤 *User yang di-tag:*\n\n` +
                         `┌─────────────────────────┐\n` +
                         `│  *FULL JID*              │\n` +
                         `│  \`${userJid}\`\n` +
                         `├─────────────────────────┤\n` +
                         `│  *USER ID*               │\n` +
                         `│  \`${userId}\`\n` +
                         `├─────────────────────────┤\n` +
                         `│  *DOMAIN*                │\n` +
                         `│  @${domain}\n` +
                         `├─────────────────────────┤\n` +
                         `│  *NO. WA*                │\n` +
                         `│  ${formattedNumber}\n` +
                         `└─────────────────────────┘\n\n` +
                         `💡 *Gunakan untuk:*\n` +
                         `• Kirim Menfess: ${prefix}menfess ${formattedNumber}|pesan`;

            await sock.sendMessage(from, { text: text, mentions: [userJid] });
        } else {
            let text = `╔══════════════════════════╗\n` +
                       `║  👥 TAGGED USERS ID    ║\n` +
                       `╚══════════════════════════╝\n\n` +
                       `👥 *${taggedUsers.length} User di-tag:*\n\n`;
            
            text += `┌─────────────────────────┐\n`;
            
            taggedUsers.forEach((userJid, i) => {
                const userId = userJid.split('@')[0];
                let formattedNumber = userId;
                if (userId.startsWith('62')) {
                    formattedNumber = '0' + userId.slice(2);
                }
                
                text += `├─────────────────────────┤\n`;
                text += `│  *User ${i + 1}:* ${' '.repeat(14)}│\n`;
                text += `│  No: ${formattedNumber.padEnd(20)} │\n`;
                text += `│  ID: \`${userId}\`\n`;
            });
            
            text += `└─────────────────────────┘\n\n`;
            text += `💡 Gunakan ID di atas untuk kirim Menfess.`;
            
            await sock.sendMessage(from, { text: text, mentions: taggedUsers });
        }
        return;
    }
    
    switch(chatType) {
        case 'channel': {
            const channelJid = from;
            const channelId = channelJid.split('@')[0];
            const domain = channelJid.split('@')[1] || 'newsletter';
            
            const text = `╔══════════════════════════╗\n` +
                         `║  📢 CHANNEL ID INFO    ║\n` +
                         `╚══════════════════════════╝\n\n` +
                         `📢 *Tipe:* Channel WhatsApp\n\n` +
                         `┌─────────────────────────┐\n` +
                         `│ *FULL JID*              │\n` +
                         `│ \`${channelJid}\`\n` +
                         `├─────────────────────────┤\n` +
                         `│ *CHANNEL ID*            │\n` +
                         `│ \`${channelId}\`\n` +
                         `├─────────────────────────┤\n` +
                         `│ *DOMAIN*                │\n` +
                         `│ @${domain}\n` +
                         `└─────────────────────────┘\n\n` +
                         `📝 Konfigurasi: channelId: "${channelJid}"`;
            
            await sock.sendMessage(from, { text });
            break;
        }
        case 'group': {
            const groupJid = from;
            const groupId = groupJid.split('@')[0];
            
            let groupMeta = null;
            try {
                groupMeta = await sock.groupMetadata(from);
            } catch (e) {}
            
            const groupName = groupMeta?.subject || 'Unknown';
            const groupOwner = groupMeta?.owner || 'Unknown';
            const memberCount = groupMeta?.participants?.length || 0;
            
            let text = `╔══════════════════════════╗\n` +
                       `║  👥 GROUP ID INFO      ║\n` +
                       `╚══════════════════════════╝\n\n` +
                       `👥 *Tipe:* Group WhatsApp\n\n` +
                       `┌─────────────────────────┐\n` +
                       `│  Nama: ${groupName.slice(0, 18).padEnd(19)} │\n` +
                       `│  Member: ${memberCount.toString().padEnd(17)} │\n` +
                       `├─────────────────────────┤\n` +
                       `│  *FULL JID*              │\n` +
                       `│  \`${groupJid}\`\n` +
                       `├─────────────────────────┤\n` +
                       `│  *GROUP ID*              │\n` +
                       `│  \`${groupId}\`\n` +
                       `├─────────────────────────┤\n` +
                       `│  *OWNER JID*             │\n` +
                       `│  \`${groupOwner}\`\n` +
                       `└─────────────────────────┘\n\n` +
                       `📝 Konfigurasi: groupId: "${groupJid}"`;
            
            await sock.sendMessage(from, { text });
            break;
        }
        default: {
            const userJid = from;
            const userId = userJid.split('@')[0];
            
            let formattedNumber = userId;
            if (userId.startsWith('62')) {
                formattedNumber = '0' + userId.slice(2);
            }
            
            const text = `╔══════════════════════════╗\n` +
                         `║  👤 USER ID INFO       ║\n` +
                         `╚══════════════════════════╝\n\n` +
                         `👤 *Tipe:* Private Chat\n\n` +
                         `┌─────────────────────────┐\n` +
                         `│  Nama: ${pushName.slice(0, 18).padEnd(19)} │\n` +
                         `│  No: ${formattedNumber.padEnd(20)} │\n` +
                         `├─────────────────────────┤\n` +
                         `│  *FULL JID*              │\n` +
                         `│  \`${userJid}\`\n` +
                         `├─────────────────────────┤\n` +
                         `│  *USER ID*               │\n` +
                         `│  \`${userId}\`\n` +
                         `├─────────────────────────┤\n` +
                         `│  *FORMAT NO. WA*         │\n` +
                         `│  ${formattedNumber}\n` +
                         `└─────────────────────────┘`;
            
            await sock.sendMessage(from, { text });
        }
    }
}

async function cmdPing(sock, from) {
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;
    
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;
    
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const text = `╔══════════════════════════╗\n` +
                 `║     🏓 P I N G !       ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `🟢 *Bot Status:* Online\n\n` +
                 `📊 *Response Time:* ${responseTime}ms\n` +
                 `💾 *Memory:* ${memMB} MB\n` +
                 `⏱️ *Uptime:* ${days}d ${hours}h ${minutes}m ${seconds}s\n\n` +
                 `📅 *Server Time:*\n` +
                 `   ${new Date().toLocaleString('id-ID')}\n\n` +
                 `🤖 ${global.botConfig.name} v${global.botConfig.version}\n` +
                 `   by ${global.botConfig.owner}`;
    
    const buttons = [
        { buttonId: `${global.botConfig.prefix}info`, buttonText: { displayText: '📋 Menu' }, type: 1 },
        { buttonId: `${global.botConfig.prefix}tqto`, buttonText: { displayText: '🙏 Credits' }, type: 1 }
    ];
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdMyLevel(sock, from, pushName, senderNumber) {
    const level = getUserLevel(senderNumber, pushName);
    const levelName = getLevelName(level);
    const permissions = getPermissionList(level);
    
    let text = `╔══════════════════════════╗\n` +
               `║  👤 LEVEL INFO         ║\n` +
               `╚══════════════════════════╝\n\n` +
               `👤 Nama: ${pushName}\n` +
               `⭐ Level: ${levelName}\n` +
               `🔢 Level ID: ${level}\n\n` +
               `📋 *Command yang tersedia:*\n` +
               `━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    const categories = {
        '📋 Info': [],
        '📅 Jadwal': [],
        '⏰ Reminder': [],
        '🎬 Alight': [],
        '🎵 SongFess': [],
        '💌 Menfess': [],
        '🎨 Sticker': [],
        '🎵 Converter': [],
        '📚 PR/Tugas': [],
        '⭐ Partner': [],
        '📢 Channel': [],
        '🛠️ Utility': []
    };
    
    permissions.forEach(perm => {
        if (['info', 'menu', 'help', 'owner', 'walas'].includes(perm)) {
            categories['📋 Info'].push(perm);
        } else if (['today', 'tomorrow', 'mapel', 'piket', 'jadwal'].includes(perm)) {
            categories['📅 Jadwal'].push(perm);
        } else if (['reminder', 'sendreminder'].includes(perm)) {
            categories['⏰ Reminder'].push(perm);
        } else if (['alight', 'alightmotion', 'am'].includes(perm)) {
            categories['🎬 Alight'].push(perm);
        } else if (['songfess', 'sf'].includes(perm)) {
            categories['🎵 SongFess'].push(perm);
        } else if (['menfess', 'confess'].includes(perm)) {
            categories['💌 Menfess'].push(perm);
        } else if (['sticker', 'stiker', 's'].includes(perm)) {
            categories['🎨 Sticker'].push(perm);
        } else if (['toaudio', 'toptt', 'convert'].includes(perm)) {
            categories['🎵 Converter'].push(perm);
        } else if (['addpr', 'delpr', 'pr'].includes(perm)) {
            categories['📚 PR/Tugas'].push(perm);
        } else if (['addpartner', 'delpartner', 'listpartner'].includes(perm)) {
            categories['⭐ Partner'].push(perm);
        } else if (['addch', 'delch', 'addgroup', 'delgroup', 'broadcast'].includes(perm)) {
            categories['📢 Channel'].push(perm);
        } else {
            categories['🛠️ Utility'].push(perm);
        }
    });
    
    for (const [cat, cmds] of Object.entries(categories)) {
        if (cmds.length > 0) {
            text += `${cat}: ${cmds.join(', ')}\n`;
        }
    }
    
    const buttons = [
        { buttonId: `${global.botConfig.prefix}info`, buttonText: { displayText: '📋 Menu' }, type: 1 },
        { buttonId: `${global.botConfig.prefix}partner`, buttonText: { displayText: '⭐ Partner' }, type: 1 }
    ];
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

async function cmdTqto(sock, from) {
    const text = `╔══════════════════════════╗\n` +
                 `║    🙏 SPECIAL THANKS    ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `Terima kasih kepada semua pihak yang telah mendukung dan menjadi bagian dari perjalanan proyek ini.\n\n` +
                 `👑 *ndii (Owner FestiveShopID & Dev NeoGoforward)*\n` +
                 `Terima kasih atas kepercayaan, dukungan, arahan, serta dedikasi yang telah diberikan. Tanpa semua usaha dan komitmen tersebut, proyek ini tidak akan sampai di titik ini.\n\n` +
                 `⭐ *Partner FestiveShopID*\n` +
                 `Terima kasih atas kerja sama, bantuan, dan kontribusi yang telah diberikan. Setiap dukungan yang kalian berikan menjadi bagian penting dalam perkembangan proyek ini.\n\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━\n` +
                 `💻 *Thank You*\n` +
                 `Every line of code tells a story, and every contribution leaves a legacy.`;
    
    const buttons = [
        { buttonId: `${global.botConfig.prefix}owner`, buttonText: { displayText: '👑 Owner' }, type: 1 },
        { buttonId: `${global.botConfig.prefix}listpartner`, buttonText: { displayText: '⭐ Partner' }, type: 1 },
        { buttonId: `${global.botConfig.prefix}info`, buttonText: { displayText: '📋 Menu' }, type: 1 }
    ];
    
    await sock.sendMessage(from, {
        text: text,
        buttons: buttons,
        headerType: 1
    });
}

// ============ CONVERTER FUNCTIONS ============

async function cmdToAudio(sock, from, args, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.includes('help') || args.includes('?')) {
        const text = `🎵 *CONVERT TO AUDIO*\n\n` +
                     `📌 Mengconvert video/audio ke format audio (MP3)\n\n` +
                     `*Cara Pakai:*\n` +
                     `1️⃣ Kirim video/audio ke chat\n` +
                     `2️⃣ Reply video/audio itu\n` +
                     `3️⃣ Ketik ${prefix}toaudio\n\n` +
                     `💡 Contoh: ${prefix}toaudio\n` +
                     `         ${prefix}mp3\n\n` +
                     `📱 Hasilnya akan dikirim sebagai file audio MP3`;
        
        const buttons = [
            { buttonId: `${prefix}toptt`, buttonText: { displayText: '🎤 Voice Note' }, type: 1 },
            { buttonId: `${prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
        return;
    }
    
    const msg = messageInfo.message;
    let mediaBuffer = null;
    let mediaExt = 'mp4';
    
    // Cek apakah ada media di message
    if (msg?.videoMessage) {
        const stream = await sock.downloadMediaMessage(msg);
        mediaBuffer = stream;
        mediaExt = 'mp4';
    } else if (msg?.audioMessage) {
        const stream = await sock.downloadMediaMessage(msg);
        mediaBuffer = stream;
        mediaExt = 'mp3';
    } else if (msg?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = msg.extendedTextMessage.contextInfo.quotedMessage;
        if (quoted?.videoMessage) {
            const stream = await sock.downloadMediaMessage({ 
                ...messageInfo, 
                message: quoted 
            });
            mediaBuffer = stream;
            mediaExt = 'mp4';
        } else if (quoted?.audioMessage) {
            const stream = await sock.downloadMediaMessage({ 
                ...messageInfo, 
                message: quoted 
            });
            mediaBuffer = stream;
            mediaExt = 'mp3';
        }
    }
    
    if (!mediaBuffer) {
        await sock.sendMessage(from, {
            text: `❌ *Tidak ada media ditemukan!*\n\n` +
                  `📌 Kirim atau reply video/audio dengan command:\n` +
                  `${prefix}toaudio\n\n` +
                  `💡 Ketik ${prefix}toaudio help untuk bantuan.`
        });
        return;
    }
    
    await sock.sendMessage(from, { 
        text: '🔄 *Mengconvert ke audio...*\n\n⏳ Mohon tunggu sebentar...' 
    });
    
    try {
        const result = await toAudio(mediaBuffer, mediaExt);
        
        await sock.sendMessage(from, {
            audio: result.data,
            mimetype: 'audio/mpeg',
            fileName: `audio_${Date.now()}.mp3`
        });
        
        setTimeout(async () => {
            await sock.sendMessage(from, { 
                text: '✅ *Audio berhasil di-convert!*\n\n🎵 Audio sudah siap diputar.' 
            });
        }, 500);
        
    } catch (err) {
        console.error('Convert Error:', err);
        await sock.sendMessage(from, {
            text: `❌ *Gagal mengconvert audio!*\n\nError: ${err.message}`
        });
    }
}

async function cmdToPTT(sock, from, args, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.includes('help') || args.includes('?')) {
        const text = `🎤 *CONVERT TO VOICE NOTE*\n\n` +
                     `📌 Mengconvert audio/video ke voice note (PTT)\n\n` +
                     `*Cara Pakai:*\n` +
                     `1️⃣ Kirim audio/video ke chat\n` +
                     `2️⃣ Reply audio/video itu\n` +
                     `3️⃣ Ketik ${prefix}toptt\n\n` +
                     `💡 Contoh: ${prefix}toptt\n` +
                     `         ${prefix}ptt\n\n` +
                     `📱 Hasilnya akan dikirim sebagai voice note`;
        
        const buttons = [
            { buttonId: `${prefix}toaudio`, buttonText: { displayText: '🎵 Audio' }, type: 1 },
            { buttonId: `${prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
        return;
    }
    
    const msg = messageInfo.message;
    let mediaBuffer = null;
    let mediaExt = 'mp4';
    
    if (msg?.videoMessage) {
        const stream = await sock.downloadMediaMessage(msg);
        mediaBuffer = stream;
        mediaExt = 'mp4';
    } else if (msg?.audioMessage) {
        const stream = await sock.downloadMediaMessage(msg);
        mediaBuffer = stream;
        mediaExt = 'mp3';
    } else if (msg?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = msg.extendedTextMessage.contextInfo.quotedMessage;
        if (quoted?.videoMessage) {
            const stream = await sock.downloadMediaMessage({ 
                ...messageInfo, 
                message: quoted 
            });
            mediaBuffer = stream;
            mediaExt = 'mp4';
        } else if (quoted?.audioMessage) {
            const stream = await sock.downloadMediaMessage({ 
                ...messageInfo, 
                message: quoted 
            });
            mediaBuffer = stream;
            mediaExt = 'mp3';
        }
    }
    
    if (!mediaBuffer) {
        await sock.sendMessage(from, {
            text: `❌ *Tidak ada media ditemukan!*\n\n` +
                  `📌 Kirim atau reply video/audio dengan command:\n` +
                  `${prefix}toptt\n\n` +
                  `💡 Ketik ${prefix}toptt help untuk bantuan.`
        });
        return;
    }
    
    await sock.sendMessage(from, { 
        text: '🔄 *Mengconvert ke voice note...*\n\n⏳ Mohon tunggu sebentar...' 
    });
    
    try {
        const result = await toPTT(mediaBuffer, mediaExt);
        
        await sock.sendMessage(from, {
            audio: result.data,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        });
        
        setTimeout(async () => {
            await sock.sendMessage(from, { 
                text: '✅ *Voice note berhasil dibuat!*\n\n🎤 Voice note sudah siap diputar.' 
            });
        }, 500);
        
    } catch (err) {
        console.error('Convert Error:', err);
        await sock.sendMessage(from, {
            text: `❌ *Gagal membuat voice note!*\n\nError: ${err.message}`
        });
    }
}

async function cmdConvert(sock, from, args, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.includes('help') || args.includes('?')) {
        const text = `🔄 *MEDIA CONVERTER*\n\n` +
                     `📌 Mengconvert berbagai format media\n\n` +
                     `*Format:*\n` +
                     `${prefix}convert <video|audio>\n\n` +
                     `💡 *Contoh:*\n` +
                     `${prefix}convert video - Convert ke video\n` +
                     `${prefix}convert audio - Convert ke audio\n\n` +
                     `ATAU gunakan command spesifik:\n` +
                     `${prefix}toaudio - Ke audio MP3\n` +
                     `${prefix}toptt - Ke voice note`;
        
        const buttons = [
            { buttonId: `${prefix}toaudio`, buttonText: { displayText: '🎵 Audio' }, type: 1 },
            { buttonId: `${prefix}toptt`, buttonText: { displayText: '🎤 Voice' }, type: 1 },
            { buttonId: `${prefix}menu`, buttonText: { displayText: '📋 Menu' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: text,
            buttons: buttons,
            headerType: 1
        });
        return;
    }
    
    // Jika ada args, cek tipe convert
    if (args.length > 0) {
        const type = args[0].toLowerCase();
        if (type === 'audio' || type === 'mp3') {
            await cmdToAudio(sock, from, [], messageInfo);
        } else if (type === 'video' || type === 'mp4') {
            await cmdToVideo(sock, from, [], messageInfo);
        } else {
            await sock.sendMessage(from, {
                text: `❌ *Tipe tidak dikenal!*\n\n` +
                      `📌 Gunakan: ${prefix}convert audio atau video\n` +
                      `💡 ${prefix}convert help untuk bantuan.`
            });
        }
        return;
    }
    
    // Auto detect berdasarkan media yang dikirim
    const msg = messageInfo.message;
    let hasVideo = false;
    let hasAudio = false;
    
    if (msg?.videoMessage) hasVideo = true;
    if (msg?.audioMessage) hasAudio = true;
    
    if (msg?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = msg.extendedTextMessage.contextInfo.quotedMessage;
        if (quoted?.videoMessage) hasVideo = true;
        if (quoted?.audioMessage) hasAudio = true;
    }
    
    if (hasVideo) {
        await cmdToAudio(sock, from, [], messageInfo);
    } else if (hasAudio) {
        await cmdToAudio(sock, from, [], messageInfo);
    } else {
        await sock.sendMessage(from, {
            text: `❌ *Tidak ada media ditemukan!*\n\n` +
                  `📌 Kirim atau reply media dengan command:\n` +
                  `${prefix}convert audio atau video\n\n` +
                  `💡 ${prefix}convert help untuk bantuan.`
        });
    }
}

async function cmdToVideo(sock, from, args, messageInfo) {
    const msg = messageInfo.message;
    let mediaBuffer = null;
    let mediaExt = 'mp4';
    
    if (msg?.videoMessage) {
        const stream = await sock.downloadMediaMessage(msg);
        mediaBuffer = stream;
        mediaExt = 'mp4';
    } else if (msg?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = msg.extendedTextMessage.contextInfo.quotedMessage;
        if (quoted?.videoMessage) {
            const stream = await sock.downloadMediaMessage({ 
                ...messageInfo, 
                message: quoted 
            });
            mediaBuffer = stream;
            mediaExt = 'mp4';
        }
    }
    
    if (!mediaBuffer) {
        await sock.sendMessage(from, {
            text: `❌ *Tidak ada video ditemukan!*\n\n` +
                  `📌 Kirim atau reply video dengan command:\n` +
                  `${global.botConfig.prefix}convert video`
        });
        return;
    }
    
    await sock.sendMessage(from, { 
        text: '🔄 *Memproses video...*\n\n⏳ Mohon tunggu sebentar...' 
    });
    
    try {
        const result = await toVideo(mediaBuffer, mediaExt);
        
        await sock.sendMessage(from, {
            video: result.data,
            mimetype: 'video/mp4',
            caption: '✅ *Video berhasil diproses!*'
        });
        
    } catch (err) {
        console.error('Video Convert Error:', err);
        await sock.sendMessage(from, {
            text: `❌ *Gagal memproses video!*\n\nError: ${err.message}`
        });
    }
}
