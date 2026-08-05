const schoolData = require('./lib/schoolData');
const reminderSystem = require('./lib/reminder');
const process = require('process');
const moment = require("moment-timezone")
const os = require('os');
const didyoumean = require('didyoumean');
const checkDiskSpace = require('check-disk-space').default;
const speed = require('performance-now')
const schedule = require("node-schedule");
const archiver = require("archiver");
const threshold = 0.72
const similarity = require('similarity');
const { alightMotion } = require('./lib/alightMotion');
const { addSongFess, getSongFessStats, getAllSongFess } = require('./lib/songFess');
const { addConfess, getConfessQueue, removeConfess } = require('./lib/confess');
const { createSticker, checkFfmpeg, CONFIG: STICKER_CONFIG } = require('./lib/sticker');
const { formatDuration } = require('./lib/stickerUtils');
const { suggestCommand, formatSuggestion } = require('./lib/cmdSuggest');
const { addPR, deletePR, getPRs, getPRById, getPRStats, formatPRList, formatPRDetail } = require('./lib/prTracker');
const { getUserLevel, hasPermission, getLevelName, addPartner, removePartner, listPartners, LEVELS, PERMISSIONS, getPermissionList } = require('./lib/permission');
const { addChannel, addGroup, removeChannel, removeGroup, getChannels, getGroups, getAllTargets } = require('./lib/channelManager');

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
    
    const args = text.slice(prefix.length).trim().split(/ +/);
    const cmd = args[0]?.toLowerCase() || '';
    const commandArgs = args.slice(1);
    
    const senderNumber = from.split('@')[0];
    const userLevel = getUserLevel(senderNumber, pushName);
    const levelName = getLevelName(userLevel);

    const fsaluran = {
            key: {
                remoteJid: '0@s.whatsapp.net',
                participant: '0@s.whatsapp.net'
            },
            message: {
                newsletterAdminInviteMessage: {
                    newsletterJid: '120363210705976689@newsletter',
                    newsletterName: '',
                    caption: body
                }
            }
    }

    const hariini = moment.tz('Asia/Jakarta').format('dddd, DD MMMM YYYY')
        const wib = moment.tz('Asia/Jakarta').format('HH : mm : ss')
        const wit = moment.tz('Asia/Jayapura').format('HH : mm : ss')
        const wita = moment.tz('Asia/Makassar').format('HH : mm : ss')

        const time2 = moment().tz('Asia/Jakarta').format('HH:mm:ss')
        if (time2 < "23:59:00") {
            var ucapanWaktu = 'ꜱᴇʟᴀᴍᴀᴛ ᴍᴀʟᴀᴍ️'
        }
        if (time2 < "19:00:00") {
            var ucapanWaktu = 'ꜱᴇʟᴀᴍᴀᴛ ᴘᴇᴛᴀɴɢ'
        }
        if (time2 < "18:00:00") {
            var ucapanWaktu = 'ꜱᴇʟᴀᴍᴀᴛ ꜱᴏʀᴇ'
        }
        if (time2 < "15:00:00") {
            var ucapanWaktu = 'ꜱᴇʟᴀᴍᴀᴛ ꜱɪᴀɴɢ️'
        }
        if (time2 < "10:00:00") {
            var ucapanWaktu = 'ꜱᴇʟᴀᴍᴀᴛ ᴘᴀɢɪ'
        }
        if (time2 < "05:00:00") {
            var ucapanWaktu = 'ꜱᴇʟᴀᴍᴀᴛ ꜱᴜʙᴜʜ'
        }
        if (time2 < "03:00:00") {
            var ucapanWaktu = 'ꜱᴇʟᴀᴍᴀᴛ ᴛᴇɴɢᴀʜ ᴍᴀʟᴀᴍ'
        }
    
    const chatType = isChannel ? 'Channel' : isGroup ? 'Group' : 'Private';
    console.log(`⚡ [${chatType}] ${levelName} ${pushName}: ${cmd} ${commandArgs.join(' ')}`);
    
    if (!hasPermission(senderNumber, cmd, pushName)) {
        await sock.sendMessage(from, {
            text: `🔒 *Akses Ditolak!*\n\n` +
                  `Command *${prefix}${cmd}* membutuhkan level yang lebih tinggi.\n\n` +
                  `👤 Level kamu: ${levelName}\n` +
                  `🔑 Dibutuhkan: Partner atau Owner\n\n` +
                  `💡 Hubungi owner untuk jadi partner.`
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
                
            default:
                if (cmd) {
                    const suggestions = suggestCommand(cmd, 0.3, 5);
                    
                    if (suggestions.length > 0) {
                        const suggestionText = formatSuggestion(cmd, suggestions, prefix);
                        
                        const suggestionMsg = {
                            text: suggestionText,
                            footer: '💡 Command Suggestion System',
                            buttons: suggestions.slice(0, 3).map((s, i) => ({
                                buttonId: `${prefix}${s.cmd}`,
                                buttonText: { displayText: `${i === 0 ? '⭐ ' : ''}${prefix}${s.cmd}` },
                                type: 1
                            })),
                            viewOnce: false
                        };

                        try {
                            await sock.sendMessage(from, suggestionMsg);
                        } catch (e) {
                            await sock.sendMessage(from, { text: suggestionText });
                        }
                    } else {
                        await sock.sendMessage(from, { 
                            text: `❌ *Unknown Command*\n\n` +
                                  `Command *${prefix}${cmd}* tidak ditemukan.\n\n` +
                                  `Ketik *${prefix}menu* untuk melihat semua command.`
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
    const sections = [
        {
            title: '📋 *INFO BOT*',
            rows: [
                { title: '🤖 Info Bot', description: 'Lihat informasi lengkap tentang bot', id: `${prefix}info` },
                { title: '👤 Owner Bot', description: 'Kontak dan info owner/pembuat bot', id: `${prefix}owner` },
                { title: '👩‍🏫 Wali Kelas', description: 'Informasi wali kelas 8C', id: `${prefix}walas` }
            ]
        },
        {
            title: '📅 *JADWAL SEKOLAH*',
            rows: [
                { title: '📆 Jadwal Hari Ini', description: 'Lihat jadwal pelajaran hari ini', id: `${prefix}today` },
                { title: '📅 Reminder Besok', description: 'Lihat jadwal pelajaran untuk besok', id: `${prefix}tomorrow` },
                { title: '📚 Jadwal Mapel', description: 'Cari jadwal per hari (senin-jumat)', id: `${prefix}mapel senin` },
                { title: '🧹 Jadwal Piket', description: 'Lihat jadwal piket per hari', id: `${prefix}piket` },
                { title: '📖 Jadwal Lengkap', description: 'Lihat seluruh jadwal dan piket', id: `${prefix}jadwal` }
            ]
        },
        {
            title: '⏰ *REMINDER*',
            rows: [
                { title: '📋 Status Reminder', description: 'Cek status sistem reminder otomatis', id: `${prefix}reminder` },
                { title: '📤 Kirim Reminder', description: 'Kirim reminder manual (owner only)', id: `${prefix}sendreminder` }
            ]
        },
        {
            title: '🎬 *ALIGHT MOTION*',
            rows: [
                { title: '✨ Generate Premium', description: 'Generate Alight Motion Premium 1 Tahun', id: `${prefix}alight` }
            ]
        },
        {
            title: '🎵 *SONGFESS*',
            rows: [
                { title: '🎵 Kirim SongFess', description: 'Kirim lagu + pesan ke channel', id: `${prefix}songfess` }
            ]
        },
        {
            title: '💌 *MENFESS / CONFESS*',
            rows: [
                { title: '💌 Kirim Menfess', description: 'Kirim pesan anonim ke seseorang', id: `${prefix}menfess` }
            ]
        },
        {
            title: '🎨 *STICKER MAKER*',
            rows: [
                { title: '🎨 Buat Sticker', description: 'Buat sticker dari foto/video (max 15s)', id: `${prefix}sticker` }
            ]
        },
        {
            title: '📚 *PR / TUGAS*',
            rows: [
                { title: '📝 Tambah PR', description: 'Tambah PR/tugas baru (partner)', id: `${prefix}addpr` },
                { title: '📋 Daftar PR', description: 'Lihat daftar PR/tugas', id: `${prefix}pr` }
            ]
        },
        {
            title: '🔍 *SEARCH*',
            rows: [
                { title: '🔍 Cari Command', description: 'Cari command berdasarkan kata kunci', id: `${prefix}search` }
            ]
        },
        {
            title: '🛠️ *UTILITY*',
            rows: [
                { title: '🆔 Get ID Chat', description: 'Lihat ID chat untuk konfigurasi bot', id: `${prefix}getid` },
                { title: '🏓 Ping', description: 'Cek status bot', id: `${prefix}ping` },
                { title: '⭐ My Level', description: 'Cek level & permission kamu', id: `${prefix}mylevel` }
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
                  `🎨 *Sticker:* ${prefix}s\n` +
                  `📚 *PR:* ${prefix}pr, ${prefix}addpr, ${prefix}delpr\n` +
                  `🔍 *Search:* ${prefix}search\n` +
                  `🛠️ *Utility:* ${prefix}getid, ${prefix}ping, ${prefix}mylevel`
        });
    }
}

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
            { buttonId: 'owner_chat', buttonText: { displayText: '💬 Chat Owner' }, type: 1 },
            { buttonId: 'owner_profile', buttonText: { displayText: '👤 Profil Owner' }, type: 1 }
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

async function cmdToday(sock, from) {
    try {
        const data = schoolData.getTodayReminder();
        const text = schoolData.formatReminderText(data);
        
        await sock.sendMessage(from, { 
            text: text,
            footer: '📅 Jadwal Hari Ini',
            buttons: [
                { buttonId: `${global.botConfig.prefix}tomorrow`, buttonText: { displayText: '🔮 Lihat Besok' }, type: 1 },
                { buttonId: `${global.botConfig.prefix}jadwal`, buttonText: { displayText: '📖 Jadwal Lengkap' }, type: 1 }
            ],
            viewOnce: false
        });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil jadwal hari ini.' });
    }
}

async function cmdTomorrow(sock, from) {
    try {
        const data = schoolData.getTomorrowReminder();
        const text = schoolData.formatReminderText(data);
        
        await sock.sendMessage(from, { 
            text: text,
            footer: '🔮 Reminder Besok',
            buttons: [
                { buttonId: `${global.botConfig.prefix}today`, buttonText: { displayText: '📅 Hari Ini' }, type: 1 },
                { buttonId: `${global.botConfig.prefix}reminder`, buttonText: { displayText: '⏰ Info Reminder' }, type: 1 }
            ],
            viewOnce: false
        });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil reminder besok.' });
    }
}

async function cmdMapel(sock, from, args) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const sections = [
            {
                title: '📅 *PILIH HARI*',
                highlight_label: 'Hari Aktif',
                rows: [
                    { title: '📆 Senin', description: 'Jadwal pelajaran hari Senin', id: `${prefix}mapel senin` },
                    { title: '📆 Selasa', description: 'Jadwal pelajaran hari Selasa', id: `${prefix}mapel selasa` },
                    { title: '📆 Rabu', description: 'Jadwal pelajaran hari Rabu', id: `${prefix}mapel rabu` },
                    { title: '📆 Kamis', description: 'Jadwal pelajaran hari Kamis', id: `${prefix}mapel kamis` },
                    { title: '📆 Jumat', description: 'Jadwal pelajaran hari Jumat', id: `${prefix}mapel jumat` }
                ]
            }
        ];

        const message = {
            text: '📅 *PILIH HARI*\n\nSilakan pilih hari untuk melihat jadwal pelajaran:',
            footer: 'Klik hari yang diinginkan',
            buttonText: '📋 Pilih Hari',
            sections: sections
        };

        try {
            await sock.sendMessage(from, message);
        } catch (e) {
            await sock.sendMessage(from, { 
                text: `❌ *Cara Penggunaan:*\n\n` +
                      `${prefix}mapel <hari>\n\n` +
                      `📅 Contoh:\n` +
                      `  ${prefix}mapel senin\n` +
                      `  ${prefix}mapel 1\n` +
                      `  ${prefix}mapel selasa\n` +
                      `  ${prefix}mapel 2\n\n` +
                      `📌 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat`
            });
        }
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
            text += `┌─────────────────────────┐\n`;
            text += `│  🍽️  *I S T I R A H A T*  │\n`;
            text += `│  ⏰ ${lesson.time.padEnd(22)} │\n`;
            text += `└─────────────────────────┘\n\n`;
        } else {
            text += `┌─────────────────────────┐\n`;
            text += `│  📚 *Jam ke-${key}*${' '.repeat(15 - key.length)}│\n`;
            text += `│  📖 ${lesson.subject.padEnd(22)} │\n`;
            text += `│  ⏰ ${lesson.time.padEnd(22)} │\n`;
            text += `│  👨‍🏫 ${lesson.teacher.padEnd(22)} │\n`;
            text += `└─────────────────────────┘\n\n`;
        }
    });
    
    await sock.sendMessage(from, { text });
}

async function cmdPiket(sock, from, args) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const sections = [
            {
                title: '🧹 *PILIH HARI PIKET*',
                highlight_label: 'Hari Piket',
                rows: [
                    { title: '🧹 Senin', description: 'Anggota piket hari Senin', id: `${prefix}piket senin` },
                    { title: '🧹 Selasa', description: 'Anggota piket hari Selasa', id: `${prefix}piket selasa` },
                    { title: '🧹 Rabu', description: 'Anggota piket hari Rabu', id: `${prefix}piket rabu` },
                    { title: '🧹 Kamis', description: 'Anggota piket hari Kamis', id: `${prefix}piket kamis` },
                    { title: '🧹 Jumat', description: 'Anggota piket hari Jumat', id: `${prefix}piket jumat` }
                ]
            }
        ];

        const message = {
            text: '🧹 *PILIH HARI PIKET*\n\nSilakan pilih hari untuk melihat jadwal piket:',
            footer: 'Klik hari yang diinginkan',
            buttonText: '🧹 Pilih Hari',
            sections: sections
        };

        try {
            await sock.sendMessage(from, message);
        } catch (e) {
            await sock.sendMessage(from, { 
                text: `❌ *Cara Penggunaan:*\n\n` +
                      `${prefix}piket <hari>\n\n` +
                      `📅 Contoh:\n` +
                      `  ${prefix}piket senin\n` +
                      `  ${prefix}piket 1\n` +
                      `  ${prefix}piket jumat\n\n` +
                      `📌 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat`
            });
        }
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
    text += `┌─────────────────────────┐\n`;
    text += `│  👥 *ANGGOTA PIKET*     │\n`;
    text += `├─────────────────────────┤\n`;
    
    result.members.forEach((name, i) => {
        const num = (i + 1).toString();
        text += `│  ${num}. ${name.padEnd(22)} │\n`;
    });
    
    text += `├─────────────────────────┤\n`;
    text += `│  📌 *TUGAS PIKET:*      │\n`;
    text += `│  • Bersihkan ruang      │\n`;
    text += `│  • Hapus papan tulis    │\n`;
    text += `│  • Rapikan meja & kursi │\n`;
    text += `│  • Buang sampah         │\n`;
    text += `│  • Sapu & pel lantai    │\n`;
    text += `└─────────────────────────┘\n\n`;
    text += `💡 *Note:* Jangan lupa membawa\n`;
    text += `peralatan kebersihan masing-masing ✨`;
    
    const message = {
        text: text,
        footer: '🧹 Piket Kelas 8C',
        buttons: [
            { buttonId: `${prefix}piket`, buttonText: { displayText: '🔄 Cek Hari Lain' }, type: 1 },
            { buttonId: `${prefix}jadwal`, buttonText: { displayText: '📖 Jadwal Lengkap' }, type: 1 }
        ],
        viewOnce: false
    };

    try {
        await sock.sendMessage(from, message);
    } catch (e) {
        await sock.sendMessage(from, { text });
    }
}

async function cmdJadwal(sock, from) {
    try {
        let text = `╔══════════════════════════╗\n`;
        text += `║  📚 JADWAL KELAS 8C     ║\n`;
        text += `╚══════════════════════════╝\n\n`;
        
        text += `┌─────────────────────────┐\n`;
        text += `│  📅 *JADWAL PELAJARAN*  │\n`;
        text += `└─────────────────────────┘\n\n`;
        
        const fullSchedule = schoolData.getFullSchedule();
        for (const [day, lessons] of Object.entries(fullSchedule)) {
            text += `📆 *${day.toUpperCase()}*\n`;
            text += `─────────────────────────\n`;
            Object.values(lessons).forEach(lesson => {
                if (lesson.subject === 'ISTIRAHAT') {
                    text += `   🍽️  Istirahat (${lesson.time})\n`;
                } else {
                    text += `   📖 ${lesson.subject} (${lesson.time})\n`;
                }
            });
            text += `\n`;
        }
        
        text += `┌─────────────────────────┐\n`;
        text += `│  🧹 *JADWAL PIKET*      │\n`;
        text += `└─────────────────────────┘\n\n`;
        
        const fullPiket = schoolData.getFullPiket();
        for (const [day, members] of Object.entries(fullPiket)) {
            text += `📆 *${day.toUpperCase()}:*\n`;
            text += `─────────────────────────\n`;
            members.forEach((name, i) => {
                text += `   ${i + 1}. ${name}\n`;
            });
            text += `\n`;
        }
        
        if (text.length > 4000) {
            const parts = text.match(/[\s\S]{1,4000}/g) || [text];
            for (const part of parts) {
                await sock.sendMessage(from, { text: part });
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            await sock.sendMessage(from, { text });
        }
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil jadwal lengkap.' });
    }
}

async function cmdSendReminder(sock, from, pushName) {
    const ownerNumber = global.botConfig.noOwner.replace(/^0/, '62');
    const senderNumber = from.split('@')[0];
    
    if (pushName !== global.botConfig.owner && 
        senderNumber !== ownerNumber &&
        !senderNumber.includes(ownerNumber)) {
        await sock.sendMessage(from, { 
            text: '❌ *Akses Ditolak*\n\nHanya owner yang bisa mengirim reminder manual.\n\n' +
                  '👤 Owner: ' + global.botConfig.owner
        });
        return;
    }
    
    await sock.sendMessage(from, { text: '🔄 *Mengirim reminder...*\n\nMohon tunggu sebentar...' });
    
    try {
        await reminderSystem.sendManualReminder();
        
        await sock.sendMessage(from, { 
            text: '✅ *Reminder berhasil dikirim!*\n\n' +
                  '📢 Terkirim ke:\n' +
                  '   • Channel WhatsApp\n' +
                  '   • Grup WhatsApp\n\n' +
                  `⏰ Waktu: ${new Date().toLocaleTimeString('id-ID')}`
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
    
    await sock.sendMessage(from, { text });
}

async function cmdAlightMotion(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const message = {
            image: { url: 'https://files.catbox.moe/alight-banner.jpg' },
            caption: `╔══════════════════════════╗\n` +
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
                     `${prefix}alight user@gmail.com https://alightcreative.com/verify?code=xxx`,
            footer: 'Powered by rafaelxd.my.id',
            buttons: [
                { buttonId: `${prefix}alight guide`, buttonText: { displayText: '📖 Panduan Lengkap' }, type: 1 },
                { buttonId: `${prefix}owner`, buttonText: { displayText: '👤 Bantuan Owner' }, type: 1 }
            ],
            viewOnce: false
        };

        try {
            await sock.sendMessage(from, message);
        } catch (e) {
            await sock.sendMessage(from, {
                text: `╔══════════════════════════╗\n` +
                      `║  ✨ ALIGHT MOTION GEN   ║\n` +
                      `╚══════════════════════════╝\n\n` +
                      `📌 *Cara Penggunaan:*\n\n` +
                      `*Step 1:* ${prefix}alight email@gmail.com\n` +
                      `*Step 2:* ${prefix}alight email@gmail.com link_raw\n\n` +
                      `💡 Contoh: ${prefix}alight user@gmail.com`
            });
        }
        return;
    }

    if (args.length === 1) {
        const email = args[0];
        
        if (!email.includes('@') || !email.includes('.')) {
            await sock.sendMessage(from, {
                text: '❌ *Email tidak valid!*\n\n' +
                      'Format: nama@domain.com\n\n' +
                      `Contoh: ${prefix}alight user@gmail.com`
            });
            return;
        }

        await sock.sendMessage(from, { 
            text: '🔄 *Mengirim magic link...*\n\n' +
                  `📧 Email: ${email}\n\n` +
                  '⏳ Mohon tunggu sebentar...'
        });

        try {
            const result = await alightMotion(email);

            if (result.success) {
                const text = `✅ *Magic Link Terkirim!*\n\n` +
                            `📧 *Email:* ${email}\n` +
                            `📝 *Order Code:* ${result.orderCode || 'N/A'}\n\n` +
                            `📌 *LANGKAH SELANJUTNYA:*\n\n` +
                            `1️⃣ Buka inbox email kamu (cek folder Spam juga)\n` +
                            `2️⃣ Cari email dari "Alight Motion" / "Alight Creative"\n` +
                            `3️⃣ Tekan-tahan tombol "Login ke Alight Creative"\n` +
                            `4️⃣ Pilih "Salin URL" (jangan klik langsung!)\n` +
                            `5️⃣ Kirim link yang dicopy dengan command:\n` +
                            `   ${prefix}alight ${email} <link>\n\n` +
                            `⚠️ *PENTING:* Jangan klik link langsung,\n` +
                            `copy link-nya saja!`;

                const message = {
                    text: text,
                    footer: 'Alight Motion Generator',
                    buttons: [
                        { buttonId: `${prefix}alight ${email}`, buttonText: { displayText: '📋 Copy Command' }, type: 1 }
                    ],
                    viewOnce: false
                };

                try {
                    await sock.sendMessage(from, message);
                } catch (e) {
                    await sock.sendMessage(from, { text });
                }
            } else {
                await sock.sendMessage(from, {
                    text: `❌ *Gagal Mengirim!*\n\n` +
                          `Error: ${result.error}\n\n` +
                          `💡 Pastikan email valid dan coba lagi.`
                });
            }
        } catch (err) {
            await sock.sendMessage(from, {
                text: `❌ *Error:* ${err.message}\n\n` +
                      'Silakan coba lagi nanti atau hubungi owner.'
            });
        }
        return;
    }

    if (args.length >= 2) {
        const email = args[0];
        const rawLink = args.slice(1).join(' ');

        await sock.sendMessage(from, { 
            text: '🔄 *Memverifikasi akun...*\n\n' +
                  `📧 Email: ${email}\n` +
                  '⏳ Mohon tunggu sebentar...'
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

                const message = {
                    text: text,
                    footer: '✨ Generated by RafaelXD',
                    buttons: [
                        { buttonId: `${prefix}alight`, buttonText: { displayText: '🔄 Generate Lagi' }, type: 1 },
                        { buttonId: `${prefix}owner`, buttonText: { displayText: '👤 Bantuan' }, type: 1 }
                    ],
                    viewOnce: false
                };

                try {
                    await sock.sendMessage(from, message);
                } catch (e) {
                    await sock.sendMessage(from, { text });
                }
            } else {
                await sock.sendMessage(from, {
                    text: `❌ *Verifikasi Gagal!*\n\n` +
                          `Error: ${result.error}\n\n` +
                          `💡 *Tips:*\n` +
                          `• Pastikan link yang dicopy benar\n` +
                          `• Link hanya bisa dipakai 1x\n` +
                          `• Coba kirim ulang magic link\n\n` +
                          `🔄 Kirim ulang: ${prefix}alight ${email}`
                });
            }
        } catch (err) {
            await sock.sendMessage(from, {
                text: `❌ *Error:* ${err.message}\n\n` +
                      'Silakan coba lagi nanti atau hubungi owner.'
            });
        }
        return;
    }
}

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
                     `💡 *Contoh:*\n` +
                     `${prefix}songfess Night Changes | lagu ini bikin nangis 😭\n` +
                     `${prefix}songfess Sempurna\n\n` +
                     `🎵 SongFess akan dikirim ke channel!\n` +
                     `🕐 Delay: ~5 menit (antrian)`,
            footer: '🎵 Kirim lagu favoritmu secara anonim',
            buttons: [
                { buttonId: `${prefix}songfess help`, buttonText: { displayText: '📖 Cara Pakai' }, type: 1 },
                { buttonId: `${prefix}songfess stats`, buttonText: { displayText: '📊 Stats' }, type: 1 }
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
                      `📌 *Cara Pakai:*\n` +
                      `${prefix}songfess judul | pesan\n\n` +
                      `💡 Contoh:\n` +
                      `${prefix}songfess Night Changes | lagu ini bikin nangis 😭`
            });
        }
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

    const confirmMsg = {
        text: confirmText,
        footer: '🎵 SongFess - Anonim',
        buttons: [
            { buttonId: `${prefix}songfess stats`, buttonText: { displayText: '📊 Lihat Stats' }, type: 1 }
        ],
        viewOnce: false
    };

    try {
        await sock.sendMessage(from, confirmMsg);
    } catch (e) {
        await sock.sendMessage(from, { text: confirmText });
    }
}

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
                { buttonId: `${prefix}menfess help`, buttonText: { displayText: '📖 Cara Pakai' }, type: 1 },
                { buttonId: `${prefix}menfess stats`, buttonText: { displayText: '📊 Stats' }, type: 1 }
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
            text: '❌ *Nomor tujuan tidak valid!*\n\n' +
                  'Format: 628xxxxxxxxxx\n\n' +
                  `Contoh: ${prefix}menfess 628123456789|pesan`
        });
        return;
    }

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

    if (targetNumber === senderNumber || targetNumber === senderNumber.replace(/^62/, '0')) {
        await sock.sendMessage(from, { 
            text: '😅 *Tidak bisa kirim ke diri sendiri!*\n\n' +
                  'Menfess hanya untuk mengirim ke orang lain.'
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

    const confirmMsg = {
        text: confirmText,
        footer: '💌 Menfess - Anonim & Rahasia',
        buttons: [
            { buttonId: `${prefix}menfess stats`, buttonText: { displayText: '📊 Cek Stats' }, type: 1 }
        ],
        viewOnce: false
    };

    try {
        await sock.sendMessage(from, confirmMsg);
    } catch (e) {
        await sock.sendMessage(from, { text: confirmText });
    }

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
                          `✨ Mau balas? Kirim menfess juga!\n` +
                          `Ketik: ${prefix}menfess <nomor>|<pesan>`;

        const targetMsg = {
            text: targetText,
            footer: '💌 Menfess - Pesan Rahasia',
            buttons: [
                { buttonId: `${prefix}menfess`, buttonText: { displayText: '💌 Balas Menfess' }, type: 1 }
            ],
            viewOnce: false
        };

        try {
            await sock.sendMessage(targetJid, targetMsg);
        } catch (e) {
            await sock.sendMessage(targetJid, { text: targetText });
        }

        removeConfess(confessId, true);

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

async function cmdSticker(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    const hasFfmpeg = await checkFfmpeg();
    if (!hasFfmpeg) {
        await sock.sendMessage(from, {
            text: '❌ *FFmpeg tidak terinstall!*\n\n' +
                  'Sticker maker membutuhkan FFmpeg.\n' +
                  'Silakan install FFmpeg terlebih dahulu.'
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
        
        await sock.sendMessage(from, { text });
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
        const message = {
            image: { url: 'https://files.catbox.moe/sticker-banner.jpg' },
            caption: `╔══════════════════════════╗\n` +
                     `║   🎨 STICKER MAKER     ║\n` +
                     `║   Foto & Video (15s)   ║\n` +
                     `╚══════════════════════════╝\n\n` +
                     `📌 *Cara Membuat Sticker:*\n\n` +
                     `*1️⃣ Kirim/Reply Gambar:*\n` +
                     `${prefix}s | ${prefix}s circle | ${prefix}s rounded\n\n` +
                     `*2️⃣ Kirim/Reply Video:*\n` +
                     `${prefix}s | ${prefix}s circle\n\n` +
                     `🎨 *Style:* full, circle, rounded\n` +
                     `📏 Video: Maks 15 detik | File: Maks 10 MB\n\n` +
                     `💡 Reply gambar → ${prefix}s circle`,
            footer: '🎨 Sticker Maker v1.0',
            buttons: [
                { buttonId: `${prefix}s full`, buttonText: { displayText: '📱 Full Sticker' }, type: 1 },
                { buttonId: `${prefix}s circle`, buttonText: { displayText: '⭕ Circle' }, type: 1 },
                { buttonId: `${prefix}s help`, buttonText: { displayText: '📖 Bantuan' }, type: 1 }
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
                      `Style: ${prefix}s full | circle | rounded`
            });
        }
        return;
    }
    
    if (mediaType === 'video' && mediaDuration > STICKER_CONFIG.MAX_VIDEO_DURATION) {
        await sock.sendMessage(from, {
            text: `❌ *Video terlalu panjang!*\n\n` +
                  `⏱️ Durasi: ${formatDuration(mediaDuration)}\n` +
                  `📏 Maksimal: ${STICKER_CONFIG.MAX_VIDEO_DURATION} detik`
        });
        return;
    }
    
    await sock.sendMessage(from, { 
        text: '🔄 *Membuat sticker...*\n\n' +
              `📸 Tipe: ${mediaType === 'image' ? 'Gambar' : 'Video'}\n` +
              `🎨 Style: ${stickerType}\n` +
              '\n⏳ Mohon tunggu sebentar...'
    });
    
    try {
        const result = await createSticker(sock, messageInfo, {
            type: stickerType,
            pack: packName,
            author: authorName
        });
        
        await sock.sendMessage(from, { sticker: result.sticker });
        
        setTimeout(async () => {
            const info = `✅ *Sticker Berhasil!*\n\n` +
                        `📸 Tipe: ${result.type === 'animated' ? '🎬 Animasi' : '🖼️ Statis'}\n` +
                        `🎨 Style: ${stickerType === 'full' ? '📱 Full' : stickerType === 'circle' ? '⭕ Circle' : '🔲 Rounded'}`;
            
            await sock.sendMessage(from, { text: info });
        }, 500);
        
    } catch (err) {
        console.error('Sticker Error:', err.message);
        await sock.sendMessage(from, {
            text: `❌ *Gagal membuat sticker!*\n\n` +
                  `Error: ${err.message}\n\n` +
                  `💡 Pastikan gambar/video tidak rusak dan ukuran tidak lebih dari 10 MB.`
        });
    }
}

async function cmdSearch(sock, from, args, prefix) {
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `🔍 *COMMAND SEARCH*\n\n` +
                  `Cari command berdasarkan kata kunci.\n\n` +
                  `📌 *Cara pakai:*\n` +
                  `${prefix}search <kata kunci>\n\n` +
                  `💡 *Contoh:*\n` +
                  `${prefix}search jadwal\n` +
                  `${prefix}cari piket`
        });
        return;
    }

    const query = args.join(' ').toLowerCase();
    const suggestions = suggestCommand(query, 0.1, 10);
    
    if (suggestions.length === 0) {
        await sock.sendMessage(from, {
            text: `🔍 *Pencarian: "${query}"*\n\n` +
                  `❌ Tidak ada command yang cocok.\n\n` +
                  `💡 Coba kata kunci lain atau\n` +
                  `ketik *${prefix}menu* untuk lihat semua.`
        });
        return;
    }

    const grouped = {};
    suggestions.forEach(s => {
        if (!grouped[s.category]) grouped[s.category] = [];
        grouped[s.category].push(s);
    });

    let text = `╔══════════════════════════╗\n`;
    text += `║  🔍 SEARCH RESULTS     ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    text += `🔎 *Pencarian:* "${query}"\n`;
    text += `📊 *Ditemukan:* ${suggestions.length} command\n\n`;

    for (const [category, cmds] of Object.entries(grouped)) {
        text += `📂 *${category}*\n`;
        text += `─────────────────────────\n`;
        
        cmds.forEach(c => {
            const percent = Math.round(c.similarity * 100);
            text += `  📝 *${prefix}${c.cmd}*\n`;
            text += `     📖 ${c.desc}\n`;
            text += `     🎯 ${percent}% cocok\n`;
            if (c.alias.length > 0) {
                text += `     🔀 ${c.alias.slice(0, 3).map(a => prefix + a).join(', ')}\n`;
            }
            text += `\n`;
        });
    }

    text += `💡 Ketik *${prefix}menu* untuk semua command.`;

    await sock.sendMessage(from, { text });
}

async function cmdAddPR(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `📚 *TAMBAH PR/TUGAS*\n\n` +
                  `📌 *Format:*\n` +
                  `${prefix}addpr <mapel>|<deskripsi>|<deadline>\n\n` +
                  `💡 *Contoh:*\n` +
                  `${prefix}addpr Matematika|Halaman 100-101|2024-12-20\n` +
                  `${prefix}addpr IPA|Buat laporan praktikum|2024-12-25\n\n` +
                  `📎 *Bisa juga reply:*\n` +
                  `Reply gambar/file/link → ${prefix}addpr mapel|deskripsi|deadline\n\n` +
                  `📅 Format deadline: YYYY-MM-DD`
        });
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
                text: '❌ Format deadline salah!\n\n' +
                      'Gunakan format: YYYY-MM-DD\n' +
                      'Contoh: 2024-12-20'
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
    
    await sock.sendMessage(from, {
        text: `✅ *PR Berhasil Ditambahkan!*\n\n${prDetail}`
    });
}

async function cmdDeletePR(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `❌ *HAPUS PR*\n\n` +
                  `📌 Format: ${prefix}delpr <id>\n\n` +
                  `💡 Contoh: ${prefix}delpr PR241201ABC\n\n` +
                  `🔍 Cari ID: ${prefix}pr (lihat daftar PR)`
        });
        return;
    }
    
    const id = args[0];
    const pr = getPRById(id);
    
    if (!pr) {
        await sock.sendMessage(from, {
            text: `❌ PR dengan ID *${id}* tidak ditemukan.\n\n` +
                  `🔍 Cek daftar PR: ${prefix}pr`
        });
        return;
    }
    
    if (deletePR(id)) {
        await sock.sendMessage(from, {
            text: `✅ PR berhasil dihapus!\n\n` +
                  `📌 ${pr.subject}\n` +
                  `🆔 ${pr.id}`
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
    
    if (result.totalPages > 1) {
        const msg = {
            text: result.text,
            footer: `📚 PR Tracker | Halaman ${page}/${result.totalPages}`,
            buttons: [
                { buttonId: `${global.botConfig.prefix}pr ${filter} ${page - 1}`, buttonText: { displayText: '⬅️ Sebelumnya' }, type: 1 },
                { buttonId: `${global.botConfig.prefix}pr ${filter} ${page + 1}`, buttonText: { displayText: '➡️ Selanjutnya' }, type: 1 }
            ],
            viewOnce: false
        };
        
        try {
            await sock.sendMessage(from, msg);
        } catch (e) {
            await sock.sendMessage(from, { text: result.text });
        }
    } else {
        await sock.sendMessage(from, { text: result.text });
    }
}

async function cmdAddPartner(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `⭐ *TAMBAH PARTNER*\n\n` +
                  `📌 Format: ${prefix}addpartner <nomor>|<nama>\n\n` +
                  `💡 Contoh:\n` +
                  `${prefix}addpartner 628123456789|Budi\n` +
                  `${prefix}addpartner 08123456789|Ani`
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
            text: `✅ *Partner Berhasil Ditambahkan!*\n\n` +
                  `👤 Nama: ${result.partner.name}\n` +
                  `📱 Nomor: ${result.partner.number}\n` +
                  `🕐 Ditambah: ${new Date().toLocaleString('id-ID')}`
        });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdRemovePartner(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `❌ *HAPUS PARTNER*\n\n` +
                  `📌 Format: ${prefix}delpartner <nomor>\n\n` +
                  `💡 Contoh: ${prefix}delpartner 628123456789`
        });
        return;
    }
    
    const number = args[0].replace(/[^0-9]/g, '');
    const result = removePartner(number);
    
    if (result.success) {
        await sock.sendMessage(from, {
            text: `✅ Partner berhasil dihapus!\n\n` +
                  `👤 ${result.partner.name}\n` +
                  `📱 ${result.partner.number}`
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
    
    await sock.sendMessage(from, { text });
}

async function cmdAddChannel(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `📢 *TAMBAH CHANNEL*\n\n` +
                  `📌 Format: ${prefix}addch <channel_id>|<nama>\n\n` +
                  `💡 Cara dapat ID:\n` +
                  `1. Masuk ke channel\n` +
                  `2. Ketik ${prefix}getid\n` +
                  `3. Copy Channel ID\n\n` +
                  `Contoh: ${prefix}addch 120363xxxxx@newsletter|Channel Kelas`
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
            text: `✅ *Channel Berhasil Ditambahkan!*\n\n` +
                  `📢 ${result.channel.name}\n` +
                  `🆔 ${result.channel.id}\n\n` +
                  `📌 Channel ini akan menerima:\n` +
                  `• Reminder otomatis\n` +
                  `• PR/Tugas baru\n` +
                  `• Pengumuman`
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
    
    await sock.sendMessage(from, { text });
}

async function cmdAddGroupCmd(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `👥 *TAMBAH GROUP*\n\n` +
                  `📌 Format: ${prefix}addgroup <group_id>|<nama>\n\n` +
                  `💡 Cara dapat ID:\n` +
                  `1. Masuk ke group\n` +
                  `2. Ketik ${prefix}getid\n` +
                  `3. Copy Group ID\n\n` +
                  `Contoh: ${prefix}addgroup 120363xxxxx@g.us|Grup Kelas`
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
            text: `✅ *Group Berhasil Ditambahkan!*\n\n` +
                  `👥 ${result.group.name}\n` +
                  `🆔 ${result.group.id}`
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
    
    await sock.sendMessage(from, { text });
}

async function cmdBroadcast(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `📢 *BROADCAST*\n\n` +
                  `📌 Format: ${prefix}bc <pesan>\n\n` +
                  `💡 Bisa reply gambar/video untuk broadcast media.\n\n` +
                  `Pesan akan dikirim ke semua channel & group terdaftar.`
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
        text: `✅ *Broadcast Selesai!*\n\n` +
              `📊 Terkirim: ${sentCount}\n` +
              `❌ Gagal: ${failCount}\n` +
              `📢 Total target: ${targets.channels.length + targets.groups.length}`
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
    
    await sock.sendMessage(from, { text });
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
    
    await sock.sendMessage(from, { text });
}
