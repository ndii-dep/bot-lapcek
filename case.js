const schoolData = require('./lib/schoolData');
const reminderSystem = require('./lib/reminder');
const { alightMotion } = require('./lib/alightMotion');
const { addSongFess, getSongFessStats } = require('./lib/songFess');
const { addConfess, getConfessQueue, removeConfess } = require('./lib/confess');
const { createSticker, checkFfmpeg, CONFIG: STICKER_CONFIG } = require('./lib/sticker');
const { formatDuration } = require('./lib/stickerUtils');
const { suggestCommand, formatSuggestion } = require('./lib/cmdSuggest');
const { addPR, deletePR, getPRs, getPRById, formatPRList, formatPRDetail } = require('./lib/prTracker');
const { addChannel, addGroup, removeChannel, removeGroup, getChannels, getGroups, getAllTargets } = require('./lib/channelManager');
const { 
    getFeature, getFeatureStatus, toggleFeature, 
    updateFeatureMessage, updateFeatureEmoji,
    updateAutoPostSWCaption, getAutoPostSWCaption
} = require('./lib/autoFeatures');
const { getUserLevel, hasPermission, getLevelName, addPartner, removePartner, getPartners, getOwner, setOwner, getPermissionList } = require('./lib/permission');
const { getCatalog, getProductById, getCategories, addBuyer, updateBuyer, getBuyerById, getBuyerByNumber, getTopBuyers, formatPaymentMethods, formatOrderInvoice, createThanksCanvas, getPaymentMethods } = require('./lib/shopV2');
const { formatCarouselText } = require('./lib/carousel');

module.exports = async function(sock, messageInfo) {
    const { from, pushName, isGroup, isChannel, message, key } = messageInfo;
    
    let text = '';
    let quotedMessage = null;
    
    if (message?.conversation) {
        text = message.conversation;
    } else if (message?.extendedTextMessage?.text) {
        text = message.extendedTextMessage.text;
        quotedMessage = message.extendedTextMessage.contextInfo?.quotedMessage || null;
    } else if (message?.imageMessage?.caption) {
        text = message.imageMessage.caption;
        quotedMessage = message.imageMessage.contextInfo?.quotedMessage || null;
    } else if (message?.videoMessage?.caption) {
        text = message.videoMessage.caption;
        quotedMessage = message.videoMessage.contextInfo?.quotedMessage || null;
    }
    
    if (!text) return;
    
    const senderNumber = from.split('@')[0];
    const userLevel = getUserLevel(senderNumber, pushName);
    const levelName = getLevelName(userLevel);
    
    const isMainPrefix = text.startsWith(global.botConfig.prefix);
    const isShopPrefix = text.startsWith('/');
    
    if (!isMainPrefix && !isShopPrefix) return;
    
    const prefix = isShopPrefix ? '/' : global.botConfig.prefix;
    const args = text.slice(prefix.length).trim().split(/ +/);
    const cmd = args[0]?.toLowerCase() || '';
    const commandArgs = args.slice(1);
    
    const chatType = isChannel ? 'Channel' : isGroup ? 'Group' : 'Private';
    console.log(`⚡ [${chatType}] ${levelName} ${pushName}: ${prefix}${cmd} ${commandArgs.join(' ')}`);
    
    const enrichedMessageInfo = { ...messageInfo, quotedMessage, commandArgs, prefix };
    
    if (isShopPrefix) {
        try {
            switch(cmd) {
                case 'catalog': await cmdShopCatalog(sock, from, commandArgs); break;
                case 'detail': await cmdShopDetail(sock, from, commandArgs); break;
                case 'buy': case 'order': await cmdShopBuy(sock, from, commandArgs, pushName, senderNumber); break;
                case 'myorder': await cmdShopMyOrder(sock, from, commandArgs, senderNumber); break;
                case 'mybill': await cmdShopMyBill(sock, from, commandArgs, pushName, senderNumber); break;
                case 'payment': await cmdShopPayment(sock, from); break;
                case 'done': await cmdShopDone(sock, from, commandArgs, pushName, userLevel); break;
                case 'topbuyer': await cmdShopTopBuyer(sock, from); break;
                case 'info': await cmdShopInfo(sock, from); break;
                case 'help': await cmdShopHelp(sock, from); break;
                default: await sock.sendMessage(from, { text: '❌ Command shop tidak dikenal.\n/catalog - Lihat produk\n/help - Bantuan' });
            }
        } catch (err) {
            console.error('Shop Error:', err.message);
            await sock.sendMessage(from, { text: '❌ Terjadi kesalahan saat memproses command shop.' });
        }
        return;
    }
    
    if (!hasPermission(senderNumber, cmd, pushName)) {
        await sock.sendMessage(from, {
            text: `🔒 *Akses Ditolak!*\n\n` +
                  `Command *${prefix}${cmd}* membutuhkan level lebih tinggi.\n` +
                  `Level kamu: ${levelName}\n` +
                  `Hubungi owner untuk jadi partner.\n` +
                  `Cek level: ${prefix}mylevel`
        });
        return;
    }
    
    try {
        switch(cmd) {
            case 'info': case 'menu': case 'help': case '?':
                await cmdInfo(sock, from); break;
            case 'owner': case 'pemilik': case 'creator': case 'dev':
                await cmdOwner(sock, from); break;
            case 'walas': case 'walikelas': case 'guru': case 'teacher':
                await cmdWalas(sock, from); break;
            case 'today': case 'hariini': case 'sekarang':
                await cmdToday(sock, from); break;
            case 'tomorrow': case 'besok': case 'reminderbesok':
                await cmdTomorrow(sock, from); break;
            case 'mapel': case 'pelajaran': case 'matapelajaran': case 'subject':
                await cmdMapel(sock, from, commandArgs); break;
            case 'piket': case 'clean': case 'bersih': case 'duty':
                await cmdPiket(sock, from, commandArgs); break;
            case 'jadwal': case 'schedule': case 'fullschedule': case 'lengkap':
                await cmdJadwal(sock, from); break;
            case 'sendreminder': case 'kirimreminder':
                await cmdSendReminder(sock, from); break;
            case 'reminder': case 'reminders': case 'pengingat': case 'notif':
                await cmdReminderMenu(sock, from); break;
            case 'alight': case 'alightmotion': case 'am': case 'premium':
                await cmdAlightMotion(sock, from, commandArgs); break;
            case 'songfess': case 'sf': case 'song': case 'lagu': case 'musicfess':
                await cmdSongFess(sock, from, commandArgs, pushName); break;
            case 'menfess': case 'confess': case 'confes': case 'menfes': case 'anon': case 'rahasia':
                await cmdConfess(sock, from, commandArgs, pushName); break;
            case 'sticker': case 'stiker': case 's': case 'stick':
                await cmdSticker(sock, from, commandArgs, pushName, enrichedMessageInfo); break;
            case 'search': case 'cari': case 'find': case 'cmd':
                await cmdSearch(sock, from, commandArgs, prefix); break;
            case 'addpr': case 'tambahpr': case 'addtugas':
                await cmdAddPR(sock, from, commandArgs, pushName, enrichedMessageInfo); break;
            case 'delpr': case 'hapuspr': case 'deletepr':
                await cmdDeletePR(sock, from, commandArgs); break;
            case 'pr': case 'listpr': case 'tugas': case 'dafpus':
                await cmdListPR(sock, from, commandArgs); break;
            case 'setowner': case 'registerowner':
                await cmdSetOwner(sock, from, commandArgs, pushName, userLevel); break;
            case 'addpartner':
                await cmdAddPartner(sock, from, commandArgs, pushName); break;
            case 'delpartner': case 'removepartner':
                await cmdRemovePartner(sock, from, commandArgs); break;
            case 'listpartner': case 'partners':
                await cmdListPartners(sock, from); break;
            case 'addch': case 'addchannel':
                await cmdAddChannel(sock, from, commandArgs, pushName); break;
            case 'delch': case 'removechannel':
                await cmdRemoveChannel(sock, from, commandArgs); break;
            case 'listch': case 'channels':
                await cmdListChannels(sock, from); break;
            case 'addgroup': case 'addgrup':
                await cmdAddGroupCmd(sock, from, commandArgs, pushName); break;
            case 'delgroup': case 'removegroup':
                await cmdRemoveGroupCmd(sock, from, commandArgs); break;
            case 'listgroup': case 'groups': case 'grup':
                await cmdListGroups(sock, from); break;
            case 'getid': case 'id': case 'chatid': case 'cekid': case 'myid':
                await cmdGetId(sock, from, enrichedMessageInfo); break;
            case 'ping': case 'cek': case 'test': case 'status': case 'botstatus':
                await cmdPing(sock, from); break;
            case 'mylevel': case 'level': case 'role':
                await cmdMyLevel(sock, from, pushName, senderNumber); break;
            case 'welcome': case 'autowelcome':
                await cmdToggleFeature(sock, from, commandArgs, 'welcome', pushName, userLevel); break;
            case 'goodbye': case 'autogoodbye':
                await cmdToggleFeature(sock, from, commandArgs, 'goodbye', pushName, userLevel); break;
            case 'typing': case 'autotyping':
                await cmdToggleFeature(sock, from, commandArgs, 'autotyping', pushName, userLevel); break;
            case 'record': case 'autorecord':
                await cmdToggleFeature(sock, from, commandArgs, 'autorecord', pushName, userLevel); break;
            case 'read': case 'autoread':
                await cmdToggleFeature(sock, from, commandArgs, 'autoread', pushName, userLevel); break;
            case 'postsw': case 'autopostsw':
                await cmdToggleFeature(sock, from, commandArgs, 'autopostsw', pushName, userLevel); break;
            case 'reactsw': case 'autoreactsw':
                await cmdToggleFeature(sock, from, commandArgs, 'autoreactsw', pushName, userLevel); break;
            case 'setwelcome': case 'setwelcomemsg':
                await cmdSetFeatureMessage(sock, from, commandArgs, 'welcome', pushName, userLevel); break;
            case 'setgoodbye': case 'setgoodbyemsg':
                await cmdSetFeatureMessage(sock, from, commandArgs, 'goodbye', pushName, userLevel); break;
            case 'setreact': case 'setreactemoji':
                await cmdSetReactEmoji(sock, from, commandArgs, pushName, userLevel); break;
            case 'setpostsw': case 'setpostcaption':
                await cmdSetPostSWCaption(sock, from, commandArgs, pushName, userLevel); break;
            case 'auto': case 'autofeatures':
                await cmdListAutoFeatures(sock, from); break;
            case 'chcreate':
                await cmdChannelCreate(sock, from, commandArgs, pushName, userLevel); break;
            case 'chfollow':
                await cmdChannelFollow(sock, from, commandArgs, pushName, userLevel); break;
            case 'chinfo':
                await cmdChannelInfo(sock, from, commandArgs, pushName, userLevel); break;
            case 'chupdate':
                await cmdChannelUpdate(sock, from, commandArgs, pushName, userLevel); break;
            case 'chdelete':
                await cmdChannelDelete(sock, from, commandArgs, pushName, userLevel); break;
            default:
                if (cmd) {
                    const suggestions = suggestCommand(cmd, 0.3, 5);
                    if (suggestions.length > 0) {
                        await sock.sendMessage(from, { text: formatSuggestion(cmd, suggestions, prefix) });
                    } else {
                        await sock.sendMessage(from, { 
                            text: `❌ *Unknown Command*\n\n` +
                                  `Command *${prefix}${cmd}* tidak ditemukan.\n` +
                                  `Ketik *${prefix}menu* untuk daftar command.\n` +
                                  `🛍️ Shop: /catalog | /help`
                        });
                    }
                }
                break;
        }
    } catch (err) {
        console.error(`❌ Error executing ${cmd}:`, err.message);
        try { await sock.sendMessage(from, { text: '❌ Terjadi kesalahan. Silakan coba lagi.' }); } catch (e) {}
    }
};

async function cmdInfo(sock, from) {
    const prefix = global.botConfig.prefix;
    let text = '';
    text += `╔══════════════════════╗\n`;
    text += `║  🤖 ${global.botConfig.name.padEnd(16)} ║\n`;
    text += `║  v${global.botConfig.version} | ${global.botConfig.owner.padEnd(12)} ║\n`;
    text += `╚══════════════════════╝\n\n`;
    text += `📋 *INFO BOT*\n`;
    text += `  ${prefix}info   › Info bot\n`;
    text += `  ${prefix}owner  › Info owner\n`;
    text += `  ${prefix}walas  › Wali kelas\n`;
    text += `  ${prefix}mylevel › Level kamu\n\n`;
    text += `📅 *JADWAL*\n`;
    text += `  ${prefix}today    › Hari ini\n`;
    text += `  ${prefix}tomorrow › Besok\n`;
    text += `  ${prefix}mapel    › Mapel/hari\n`;
    text += `  ${prefix}piket    › Piket/hari\n`;
    text += `  ${prefix}jadwal   › Semua jadwal\n\n`;
    text += `🎵 *SONGFESS & MENFESS*\n`;
    text += `  ${prefix}songfess › Kirim lagu\n`;
    text += `  ${prefix}menfess  › Pesan anonim\n\n`;
    text += `🎨 *KREATIF*\n`;
    text += `  ${prefix}s       › Sticker maker\n`;
    text += `  ${prefix}alight  › AM Premium\n\n`;
    text += `📚 *PR / TUGAS*\n`;
    text += `  ${prefix}addpr   › Tambah PR\n`;
    text += `  ${prefix}pr      › Daftar PR\n`;
    text += `  ${prefix}delpr   › Hapus PR\n\n`;
    text += `⚙️ *AUTO FEATURES*\n`;
    text += `  ${prefix}auto    › Status fitur\n`;
    text += `  ${prefix}welcome › Welcome on/off\n`;
    text += `  ${prefix}goodbye › Goodbye on/off\n\n`;
    text += `📰 *CHANNEL*\n`;
    text += `  ${prefix}chcreate › Buat channel\n`;
    text += `  ${prefix}chfollow › Follow channel\n`;
    text += `  ${prefix}chinfo   › Info channel\n\n`;
    text += `🛠️ *UTILITY*\n`;
    text += `  ${prefix}search  › Cari command\n`;
    text += `  ${prefix}getid   › ID chat/user\n`;
    text += `  ${prefix}ping    › Status bot\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🛍️ *SHOP* › /catalog | /help\n`;
    text += `⏰ Reminder › 12:00 | 16:00 | 20:00`;
    await sock.sendMessage(from, { text });
}

async function cmdOwner(sock, from) {
    const owner = getOwner();
    if (!owner.number) {
        await sock.sendMessage(from, { text: '❌ Owner belum terdaftar.\nGunakan .setowner <nomor>|<nama>' });
        return;
    }
    const no = owner.number.startsWith('62') ? '0' + owner.number.slice(2) : owner.number;
    let text = '';
    text += `╔══════════════════════╗\n`;
    text += `║    👤 OWNER BOT     ║\n`;
    text += `╚══════════════════════╝\n\n`;
    text += `👤 Nama : ${owner.name}\n`;
    text += `📞 WA   : ${no}\n`;
    text += `🔗 Link : https://wa.me/${owner.number}\n\n`;
    text += `Hubungi owner untuk request.`;
    await sock.sendMessage(from, { text });
}

async function cmdWalas(sock, from) {
    let text = '';
    text += `╔══════════════════════╗\n`;
    text += `║  👩‍🏫 WALI KELAS 8C  ║\n`;
    text += `╚══════════════════════╝\n\n`;
    text += `👤 Ibu Sari, S.Pd.\n`;
    text += `🏫 Kelas 8C\n`;
    text += `📞 081234567890\n\n`;
    text += `🕐 Konsultasi:\n`;
    text += `  Senin-Jumat 08.00-14.00\n`;
    text += `  Sabtu 08.00-12.00\n\n`;
    text += `📍 Kantor Guru Lt. 2`;
    await sock.sendMessage(from, { text });
}

async function cmdToday(sock, from) {
    try {
        const data = schoolData.getTodayReminder();
        await sock.sendMessage(from, { text: schoolData.formatReminderText(data) });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil jadwal.' });
    }
}

async function cmdTomorrow(sock, from) {
    try {
        const data = schoolData.getTomorrowReminder();
        await sock.sendMessage(from, { text: schoolData.formatReminderText(data) });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil jadwal.' });
    }
}

async function cmdMapel(sock, from, args) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) {
        let text = '📅 *PILIH HARI*\n\n';
        text += `${prefix}mapel senin / 1\n`;
        text += `${prefix}mapel selasa / 2\n`;
        text += `${prefix}mapel rabu / 3\n`;
        text += `${prefix}mapel kamis / 4\n`;
        text += `${prefix}mapel jumat / 5`;
        await sock.sendMessage(from, { text });
        return;
    }
    const result = schoolData.getScheduleByDay(args[0]);
    if (!result) { await sock.sendMessage(from, { text: '❌ Hari tidak valid. Gunakan: senin-jumat atau 1-5' }); return; }
    let text = `📅 *JADWAL ${result.day.toUpperCase()}*\n\n`;
    Object.entries(result.schedule).forEach(([key, lesson]) => {
        if (lesson.subject === 'ISTIRAHAT') {
            text += `🍽️  Istirahat (${lesson.time})\n\n`;
        } else {
            text += `📚 Jam ke-${key}\n  📖 ${lesson.subject}\n  ⏰ ${lesson.time}\n  👨‍🏫 ${lesson.teacher}\n\n`;
        }
    });
    await sock.sendMessage(from, { text });
}

async function cmdPiket(sock, from, args) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) {
        let text = '🧹 *PILIH HARI PIKET*\n\n';
        text += `${prefix}piket senin / 1\n${prefix}piket selasa / 2\n${prefix}piket rabu / 3\n${prefix}piket kamis / 4\n${prefix}piket jumat / 5`;
        await sock.sendMessage(from, { text });
        return;
    }
    const result = schoolData.getPiketByDay(args[0]);
    if (!result) { await sock.sendMessage(from, { text: '❌ Hari tidak valid.' }); return; }
    let text = `🧹 *PIKET ${result.day.toUpperCase()}*\n\n👥 Anggota:\n`;
    result.members.forEach((name, i) => { text += `  ${i + 1}. ${name}\n`; });
    text += `\n📌 Tugas: Bersihkan kelas, hapus papan, rapikan meja, buang sampah, sapu & pel.\n💡 Bawa peralatan kebersihan ✨`;
    await sock.sendMessage(from, { text });
}

async function cmdJadwal(sock, from) {
    try {
        let text = `📚 *JADWAL LENGKAP KELAS 8C*\n\n📅 PELAJARAN\n`;
        const fullSchedule = schoolData.getFullSchedule();
        for (const [day, lessons] of Object.entries(fullSchedule)) {
            text += `\n📆 ${day.toUpperCase()}\n`;
            Object.values(lessons).forEach(l => {
                text += l.subject === 'ISTIRAHAT' ? `  🍽️  Istirahat (${l.time})\n` : `  📖 ${l.subject} (${l.time})\n`;
            });
        }
        text += `\n🧹 PIKET\n`;
        const fullPiket = schoolData.getFullPiket();
        for (const [day, members] of Object.entries(fullPiket)) {
            text += `\n📆 ${day.toUpperCase()}: ${members.join(', ')}\n`;
        }
        if (text.length > 4000) {
            for (const part of text.match(/[\s\S]{1,4000}/g) || [text]) {
                await sock.sendMessage(from, { text: part });
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            await sock.sendMessage(from, { text });
        }
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil jadwal.' });
    }
}

async function cmdSendReminder(sock, from) {
    await sock.sendMessage(from, { text: '🔄 Mengirim reminder...' });
    try {
        await reminderSystem.sendManualReminder();
        await sock.sendMessage(from, { text: '✅ Reminder terkirim ke Channel & Group!' });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengirim reminder.' });
    }
}

async function cmdReminderMenu(sock, from) {
    let text = '⏰ *REMINDER SYSTEM*\n\n';
    text += '🟢 Status: AKTIF\n\n';
    text += '🕐 Jadwal (3x/hari):\n';
    text += '  🌅 12:00 | ☀️ 16:00 | 🌙 20:00\n\n';
    text += '📅 Senin-Jumat (H-1)\n';
    text += `.tomorrow | .sendreminder`;
    await sock.sendMessage(from, { text });
}

async function cmdAlightMotion(sock, from, args) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) {
        let text = '✨ *ALIGHT MOTION PREMIUM*\n\n';
        text += `Step 1: ${prefix}alight email\n`;
        text += `Step 2: ${prefix}alight email link\n`;
        text += `Contoh: ${prefix}alight user@gmail.com`;
        await sock.sendMessage(from, { text });
        return;
    }
    if (args.length === 1) {
        if (!args[0].includes('@')) { await sock.sendMessage(from, { text: '❌ Email tidak valid!' }); return; }
        await sock.sendMessage(from, { text: `🔄 Mengirim magic link ke ${args[0]}...` });
        try {
            const result = await alightMotion(args[0]);
            if (result.success) {
                await sock.sendMessage(from, { text: `✅ Magic link terkirim!\n\n📧 ${args[0]}\n\nBuka inbox, copy link verifikasi.\n${prefix}alight ${args[0]} <link>` });
            } else {
                await sock.sendMessage(from, { text: `❌ ${result.error}` });
            }
        } catch (err) { await sock.sendMessage(from, { text: `❌ ${err.message}` }); }
        return;
    }
    await sock.sendMessage(from, { text: '🔄 Memverifikasi...' });
    try {
        const result = await alightMotion(args[0], args.slice(1).join(' '));
        if (result.success) {
            await sock.sendMessage(from, { text: `✅ PREMIUM BERHASIL!\n\n📧 ${args[0]}\n⭐ PREMIUM\n📅 1 Tahun` });
        } else {
            await sock.sendMessage(from, { text: `❌ ${result.error}` });
        }
    } catch (err) { await sock.sendMessage(from, { text: `❌ ${err.message}` }); }
}

async function cmdSongFess(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) {
        await sock.sendMessage(from, { text: `🎵 *SONGFESS*\n\n${prefix}songfess judul | pesan\nContoh: ${prefix}sf Night Changes | bikin nangis 😭\n\nDikirim ke channel ~5 menit.` });
        return;
    }
    if (args[0] === 'stats') {
        const stats = getSongFessStats();
        await sock.sendMessage(from, { text: `🎵 Stats\n📊 Total: ${stats.total}\n⏳ Antrian: ${stats.pending}\n✅ Hari ini: ${stats.sentToday}` });
        return;
    }
    const parts = args.join(' ').split('|').map(p => p.trim());
    if (!parts[0]) { await sock.sendMessage(from, { text: '❌ Judul tidak boleh kosong!' }); return; }
    if (parts[0].length > 100 || (parts[1]?.length || 0) > 500) { await sock.sendMessage(from, { text: '❌ Judul max 100, pesan max 500 karakter.' }); return; }
    const anonId = `#${from.split('@')[0].slice(-4)}`;
    const id = addSongFess({ title: parts[0], message: parts[1] || '', sender: pushName, anonId, timestamp: Date.now() });
    await sock.sendMessage(from, { text: `✅ SongFess Terkirim!\n\n🎶 ${parts[0]}\n🆔 ${id}\n👤 ${anonId}\n\n⏳ ~5 menit ke channel.` });
}

async function cmdConfess(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) {
        await sock.sendMessage(from, { text: `💌 *MENFESS*\n\n${prefix}menfess 628xxxx|pesan\nContoh: ${prefix}menfess 628123456789|hai 😊\n\n🔒 Anonim. Max 5x/hari.` });
        return;
    }
    if (args[0] === 'stats') {
        const q = getConfessQueue();
        const sn = from.split('@')[0];
        await sock.sendMessage(from, { text: `💌 Stats\n📊 Antrian: ${q.length}\n✉️ Kamu: ${q.filter(c => c.senderNumber === sn).length}/5` });
        return;
    }
    const parts = args.join(' ').split('|').map(p => p.trim());
    const target = parts[0]?.replace(/[^0-9]/g, '') || '';
    const msg = parts.slice(1).join('|').trim();
    if (!target || target.length < 10) { await sock.sendMessage(from, { text: '❌ Nomor tidak valid! 628xxxxxxxxxx' }); return; }
    if (!msg) { await sock.sendMessage(from, { text: '❌ Pesan tidak boleh kosong!' }); return; }
    if (msg.length > 1000) { await sock.sendMessage(from, { text: '❌ Max 1000 karakter!' }); return; }
    const sn = from.split('@')[0];
    if (getConfessQueue().filter(c => c.senderNumber === sn).length >= 5) { await sock.sendMessage(from, { text: '❌ Limit 5x/hari!' }); return; }
    if (target === sn || target === sn.replace(/^62/, '0')) { await sock.sendMessage(from, { text: '😅 Tidak bisa ke diri sendiri!' }); return; }
    const ft = target.startsWith('62') ? target : target.startsWith('0') ? '62' + target.slice(1) : '62' + target;
    const id = addConfess({ targetNumber: ft, targetJid: ft + '@s.whatsapp.net', message: msg, senderName: pushName, senderNumber: sn, anonId: `#${sn.slice(-4)}`, timestamp: Date.now() });
    await sock.sendMessage(from, { text: `✅ Menfess Terkirim!\n\n📱 Ke: ${ft.slice(0,6)}xxxx\n🆔 ${id}\n👤 #${sn.slice(-4)}` });
    try {
        await sock.sendMessage(ft + '@s.whatsapp.net', { text: `💌 *KAMU DAPAT MENFESS!*\n\n_"${msg}"_\n\n👤 Anonim #${sn.slice(-4)}\n🕐 ${new Date().toLocaleString('id-ID')}` });
        removeConfess(id, true);
    } catch (err) { removeConfess(id, false); }
}

async function cmdSticker(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    if (!await checkFfmpeg()) { await sock.sendMessage(from, { text: '❌ FFmpeg tidak terinstall!' }); return; }
    let type = 'full', pack = STICKER_CONFIG.PACK, author = STICKER_CONFIG.AUTHOR;
    args.forEach(a => {
        if (['full','circle','rounded'].includes(a)) type = a;
        else if (a.startsWith('pack=')) pack = a.replace('pack=','').replace(/"/g,'');
        else if (a.startsWith('author=')) author = a.replace('author=','').replace(/"/g,'');
    });
    let has = false, mtype = '', dur = 0;
    if (messageInfo.message?.imageMessage) { has = true; mtype = 'image'; }
    else if (messageInfo.message?.videoMessage) { has = true; mtype = 'video'; dur = messageInfo.message.videoMessage.seconds || 0; }
    if (!has && messageInfo.quotedMessage) {
        const q = messageInfo.quotedMessage;
        if (q.imageMessage) { has = true; mtype = 'image'; }
        else if (q.videoMessage) { has = true; mtype = 'video'; dur = q.videoMessage.seconds || 0; }
    }
    if (!has) {
        await sock.sendMessage(from, { text: `🎨 *STICKER MAKER*\n\nKirim/reply gambar/video (max 15s)\n${prefix}s full | circle | rounded\n\nVideo max 15 detik | File max 10 MB` });
        return;
    }
    if (mtype === 'video' && dur > 15) { await sock.sendMessage(from, { text: `❌ Video terlalu panjang! Max 15 detik.` }); return; }
    await sock.sendMessage(from, { text: '🔄 Membuat sticker...' });
    try {
        const r = await createSticker(sock, messageInfo, { type, pack, author });
        await sock.sendMessage(from, { sticker: r.sticker });
        setTimeout(async () => { await sock.sendMessage(from, { text: `✅ Sticker berhasil! ${r.type === 'animated' ? '🎬 Animasi' : '🖼️ Statis'}` }); }, 500);
    } catch (err) { await sock.sendMessage(from, { text: `❌ ${err.message}` }); }
}

async function cmdSearch(sock, from, args, prefix) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `🔍 ${prefix}search <kata kunci>` }); return; }
    const s = suggestCommand(args.join(' '), 0.1, 10);
    if (s.length === 0) { await sock.sendMessage(from, { text: `🔍 Tidak ditemukan.` }); return; }
    let text = `🔍 Hasil: ${s.length}\n\n`;
    s.forEach(c => { text += `📝 ${prefix}${c.cmd} (${Math.round(c.similarity*100)}%)\n  📖 ${c.desc}\n\n`; });
    await sock.sendMessage(from, { text });
}

async function cmdAddPR(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) { await sock.sendMessage(from, { text: `📚 ${prefix}addpr mapel|deskripsi|deadline\nContoh: ${prefix}addpr MTK|Hal 100|2024-12-20\n📎 Reply file untuk lampiran.` }); return; }
    const p = args.join(' ').split('|').map(x => x.trim());
    if (p[2] && !/^\d{4}-\d{2}-\d{2}$/.test(p[2])) { await sock.sendMessage(from, { text: '❌ Format deadline: YYYY-MM-DD' }); return; }
    let media = null;
    if (messageInfo.quotedMessage) {
        const q = messageInfo.quotedMessage;
        if (q.imageMessage) media = { type: 'image' };
        else if (q.videoMessage) media = { type: 'video' };
        else if (q.documentMessage) media = { type: 'document', filename: q.documentMessage.fileName || 'file' };
    }
    const pr = addPR({ subject: p[0] || 'Umum', description: p[1] || '', deadline: p[2] || null, addedBy: pushName, media });
    const detail = formatPRDetail(pr);
    const targets = getAllTargets();
    for (const ch of targets.channels) { try { await sock.sendMessage(ch.id, { text: `📢 PR BARU!\n\n${detail}` }); } catch (e) {} }
    for (const gr of targets.groups) { try { await sock.sendMessage(gr.id, { text: `📢 PR BARU!\n\n${detail}` }); } catch (e) {} }
    await sock.sendMessage(from, { text: `✅ PR Ditambahkan!\n\n${detail}` });
}

async function cmdDeletePR(sock, from, args) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delpr <id>` }); return; }
    const pr = getPRById(args[0]);
    if (!pr) { await sock.sendMessage(from, { text: '❌ PR tidak ditemukan.' }); return; }
    deletePR(args[0]);
    await sock.sendMessage(from, { text: `✅ PR ${pr.subject} dihapus!` });
}

async function cmdListPR(sock, from, args) {
    const result = formatPRList(getPRs());
    await sock.sendMessage(from, { text: result.text });
}

async function cmdSetOwner(sock, from, args, pushName, userLevel) {
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .setowner <nomor>|<nama>' }); return; }
    const curr = getOwner();
    if (curr.number && userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Owner sudah terdaftar.' }); return; }
    const p = args.join(' ').split('|').map(x => x.trim());
    const num = p[0]?.replace(/[^0-9]/g, '') || '';
    if (num.length < 10) { await sock.sendMessage(from, { text: '❌ Nomor tidak valid!' }); return; }
    setOwner(num, p[1] || pushName);
    await sock.sendMessage(from, { text: `✅ Owner terdaftar!\n👤 ${p[1] || pushName}\n📱 ${num}` });
}

async function cmdAddPartner(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) { await sock.sendMessage(from, { text: `⭐ ${prefix}addpartner nomor|nama` }); return; }
    const p = args.join(' ').split('|').map(x => x.trim());
    const num = p[0]?.replace(/[^0-9]/g, '') || '';
    if (num.length < 10) { await sock.sendMessage(from, { text: '❌ Nomor tidak valid!' }); return; }
    const r = addPartner(num, p[1] || '');
    await sock.sendMessage(from, { text: r.success ? `✅ Partner ${r.partner.name} ditambahkan!` : `❌ ${r.error}` });
}

async function cmdRemovePartner(sock, from, args) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delpartner <nomor>` }); return; }
    const r = removePartner(args[0].replace(/[^0-9]/g, ''));
    await sock.sendMessage(from, { text: r.success ? `✅ Partner dihapus!` : `❌ ${r.error}` });
}

async function cmdListPartners(sock, from) {
    const partners = getPartners();
    if (partners.length === 0) { await sock.sendMessage(from, { text: '⭐ Belum ada partner.' }); return; }
    let text = '⭐ *DAFTAR PARTNER*\n\n';
    partners.forEach((p, i) => { text += `${i + 1}. 👤 ${p.name}\n   📱 ${p.number}\n\n`; });
    await sock.sendMessage(from, { text });
}

async function cmdAddChannel(sock, from, args, pushName) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `📢 ${global.botConfig.prefix}addch id|nama` }); return; }
    const p = args.join(' ').split('|').map(x => x.trim());
    const r = addChannel(p[0] || '', p[1] || '', pushName);
    await sock.sendMessage(from, { text: r.success ? `✅ Channel ${r.channel.name} ditambahkan!` : `❌ ${r.error}` });
}

async function cmdRemoveChannel(sock, from, args) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delch <id>` }); return; }
    const r = removeChannel(args[0]);
    await sock.sendMessage(from, { text: r.success ? '✅ Channel dihapus!' : `❌ ${r.error}` });
}

async function cmdListChannels(sock, from) {
    const chs = getChannels();
    if (chs.length === 0) { await sock.sendMessage(from, { text: '📢 Belum ada channel.' }); return; }
    let text = '📢 *DAFTAR CHANNEL*\n\n';
    chs.forEach(c => { text += `📢 ${c.name}\n   🆔 ${c.id}\n\n`; });
    await sock.sendMessage(from, { text });
}

async function cmdAddGroupCmd(sock, from, args, pushName) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `👥 ${global.botConfig.prefix}addgroup id|nama` }); return; }
    const p = args.join(' ').split('|').map(x => x.trim());
    const r = addGroup(p[0] || '', p[1] || '', pushName);
    await sock.sendMessage(from, { text: r.success ? `✅ Group ${r.group.name} ditambahkan!` : `❌ ${r.error}` });
}

async function cmdRemoveGroupCmd(sock, from, args) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delgroup <id>` }); return; }
    const r = removeGroup(args[0]);
    await sock.sendMessage(from, { text: r.success ? '✅ Group dihapus!' : `❌ ${r.error}` });
}

async function cmdListGroups(sock, from) {
    const grs = getGroups();
    if (grs.length === 0) { await sock.sendMessage(from, { text: '👥 Belum ada group.' }); return; }
    let text = '👥 *DAFTAR GROUP*\n\n';
    grs.forEach(g => { text += `👥 ${g.name}\n   🆔 ${g.id}\n\n`; });
    await sock.sendMessage(from, { text });
}

async function cmdGetId(sock, from, messageInfo) {
    const msg = messageInfo.message;
    let tagged = [];
    if (msg?.extendedTextMessage?.contextInfo?.mentionedJid) tagged = msg.extendedTextMessage.contextInfo.mentionedJid;
    if (tagged.length > 0) {
        let text = '👤 *TAGGED USERS*\n\n';
        tagged.forEach(jid => {
            const id = jid.split('@')[0];
            text += `No: ${id.startsWith('62') ? '0' + id.slice(2) : id}\nID: ${id}\nJID: ${jid}\n\n`;
        });
        await sock.sendMessage(from, { text, mentions: tagged });
        return;
    }
    const type = messageInfo.isChannel ? 'channel' : messageInfo.isGroup ? 'group' : 'private';
    if (type === 'channel') {
        await sock.sendMessage(from, { text: `📢 CHANNEL ID\n\nFull: ${from}\nID: ${from.split('@')[0]}` });
    } else if (type === 'group') {
        try {
            const meta = await sock.groupMetadata(from);
            await sock.sendMessage(from, { text: `👥 GROUP ID\n\nNama: ${meta.subject}\nMember: ${meta.participants.length}\nFull: ${from}\nID: ${from.split('@')[0]}` });
        } catch (e) {
            await sock.sendMessage(from, { text: `👥 GROUP ID\n\nFull: ${from}` });
        }
    } else {
        const id = from.split('@')[0];
        await sock.sendMessage(from, { text: `👤 USER ID\n\nNama: ${messageInfo.pushName}\nNo: ${id.startsWith('62') ? '0' + id.slice(2) : id}\nFull: ${from}\nID: ${id}` });
    }
}

async function cmdPing(sock, from) {
    const start = Date.now();
    const rt = Date.now() - start;
    const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
    const u = process.uptime();
    const d = Math.floor(u/86400), h = Math.floor((u%86400)/3600), m = Math.floor((u%3600)/60), s = Math.floor(u%60);
    await sock.sendMessage(from, { text: `🏓 *PONG!*\n\n🟢 Online\n📊 ${rt}ms\n💾 ${mem} MB\n⏱️ ${d}d ${h}h ${m}m ${s}s\n\n🤖 ${global.botConfig.name}` });
}

async function cmdMyLevel(sock, from, pushName, senderNumber) {
    const level = getUserLevel(senderNumber, pushName);
    let text = `╔══════════════════════╗\n║  👤 LEVEL INFO     ║\n╚══════════════════════╝\n\n`;
    text += `👤 ${pushName}\n⭐ ${getLevelName(level)}\n\n📋 Commands:\n`;
    const cats = { Info:[], Jadwal:[], Reminder:[], Alight:[], SongFess:[], Menfess:[], Sticker:[], PR:[], Partner:[], Channel:[], Auto:[], Utility:[] };
    getPermissionList(level).forEach(p => {
        if (['info','menu','help','owner','walas','mylevel'].includes(p)) cats.Info.push(p);
        else if (['today','tomorrow','mapel','piket','jadwal'].includes(p)) cats.Jadwal.push(p);
        else if (['reminder','sendreminder'].includes(p)) cats.Reminder.push(p);
        else if (['alight','alightmotion','am'].includes(p)) cats.Alight.push(p);
        else if (['songfess','sf'].includes(p)) cats.SongFess.push(p);
        else if (['menfess','confess'].includes(p)) cats.Menfess.push(p);
        else if (['sticker','stiker','s'].includes(p)) cats.Sticker.push(p);
        else if (['addpr','delpr','pr'].includes(p)) cats.PR.push(p);
        else if (['addpartner','delpartner','listpartner'].includes(p)) cats.Partner.push(p);
        else if (['addch','delch','addgroup','delgroup','listch','listgroup'].includes(p)) cats.Channel.push(p);
        else if (['welcome','goodbye','typing','record','read','postsw','reactsw','auto'].includes(p)) cats.Auto.push(p);
        else cats.Utility.push(p);
    });
    for (const [cat, cmds] of Object.entries(cats)) { if (cmds.length > 0) text += `📂 ${cat}: ${cmds.join(', ')}\n`; }
    text += `\n🛍️ Shop: /catalog | /help`;
    await sock.sendMessage(from, { text });
}

async function cmdToggleFeature(sock, from, args, featureName, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    const status = args[0]?.toLowerCase();
    if (!status || (status !== 'on' && status !== 'off')) {
        const f = getFeature(featureName);
        await sock.sendMessage(from, { text: `${f?.status === 'on' ? '🟢' : '🔴'} ${featureName}: ${f?.status?.toUpperCase() || 'OFF'}\n.${featureName} on/off` });
        return;
    }
    const r = toggleFeature(featureName, status);
    if (r.success) {
        await sock.sendMessage(from, { text: `${status === 'on' ? '🟢' : '🔴'} ${featureName} di${status === 'on' ? 'aktif' : 'nonaktif'}kan!` });
        if (featureName === 'autopostsw' && status === 'on') {
            try { await sock.sendMessage('status@broadcast', { text: getAutoPostSWCaption() }); } catch (e) {}
        }
    } else { await sock.sendMessage(from, { text: `❌ ${r.error}` }); }
}

async function cmdSetFeatureMessage(sock, from, args, featureName, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: `📝 .set${featureName} <pesan>` }); return; }
    const r = updateFeatureMessage(featureName, args.join(' '));
    await sock.sendMessage(from, { text: r.success ? `✅ Pesan ${featureName} diupdate!` : `❌ ${r.error}` });
}

async function cmdSetReactEmoji(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: `😍 .setreact <emoji>` }); return; }
    const r = updateFeatureEmoji('autoreactsw', args[0]);
    await sock.sendMessage(from, { text: r.success ? `✅ Emoji: ${args[0]}` : `❌ ${r.error}` });
}

async function cmdSetPostSWCaption(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: `📢 .setpostsw <caption>` }); return; }
    updateAutoPostSWCaption(args.join(' '));
    await sock.sendMessage(from, { text: '✅ Caption Post SW diupdate!' });
}

async function cmdListAutoFeatures(sock, from) {
    const features = [
        { name: 'welcome', label: 'Welcome Canvas' },
        { name: 'goodbye', label: 'Goodbye Canvas' },
        { name: 'autotyping', label: 'Auto Typing' },
        { name: 'autorecord', label: 'Auto Record VN' },
        { name: 'autoread', label: 'Auto Read' },
        { name: 'autopostsw', label: 'Auto Post SW' },
        { name: 'autoreactsw', label: 'Auto React SW' },
    ];
    let text = '⚙️ *AUTO FEATURES*\n\n';
    features.forEach(f => {
        text += `${getFeatureStatus(f.name) ? '🟢' : '🔴'} ${f.label}\n  .${f.name} on/off\n`;
        if (f.name === 'welcome' || f.name === 'goodbye') text += `  .set${f.name} <pesan>\n`;
        if (f.name === 'autoreactsw') text += `  Emoji: ${getFeature('autoreactsw')?.emoji || '❤️'}\n`;
        text += `\n`;
    });
    await sock.sendMessage(from, { text });
}

async function cmdChannelCreate(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chcreate <nama>' }); return; }
    try {
        const r = await sock.newsletterCreate(args.join(' '));
        await sock.sendMessage(from, { text: `✅ Channel dibuat!\n📰 ${args.join(' ')}\n🆔 ${r.id}` });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); }
}

async function cmdChannelFollow(sock, from, args, pushName, userLevel) {
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chfollow <jid>' }); return; }
    try { await sock.newsletterFollow(args[0]); await sock.sendMessage(from, { text: '✅ Berhasil follow!' }); }
    catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); }
}

async function cmdChannelInfo(sock, from, args, pushName, userLevel) {
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chinfo <jid>' }); return; }
    try {
        const meta = await sock.newsletterMetadata('jid', args[0]);
        let text = `📰 CHANNEL INFO\n\n📰 ${meta.name || 'N/A'}\n🆔 ${meta.id || args[0]}\n📝 ${meta.description || 'N/A'}\n👥 ${meta.subscribers || 'N/A'}\n🔗 ${meta.invite || 'N/A'}`;
        await sock.sendMessage(from, { text });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); }
}

async function cmdChannelUpdate(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length < 2) { await sock.sendMessage(from, { text: '❌ .chupdate <jid>|<nama>' }); return; }
    const p = args.join(' ').split('|').map(x => x.trim());
    try { await sock.newsletterUpdateName(p[0], p[1]); await sock.sendMessage(from, { text: `✅ Nama diupdate ke ${p[1]}` }); }
    catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); }
}

async function cmdChannelDelete(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chdelete <jid>' }); return; }
    try { await sock.newsletterDelete(args[0]); await sock.sendMessage(from, { text: '✅ Channel dihapus!' }); }
    catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); }
}

async function cmdShopCatalog(sock, from, args) {
    const catalog = getCatalog();
    if (args.length > 0 && !isNaN(args[0])) {
        await sock.sendMessage(from, { text: formatCarouselText(catalog, parseInt(args[0]) - 1) });
        return;
    }
    if (args.length > 0) {
        const cat = getCategories().find(c => c.toLowerCase().includes(args.join(' ').toLowerCase()));
        if (cat) {
            const products = catalog.filter(p => p.category === cat);
            if (products.length > 0) {
                let text = `📂 ${cat}\n\n`;
                products.forEach(p => { text += `🆔 ${p.id}\n📌 ${p.name}\n💰 ${p.priceDisplay}\n⏱️ ${p.duration}\n\n`; });
                text += `/detail <id> | /buy <id>`;
                await sock.sendMessage(from, { text });
                return;
            }
        }
    }
    await sock.sendMessage(from, { text: formatCarouselText(catalog, 0) + '\n\n💳 /payment | 🏆 /topbuyer | 📋 /help' });
}

async function cmdShopDetail(sock, from, args) {
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ /detail <id>' }); return; }
    const p = getProductById(args[0]);
    if (!p) { await sock.sendMessage(from, { text: '❌ Produk tidak ditemukan.' }); return; }
    let text = `🛍️ ${p.name}\n━━━━━━━━━━━━━━\n\n📂 ${p.category}\n💰 ${p.priceDisplay}\n⏱️ ${p.duration}\n\n📝 ${p.description}\n\n✨ Fitur:\n`;
    p.features.forEach(f => { text += `  ✅ ${f}\n`; });
    text += `\n🛒 /buy ${p.id} | catatan`;
    await sock.sendMessage(from, { text });
}

async function cmdShopBuy(sock, from, args, pushName, senderNumber) {
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ /buy <id> | <catatan>\nContoh: /buy edit-foto | Foto wisuda' }); return; }
    const p = args.join(' ').split('|').map(x => x.trim());
    const product = getProductById(p[0]);
    if (!product) { await sock.sendMessage(from, { text: '❌ Produk tidak ditemukan.' }); return; }
    const buyer = addBuyer({ name: pushName, number: senderNumber, productId: product.id, productName: product.name, productPrice: product.priceDisplay, note: p[1] || '' });
    let text = `🧾 *ORDER BERHASIL!*\n\n🆔 ${buyer.id}\n🛍️ ${product.name}\n💰 ${product.priceDisplay}\n👤 ${pushName}\n📅 ${new Date().toLocaleString('id-ID')}\n\n💡 /mybill ${buyer.id} untuk pembayaran`;
    await sock.sendMessage(from, { text });
    setTimeout(async () => {
        const inv = formatOrderInvoice({ id: buyer.id, productName: product.name, productPrice: product.priceDisplay, customerName: pushName, customerNumber: senderNumber, createdAt: buyer.createdAt }, buyer);
        await sock.sendMessage(from, { text: inv + '\n\n💰 /mybill ' + buyer.id + ' | ⏰ /mybill ' + buyer.id + ' nanti' });
    }, 2000);
}

async function cmdShopMyOrder(sock, from, args, senderNumber) {
    const orders = getBuyerByNumber(senderNumber);
    if (orders.length === 0) { await sock.sendMessage(from, { text: '📦 Belum ada pesanan.' }); return; }
    if (args.length > 0) {
        const o = orders.find(x => x.id === args[0]);
        if (!o) { await sock.sendMessage(from, { text: '❌ Tidak ditemukan.' }); return; }
        let text = `📦 ORDER #${o.id}\n\n🛍️ ${o.productName}\n💰 ${o.productPrice}\n🏷️ ${o.status === 'completed' ? '✅ Selesai' : '⏳ Pending'}\n💳 ${o.paymentStatus === 'paid' ? '✅ LUNAS' : '⏳ BELUM'}\n📅 ${new Date(o.createdAt).toLocaleString('id-ID')}`;
        if (o.note) text += `\n📝 ${o.note}`;
        await sock.sendMessage(from, { text });
        return;
    }
    let text = '📦 *PESANAN SAYA*\n\n';
    orders.forEach(o => { text += `${o.status === 'completed' ? '✅' : '⏳'} ${o.id}\n  🛍️ ${o.productName}\n  💰 ${o.productPrice}\n\n`; });
    text += '/myorder <id> untuk detail';
    await sock.sendMessage(from, { text });
}

async function cmdShopMyBill(sock, from, args, pushName, senderNumber) {
    if (args.length === 0 || args.includes('list')) {
        const bills = getBuyerByNumber(senderNumber).filter(b => b.paymentStatus === 'unpaid');
        if (bills.length === 0) { await sock.sendMessage(from, { text: '💳 Tidak ada tagihan.' }); return; }
        let text = '💳 *TAGIHAN*\n\n';
        bills.forEach(b => { text += `🆔 ${b.id}\n🛍️ ${b.productName}\n💰 ${b.productPrice}\n\n`; });
        text += '/mybill <id> untuk bayar';
        await sock.sendMessage(from, { text });
        return;
    }
    if (args.includes('nanti') || args.includes('later')) {
        const buyer = getBuyerById(args[0]);
        if (!buyer) { await sock.sendMessage(from, { text: '❌ Tidak ditemukan.' }); return; }
        updateBuyer(args[0], { billReminder: (buyer.billReminder || 0) + 1 });
        await sock.sendMessage(from, { text: `⏰ Tagihan ${args[0]} diingatkan.` });
        return;
    }
    const buyer = getBuyerById(args[0]);
    if (!buyer) { await sock.sendMessage(from, { text: '❌ Tidak ditemukan.' }); return; }
    const inv = formatOrderInvoice({ id: buyer.id, productName: buyer.productName, productPrice: buyer.productPrice, customerName: buyer.name, customerNumber: buyer.number, createdAt: buyer.createdAt }, buyer);
    await sock.sendMessage(from, { text: inv });
}

async function cmdShopPayment(sock, from) {
    const methods = getPaymentMethods();
    let text = '💳 *PEMBAYARAN*\n━━━━━━━━━━━━━━\n\n';
    for (const m of methods) {
        const icon = m.type === 'qris' ? '📱' : m.type === 'ewallet' ? '💳' : '🏦';
        text += `${icon} ${m.name}\n   📞 ${m.number}\n`;
        if (m.type === 'qris' && m.qrisImage) {
            text += `   🖼️ QRIS: ${m.qrisImage}\n`;
        }
        text += '\n';
    }
    text += 'Transfer & kirim bukti ke owner.\n⚠️ 1x24 jam';
    const qris = methods.find(m => m.type === 'qris' && m.qrisImage);
    if (qris) {
        try { await sock.sendMessage(from, { image: { url: qris.qrisImage }, caption: text }); return; }
        catch (e) {}
    }
    await sock.sendMessage(from, { text });
}

async function cmdShopDone(sock, from, args, pushName, userLevel) {
    if (userLevel < 1) { await sock.sendMessage(from, { text: '🔒 Partner & owner only.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ /done <buyer_id>' }); return; }
    const buyer = getBuyerById(args[0]);
    if (!buyer) { await sock.sendMessage(from, { text: '❌ Tidak ditemukan.' }); return; }
    updateBuyer(args[0], { status: 'completed', paymentStatus: 'paid' });
    const link = global.botConfig.channelId ? `https://whatsapp.com/channel/${global.botConfig.channelId.split('@')[0]}` : 'https://whatsapp.com/channel/festiveshopid';
    try {
        const canvas = await createThanksCanvas(buyer.name, buyer.productName, link);
        await sock.sendMessage(buyer.number + '@s.whatsapp.net', { image: canvas, caption: `🎉 TERIMA KASIH!\n\n${buyer.name}, pesanan ${buyer.productName} selesai!\n\nFollow: ${link}\n\n🛍️ FestiveShopID` });
    } catch (e) {}
    await sock.sendMessage(from, { text: `✅ Order ${args[0]} selesai! Canvas terkirim.` });
}

async function cmdShopTopBuyer(sock, from) {
    const top = getTopBuyers(10);
    if (top.length === 0) { await sock.sendMessage(from, { text: '🏆 Belum ada buyer.' }); return; }
    let text = '🏆 *TOP BUYERS*\n\n';
    top.forEach((b, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        text += `${medal} ${b.name || b.number}\n   🛍️ ${b.count} order\n\n`;
    });
    await sock.sendMessage(from, { text });
}

async function cmdShopInfo(sock, from) {
    let text = '🛍️ *FESTIVESHOP ID*\n━━━━━━━━━━━━━━\n\n';
    text += `📋 Produk: ${getCatalog().length}\n`;
    text += `💳 Metode: ${getPaymentMethods().length}\n`;
    text += `🏆 Top: ${getTopBuyers(1)[0]?.name || '-'}\n\n`;
    text += '/catalog | /payment | /help';
    await sock.sendMessage(from, { text });
}

async function cmdShopHelp(sock, from) {
    let text = '🛍️ *SHOP HELP*\n━━━━━━━━━━━━━━\n\n';
    text += '/catalog - Katalog\n/detail <id> - Detail\n/buy <id> | note - Order\n/myorder - Pesanan\n/mybill - Tagihan\n/payment - Bayar\n/topbuyer - Top buyer\n/info - Info\n\n';
    text += '💡 1. /catalog\n2. /buy id\n3. Bayar via /payment\n4. Kirim bukti ke owner\n5. Owner /done';
    await sock.sendMessage(from, { text });
}
