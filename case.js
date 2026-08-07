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
const { getFeature, getFeatureStatus, toggleFeature, updateFeatureMessage, updateFeatureEmoji, updateAutoPostSWCaption, getAutoPostSWCaption } = require('./lib/autoFeatures');
const { getUserLevel, hasPermission, getLevelName, addPartner, removePartner, getPartners, getOwner, setOwner, getPermissionList } = require('./lib/permission');
const { getCatalog, getProductById, getCategories, addBuyer, updateBuyer, getBuyerById, getBuyerByNumber, getTopBuyers, formatPaymentMethods, formatOrderInvoice, createThanksCanvas, getPaymentMethods } = require('./lib/shopV2');
const { formatCarouselText } = require('./lib/carousel');
const { getWebStatus, restartWebServer, updateWebPort, getPublicUrl } = require('./lib/webManager');

module.exports = async function(sock, messageInfo) {
    const { from, pushName, isGroup, isChannel, message, key } = messageInfo;
    let text = '', quotedMessage = null;
    
    if (message?.conversation) text = message.conversation;
    else if (message?.extendedTextMessage?.text) { text = message.extendedTextMessage.text; quotedMessage = message.extendedTextMessage.contextInfo?.quotedMessage || null; }
    else if (message?.imageMessage?.caption) { text = message.imageMessage.caption; quotedMessage = message.imageMessage.contextInfo?.quotedMessage || null; }
    else if (message?.videoMessage?.caption) { text = message.videoMessage.caption; quotedMessage = message.videoMessage.contextInfo?.quotedMessage || null; }
    if (!text) return;
    
    const senderNumber = from.split('@')[0];
    const userLevel = getUserLevel(senderNumber, pushName);
    const levelName = getLevelName(userLevel);
    const isMain = text.startsWith(global.botConfig.prefix), isShop = text.startsWith('/');
    if (!isMain && !isShop) return;
    
    const prefix = isShop ? '/' : global.botConfig.prefix;
    const args = text.slice(prefix.length).trim().split(/ +/);
    const cmd = args[0]?.toLowerCase() || '';
    const cargs = args.slice(1);
    
    const ct = isChannel ? 'Ch' : isGroup ? 'Gr' : 'Pv';
    console.log(`⚡ [${ct}] ${levelName} ${pushName}: ${prefix}${cmd}`);
    const einfo = { ...messageInfo, quotedMessage, commandArgs: cargs, prefix };
    
    if (isShop) {
        try {
            switch(cmd) {
                case 'catalog': await cmdShopCatalog(sock, from, cargs); break;
                case 'detail': await cmdShopDetail(sock, from, cargs); break;
                case 'buy': case 'order': await cmdShopBuy(sock, from, cargs, pushName, senderNumber); break;
                case 'myorder': await cmdShopMyOrder(sock, from, cargs, senderNumber); break;
                case 'mybill': await cmdShopMyBill(sock, from, cargs, pushName, senderNumber); break;
                case 'payment': await cmdShopPayment(sock, from); break;
                case 'done': await cmdShopDone(sock, from, cargs, pushName, userLevel); break;
                case 'topbuyer': await cmdShopTopBuyer(sock, from); break;
                case 'info': await cmdShopInfo(sock, from); break;
                case 'help': await cmdShopHelp(sock, from); break;
                default: await sock.sendMessage(from, { text: '❌ /catalog | /help' });
            }
        } catch (e) { await sock.sendMessage(from, { text: '❌ Shop error.' }); }
        return;
    }
    
    if (!hasPermission(senderNumber, cmd, pushName)) {
        await sock.sendMessage(from, { text: `🔒 Akses Ditolak!\nLevel: ${levelName}\nCek: ${prefix}mylevel` });
        return;
    }
    
    try {
        switch(cmd) {
            case 'info': case 'menu': case 'help': case '?': await cmdInfo(sock, from); break;
            case 'owner': case 'pemilik': case 'creator': case 'dev': await cmdOwner(sock, from); break;
            case 'walas': case 'walikelas': case 'guru': case 'teacher': await cmdWalas(sock, from); break;
            case 'today': case 'hariini': case 'sekarang': await cmdToday(sock, from); break;
            case 'tomorrow': case 'besok': case 'reminderbesok': await cmdTomorrow(sock, from); break;
            case 'mapel': case 'pelajaran': case 'matapelajaran': case 'subject': await cmdMapel(sock, from, cargs); break;
            case 'piket': case 'clean': case 'bersih': case 'duty': await cmdPiket(sock, from, cargs); break;
            case 'jadwal': case 'schedule': case 'fullschedule': case 'lengkap': await cmdJadwal(sock, from); break;
            case 'sendreminder': case 'kirimreminder': await cmdSendReminder(sock, from); break;
            case 'reminder': case 'reminders': case 'pengingat': case 'notif': await cmdReminderMenu(sock, from); break;
            case 'alight': case 'alightmotion': case 'am': case 'premium': await cmdAlightMotion(sock, from, cargs); break;
            case 'songfess': case 'sf': case 'song': case 'lagu': await cmdSongFess(sock, from, cargs, pushName); break;
            case 'menfess': case 'confess': case 'confes': case 'menfes': case 'anon': case 'rahasia': await cmdConfess(sock, from, cargs, pushName); break;
            case 'sticker': case 'stiker': case 's': case 'stick': await cmdSticker(sock, from, cargs, pushName, einfo); break;
            case 'search': case 'cari': case 'find': case 'cmd': await cmdSearch(sock, from, cargs, prefix); break;
            case 'addpr': case 'tambahpr': case 'addtugas': await cmdAddPR(sock, from, cargs, pushName, einfo); break;
            case 'delpr': case 'hapuspr': case 'deletepr': await cmdDeletePR(sock, from, cargs); break;
            case 'pr': case 'listpr': case 'tugas': case 'dafpus': await cmdListPR(sock, from, cargs); break;
            case 'setowner': case 'registerowner': await cmdSetOwner(sock, from, cargs, pushName, userLevel); break;
            case 'addpartner': await cmdAddPartner(sock, from, cargs, pushName); break;
            case 'delpartner': case 'removepartner': await cmdRemovePartner(sock, from, cargs); break;
            case 'listpartner': case 'partners': await cmdListPartners(sock, from); break;
            case 'addch': case 'addchannel': await cmdAddChannel(sock, from, cargs, pushName); break;
            case 'delch': case 'removechannel': await cmdRemoveChannel(sock, from, cargs); break;
            case 'listch': case 'channels': await cmdListChannels(sock, from); break;
            case 'addgroup': case 'addgrup': await cmdAddGroupCmd(sock, from, cargs, pushName); break;
            case 'delgroup': case 'removegroup': await cmdRemoveGroupCmd(sock, from, cargs); break;
            case 'listgroup': case 'groups': case 'grup': await cmdListGroups(sock, from); break;
            case 'getid': case 'id': case 'chatid': case 'cekid': case 'myid': await cmdGetId(sock, from, einfo); break;
            case 'ping': case 'cek': case 'test': case 'status': case 'botstatus': await cmdPing(sock, from); break;
            case 'mylevel': case 'level': case 'role': await cmdMyLevel(sock, from, pushName, senderNumber); break;
            case 'welcome': case 'autowelcome': await cmdToggleFeature(sock, from, cargs, 'welcome', pushName, userLevel); break;
            case 'goodbye': case 'autogoodbye': await cmdToggleFeature(sock, from, cargs, 'goodbye', pushName, userLevel); break;
            case 'typing': case 'autotyping': await cmdToggleFeature(sock, from, cargs, 'autotyping', pushName, userLevel); break;
            case 'record': case 'autorecord': await cmdToggleFeature(sock, from, cargs, 'autorecord', pushName, userLevel); break;
            case 'read': case 'autoread': await cmdToggleFeature(sock, from, cargs, 'autoread', pushName, userLevel); break;
            case 'postsw': case 'autopostsw': await cmdToggleFeature(sock, from, cargs, 'autopostsw', pushName, userLevel); break;
            case 'reactsw': case 'autoreactsw': await cmdToggleFeature(sock, from, cargs, 'autoreactsw', pushName, userLevel); break;
            case 'setwelcome': case 'setwelcomemsg': await cmdSetFeatureMessage(sock, from, cargs, 'welcome', pushName, userLevel); break;
            case 'setgoodbye': case 'setgoodbyemsg': await cmdSetFeatureMessage(sock, from, cargs, 'goodbye', pushName, userLevel); break;
            case 'setreact': case 'setreactemoji': await cmdSetReactEmoji(sock, from, cargs, pushName, userLevel); break;
            case 'setpostsw': case 'setpostcaption': await cmdSetPostSWCaption(sock, from, cargs, pushName, userLevel); break;
            case 'auto': case 'autofeatures': await cmdListAutoFeatures(sock, from); break;
            case 'chcreate': await cmdChannelCreate(sock, from, cargs, pushName, userLevel); break;
            case 'chfollow': await cmdChannelFollow(sock, from, cargs, pushName, userLevel); break;
            case 'chinfo': await cmdChannelInfo(sock, from, cargs, pushName, userLevel); break;
            case 'chupdate': await cmdChannelUpdate(sock, from, cargs, pushName, userLevel); break;
            case 'chdelete': await cmdChannelDelete(sock, from, cargs, pushName, userLevel); break;
            case 'web': case 'dashboard': await cmdWebControl(sock, from, cargs, pushName, userLevel); break;
            case 'webstatus': case 'webping': await cmdWebStatus(sock, from, pushName, userLevel); break;
            case 'webport': await cmdWebPort(sock, from, cargs, pushName, userLevel); break;
            case 'webrestart': case 'webrefresh': await cmdWebRestart(sock, from, pushName, userLevel); break;
            case 'weburl': case 'webpublic': await cmdWebUrl(sock, from, pushName, userLevel); break;
            case 'webpreview': await cmdWebPreview(sock, from, pushName, userLevel); break;
            default:
                if (cmd) {
                    const sug = suggestCommand(cmd, 0.3, 5);
                    if (sug.length > 0) await sock.sendMessage(from, { text: formatSuggestion(cmd, sug, prefix) });
                    else await sock.sendMessage(from, { text: `❌ Command *${prefix}${cmd}* tidak ditemukan.\nKetik *${prefix}menu* untuk daftar command.` });
                }
                break;
        }
    } catch (err) { console.error(`❌ ${cmd}:`, err.message); try { await sock.sendMessage(from, { text: '❌ Terjadi kesalahan.' }); } catch (e) {} }
};

async function cmdInfo(sock, from) {
    const p = global.botConfig.prefix;
    let t = `╔══════════════════════╗\n║  🤖 ${global.botConfig.name.padEnd(16)} ║\n║  v${global.botConfig.version} | ${global.botConfig.owner.padEnd(12)} ║\n╚══════════════════════╝\n\n`;
    t += `📋 INFO\n  ${p}info › ${p}owner › ${p}walas › ${p}mylevel\n\n`;
    t += `📅 JADWAL\n  ${p}today › ${p}tomorrow › ${p}mapel › ${p}piket › ${p}jadwal\n\n`;
    t += `🎵 SONGFESS & MENFESS\n  ${p}songfess › ${p}menfess\n\n`;
    t += `🎨 KREATIF\n  ${p}s (sticker) › ${p}alight\n\n`;
    t += `📚 PR\n  ${p}addpr › ${p}pr › ${p}delpr\n\n`;
    t += `⚙️ AUTO\n  ${p}auto › ${p}welcome › ${p}goodbye › ${p}typing\n\n`;
    t += `📰 CHANNEL\n  ${p}chcreate › ${p}chfollow › ${p}chinfo\n\n`;
    t += `🌐 WEB\n  ${p}web › ${p}webstatus › ${p}weburl › ${p}webpreview\n\n`;
    t += `🛠️ UTILITY\n  ${p}search › ${p}getid › ${p}ping\n\n`;
    t += `🛍️ SHOP › /catalog | /help\n⏰ Reminder › 12:00 | 16:00 | 20:00`;
    await sock.sendMessage(from, { text: t });
}

async function cmdOwner(sock, from) {
    const o = getOwner();
    if (!o.number) { await sock.sendMessage(from, { text: '❌ Owner belum terdaftar.\n.setowner <nomor>|<nama>' }); return; }
    const no = o.number.startsWith('62') ? '0' + o.number.slice(2) : o.number;
    await sock.sendMessage(from, { text: `╔══════════════════════╗\n║    👤 OWNER BOT     ║\n╚══════════════════════╝\n\n👤 ${o.name}\n📞 ${no}\n🔗 https://wa.me/${o.number}` });
}

async function cmdWalas(sock, from) { await sock.sendMessage(from, { text: `👩‍🏫 WALI KELAS 8C\n\n👤 Ibu Sari, S.Pd.\n🏫 Kelas 8C\n📞 081234567890\n🕐 Senin-Jumat 08-14 | Sabtu 08-12\n📍 Kantor Guru Lt. 2` }); }

async function cmdToday(sock, from) { try { await sock.sendMessage(from, { text: schoolData.formatReminderText(schoolData.getTodayReminder()) }); } catch (e) { await sock.sendMessage(from, { text: '❌ Gagal.' }); } }
async function cmdTomorrow(sock, from) { try { await sock.sendMessage(from, { text: schoolData.formatReminderText(schoolData.getTomorrowReminder()) }); } catch (e) { await sock.sendMessage(from, { text: '❌ Gagal.' }); } }

async function cmdMapel(sock, from, args) {
    const p = global.botConfig.prefix;
    if (args.length === 0) { await sock.sendMessage(from, { text: `📅 ${p}mapel senin/1 | selasa/2 | rabu/3 | kamis/4 | jumat/5` }); return; }
    const r = schoolData.getScheduleByDay(args[0]);
    if (!r) { await sock.sendMessage(from, { text: '❌ Hari tidak valid.' }); return; }
    let t = `📅 JADWAL ${r.day.toUpperCase()}\n\n`;
    Object.entries(r.schedule).forEach(([k, l]) => { t += l.subject === 'ISTIRAHAT' ? `🍽️ Istirahat (${l.time})\n\n` : `📚 Jam ${k}\n📖 ${l.subject} | ⏰ ${l.time} | 👨‍🏫 ${l.teacher}\n\n`; });
    await sock.sendMessage(from, { text: t });
}

async function cmdPiket(sock, from, args) {
    const p = global.botConfig.prefix;
    if (args.length === 0) { await sock.sendMessage(from, { text: `🧹 ${p}piket senin/1 | selasa/2 | rabu/3 | kamis/4 | jumat/5` }); return; }
    const r = schoolData.getPiketByDay(args[0]);
    if (!r) { await sock.sendMessage(from, { text: '❌ Hari tidak valid.' }); return; }
    let t = `🧹 PIKET ${r.day.toUpperCase()}\n\n👥 Anggota:\n`;
    r.members.forEach((n, i) => { t += `  ${i + 1}. ${n}\n`; });
    t += `\n📌 Bersihkan kelas, hapus papan, rapikan meja, buang sampah, sapu & pel.`;
    await sock.sendMessage(from, { text: t });
}

async function cmdJadwal(sock, from) {
    try {
        let t = `📚 JADWAL LENGKAP\n\n📅 PELAJARAN\n`;
        const fs = schoolData.getFullSchedule();
        for (const [d, ls] of Object.entries(fs)) { t += `\n📆 ${d.toUpperCase()}\n`; Object.values(ls).forEach(l => { t += l.subject === 'ISTIRAHAT' ? `  🍽️ Istirahat (${l.time})\n` : `  📖 ${l.subject} (${l.time})\n`; }); }
        t += `\n🧹 PIKET\n`;
        const fp = schoolData.getFullPiket();
        for (const [d, ms] of Object.entries(fp)) { t += `\n📆 ${d.toUpperCase()}: ${ms.join(', ')}\n`; }
        if (t.length > 4000) { for (const pt of t.match(/[\s\S]{1,4000}/g) || [t]) { await sock.sendMessage(from, { text: pt }); await new Promise(r => setTimeout(r, 500)); } }
        else await sock.sendMessage(from, { text: t });
    } catch (e) { await sock.sendMessage(from, { text: '❌ Gagal.' }); }
}

async function cmdSendReminder(sock, from) {
    await sock.sendMessage(from, { text: '🔄 Mengirim...' });
    try { await reminderSystem.sendManualReminder(); await sock.sendMessage(from, { text: '✅ Reminder terkirim!' }); }
    catch (e) { await sock.sendMessage(from, { text: '❌ Gagal.' }); }
}

async function cmdReminderMenu(sock, from) { await sock.sendMessage(from, { text: `⏰ REMINDER\n🟢 AKTIF\n🕐 12:00 | 16:00 | 20:00\n📅 Senin-Jumat\n.tomorrow | .sendreminder` }); }

async function cmdAlightMotion(sock, from, args) {
    const p = global.botConfig.prefix;
    if (args.length === 0) { await sock.sendMessage(from, { text: `✨ ALIGHT MOTION\n${p}alight email\n${p}alight email link\nContoh: ${p}alight user@gmail.com` }); return; }
    if (args.length === 1) {
        if (!args[0].includes('@')) { await sock.sendMessage(from, { text: '❌ Email tidak valid!' }); return; }
        await sock.sendMessage(from, { text: `🔄 Mengirim ke ${args[0]}...` });
        try { const r = await alightMotion(args[0]); await sock.sendMessage(from, { text: r.success ? `✅ Magic link terkirim!\n📧 ${args[0]}\nBuka inbox, copy link.\n${p}alight ${args[0]} <link>` : `❌ ${r.error}` }); }
        catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); }
        return;
    }
    await sock.sendMessage(from, { text: '🔄 Verifikasi...' });
    try { const r = await alightMotion(args[0], args.slice(1).join(' ')); await sock.sendMessage(from, { text: r.success ? `✅ PREMIUM!\n📧 ${args[0]}\n⭐ 1 Tahun` : `❌ ${r.error}` }); }
    catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); }
}

async function cmdSongFess(sock, from, args, pushName) {
    const p = global.botConfig.prefix;
    if (args.length === 0) { await sock.sendMessage(from, { text: `🎵 SONGFESS\n${p}sf judul | pesan\nContoh: ${p}sf Night Changes | bikin nangis 😭` }); return; }
    if (args[0] === 'stats') { const s = getSongFessStats(); await sock.sendMessage(from, { text: `🎵 Stats\n📊 ${s.total} | ⏳ ${s.pending} | ✅ ${s.sentToday}` }); return; }
    const pt = args.join(' ').split('|').map(x => x.trim());
    if (!pt[0]) { await sock.sendMessage(from, { text: '❌ Judul kosong!' }); return; }
    if (pt[0].length > 100 || (pt[1]?.length || 0) > 500) { await sock.sendMessage(from, { text: '❌ Max 100/500 karakter.' }); return; }
    const id = addSongFess({ title: pt[0], message: pt[1] || '', sender: pushName, anonId: `#${from.split('@')[0].slice(-4)}`, timestamp: Date.now() });
    await sock.sendMessage(from, { text: `✅ Terkirim!\n🎶 ${pt[0]}\n🆔 ${id}\n⏳ ~5 menit` });
}

async function cmdConfess(sock, from, args, pushName) {
    const p = global.botConfig.prefix;
    if (args.length === 0) { await sock.sendMessage(from, { text: `💌 MENFESS\n${p}menfess 628xxxx|pesan\n🔒 Anonim. Max 5x/hari.` }); return; }
    if (args[0] === 'stats') { const q = getConfessQueue(); const sn = from.split('@')[0]; await sock.sendMessage(from, { text: `💌 Stats\n📊 ${q.length} | ✉️ ${q.filter(c => c.senderNumber === sn).length}/5` }); return; }
    const pt = args.join(' ').split('|').map(x => x.trim());
    const tg = pt[0]?.replace(/[^0-9]/g, '') || '';
    const msg = pt.slice(1).join('|').trim();
    if (!tg || tg.length < 10) { await sock.sendMessage(from, { text: '❌ Nomor tidak valid!' }); return; }
    if (!msg) { await sock.sendMessage(from, { text: '❌ Pesan kosong!' }); return; }
    if (msg.length > 1000) { await sock.sendMessage(from, { text: '❌ Max 1000 karakter!' }); return; }
    const sn = from.split('@')[0];
    if (getConfessQueue().filter(c => c.senderNumber === sn).length >= 5) { await sock.sendMessage(from, { text: '❌ Limit 5x!' }); return; }
    if (tg === sn || tg === sn.replace(/^62/, '0')) { await sock.sendMessage(from, { text: '😅 Tidak bisa ke sendiri!' }); return; }
    const ft = tg.startsWith('62') ? tg : tg.startsWith('0') ? '62' + tg.slice(1) : '62' + tg;
    const cid = addConfess({ targetNumber: ft, targetJid: ft + '@s.whatsapp.net', message: msg, senderName: pushName, senderNumber: sn, anonId: `#${sn.slice(-4)}`, timestamp: Date.now() });
    await sock.sendMessage(from, { text: `✅ Terkirim!\n📱 ${ft.slice(0,6)}xxxx\n🆔 ${cid}` });
    try { await sock.sendMessage(ft + '@s.whatsapp.net', { text: `💌 KAMU DAPAT MENFESS!\n\n_"${msg}"_\n\n👤 Anonim #${sn.slice(-4)}\n🕐 ${new Date().toLocaleString('id-ID')}` }); removeConfess(cid, true); }
    catch (e) { removeConfess(cid, false); }
}

async function cmdSticker(sock, from, args, pushName, einfo) {
    const p = global.botConfig.prefix;
    if (!await checkFfmpeg()) { await sock.sendMessage(from, { text: '❌ FFmpeg tidak ada!' }); return; }
    let tp = 'full', pk = STICKER_CONFIG.PACK, au = STICKER_CONFIG.AUTHOR;
    args.forEach(a => { if (['full','circle','rounded'].includes(a)) tp = a; else if (a.startsWith('pack=')) pk = a.replace('pack=','').replace(/"/g,''); else if (a.startsWith('author=')) au = a.replace('author=','').replace(/"/g,''); });
    let has = false, mt = '', dr = 0;
    if (einfo.message?.imageMessage) { has = true; mt = 'image'; } else if (einfo.message?.videoMessage) { has = true; mt = 'video'; dr = einfo.message.videoMessage.seconds || 0; }
    if (!has && einfo.quotedMessage) { const q = einfo.quotedMessage; if (q.imageMessage) { has = true; mt = 'image'; } else if (q.videoMessage) { has = true; mt = 'video'; dr = q.videoMessage.seconds || 0; } }
    if (!has) { await sock.sendMessage(from, { text: `🎨 STICKER\nKirim/reply gambar/video\n${p}s full | circle | rounded\nMax 15 detik` }); return; }
    if (mt === 'video' && dr > 15) { await sock.sendMessage(from, { text: '❌ Max 15 detik!' }); return; }
    await sock.sendMessage(from, { text: '🔄 Membuat...' });
    try { const r = await createSticker(sock, einfo, { type: tp, pack: pk, author: au }); await sock.sendMessage(from, { sticker: r.sticker }); setTimeout(async () => { await sock.sendMessage(from, { text: `✅ ${r.type === 'animated' ? '🎬' : '🖼️'}` }); }, 500); }
    catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); }
}

async function cmdSearch(sock, from, args, p) { if (args.length === 0) { await sock.sendMessage(from, { text: `🔍 ${p}search <kata>` }); return; } const s = suggestCommand(args.join(' '), 0.1, 10); if (s.length === 0) { await sock.sendMessage(from, { text: '🔍 Tidak ada.' }); return; } let t = `🔍 ${s.length} hasil\n\n`; s.forEach(c => { t += `📝 ${p}${c.cmd} (${Math.round(c.similarity*100)}%)\n${c.desc}\n\n`; }); await sock.sendMessage(from, { text: t }); }

async function cmdAddPR(sock, from, args, pushName, einfo) {
    const p = global.botConfig.prefix;
    if (args.length === 0) { await sock.sendMessage(from, { text: `📚 ${p}addpr mapel|deskripsi|deadline\nContoh: ${p}addpr MTK|Hal 100|2024-12-20` }); return; }
    const pt = args.join(' ').split('|').map(x => x.trim());
    if (pt[2] && !/^\d{4}-\d{2}-\d{2}$/.test(pt[2])) { await sock.sendMessage(from, { text: '❌ Format: YYYY-MM-DD' }); return; }
    let md = null; if (einfo.quotedMessage) { const q = einfo.quotedMessage; if (q.imageMessage) md = { type: 'image' }; else if (q.videoMessage) md = { type: 'video' }; else if (q.documentMessage) md = { type: 'doc', filename: q.documentMessage.fileName || 'file' }; }
    const pr = addPR({ subject: pt[0] || 'Umum', description: pt[1] || '', deadline: pt[2] || null, addedBy: pushName, media: md });
    const dt = formatPRDetail(pr); const tgs = getAllTargets();
    for (const ch of tgs.channels) { try { await sock.sendMessage(ch.id, { text: `📢 PR BARU!\n\n${dt}` }); } catch (e) {} }
    for (const gr of tgs.groups) { try { await sock.sendMessage(gr.id, { text: `📢 PR BARU!\n\n${dt}` }); } catch (e) {} }
    await sock.sendMessage(from, { text: `✅ PR Ditambahkan!\n\n${dt}` });
}

async function cmdDeletePR(sock, from, args) { if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delpr <id>` }); return; } const pr = getPRById(args[0]); if (!pr) { await sock.sendMessage(from, { text: '❌ Tidak ditemukan.' }); return; } deletePR(args[0]); await sock.sendMessage(from, { text: `✅ ${pr.subject} dihapus!` }); }
async function cmdListPR(sock, from, args) { await sock.sendMessage(from, { text: formatPRList(getPRs()).text }); }

async function cmdSetOwner(sock, from, args, pushName, ul) { if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .setowner <nomor>|<nama>' }); return; } const co = getOwner(); if (co.number && ul < 2) { await sock.sendMessage(from, { text: '🔒 Owner sudah ada.' }); return; } const pt = args.join(' ').split('|').map(x => x.trim()); const nm = pt[0]?.replace(/[^0-9]/g, '') || ''; if (nm.length < 10) { await sock.sendMessage(from, { text: '❌ Nomor tidak valid!' }); return; } setOwner(nm, pt[1] || pushName); await sock.sendMessage(from, { text: `✅ Owner: ${pt[1] || pushName}` }); }
async function cmdAddPartner(sock, from, args, pushName) { const p = global.botConfig.prefix; if (args.length === 0) { await sock.sendMessage(from, { text: `⭐ ${p}addpartner nomor|nama` }); return; } const pt = args.join(' ').split('|').map(x => x.trim()); const nm = pt[0]?.replace(/[^0-9]/g, '') || ''; if (nm.length < 10) { await sock.sendMessage(from, { text: '❌ Nomor tidak valid!' }); return; } const r = addPartner(nm, pt[1] || ''); await sock.sendMessage(from, { text: r.success ? `✅ ${r.partner.name}` : `❌ ${r.error}` }); }
async function cmdRemovePartner(sock, from, args) { if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delpartner <nomor>` }); return; } const r = removePartner(args[0].replace(/[^0-9]/g, '')); await sock.sendMessage(from, { text: r.success ? '✅ Dihapus!' : `❌ ${r.error}` }); }
async function cmdListPartners(sock, from) { const ps = getPartners(); if (ps.length === 0) { await sock.sendMessage(from, { text: '⭐ Belum ada.' }); return; } let t = '⭐ PARTNER\n\n'; ps.forEach((p, i) => { t += `${i + 1}. ${p.name} (${p.number})\n`; }); await sock.sendMessage(from, { text: t }); }

async function cmdAddChannel(sock, from, args, pushName) { if (args.length === 0) { await sock.sendMessage(from, { text: `📢 ${global.botConfig.prefix}addch id|nama` }); return; } const pt = args.join(' ').split('|').map(x => x.trim()); const r = addChannel(pt[0] || '', pt[1] || '', pushName); await sock.sendMessage(from, { text: r.success ? `✅ ${r.channel.name}` : `❌ ${r.error}` }); }
async function cmdRemoveChannel(sock, from, args) { if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delch <id>` }); return; } const r = removeChannel(args[0]); await sock.sendMessage(from, { text: r.success ? '✅ Dihapus!' : `❌ ${r.error}` }); }
async function cmdListChannels(sock, from) { const cs = getChannels(); if (cs.length === 0) { await sock.sendMessage(from, { text: '📢 Belum ada.' }); return; } let t = '📢 CHANNEL\n\n'; cs.forEach(c => { t += `${c.name} (${c.id})\n`; }); await sock.sendMessage(from, { text: t }); }

async function cmdAddGroupCmd(sock, from, args, pushName) { if (args.length === 0) { await sock.sendMessage(from, { text: `👥 ${global.botConfig.prefix}addgroup id|nama` }); return; } const pt = args.join(' ').split('|').map(x => x.trim()); const r = addGroup(pt[0] || '', pt[1] || '', pushName); await sock.sendMessage(from, { text: r.success ? `✅ ${r.group.name}` : `❌ ${r.error}` }); }
async function cmdRemoveGroupCmd(sock, from, args) { if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delgroup <id>` }); return; } const r = removeGroup(args[0]); await sock.sendMessage(from, { text: r.success ? '✅ Dihapus!' : `❌ ${r.error}` }); }
async function cmdListGroups(sock, from) { const gs = getGroups(); if (gs.length === 0) { await sock.sendMessage(from, { text: '👥 Belum ada.' }); return; } let t = '👥 GROUP\n\n'; gs.forEach(g => { t += `${g.name} (${g.id})\n`; }); await sock.sendMessage(from, { text: t }); }

async function cmdGetId(sock, from, einfo) {
    const m = einfo.message; let tg = []; if (m?.extendedTextMessage?.contextInfo?.mentionedJid) tg = m.extendedTextMessage.contextInfo.mentionedJid;
    if (tg.length > 0) { let t = '👤 TAGGED\n\n'; tg.forEach(j => { const id = j.split('@')[0]; t += `${id.startsWith('62') ? '0' + id.slice(2) : id}\nID: ${id}\n\n`; }); await sock.sendMessage(from, { text: t, mentions: tg }); return; }
    const tp = einfo.isChannel ? 'ch' : einfo.isGroup ? 'gr' : 'pv';
    if (tp === 'ch') await sock.sendMessage(from, { text: `📢 CH ID\nFull: ${from}\nID: ${from.split('@')[0]}` });
    else if (tp === 'gr') { try { const mt = await sock.groupMetadata(from); await sock.sendMessage(from, { text: `👥 GR ID\n${mt.subject}\n${mt.participants.length} member\n${from}` }); } catch (e) { await sock.sendMessage(from, { text: `👥 GR ID\n${from}` }); } }
    else { const id = from.split('@')[0]; await sock.sendMessage(from, { text: `👤 USER\n${einfo.pushName}\n${id.startsWith('62') ? '0' + id.slice(2) : id}\n${from}` }); }
}

async function cmdPing(sock, from) { const s = Date.now(), rt = Date.now() - s, mm = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100, u = process.uptime(), d = Math.floor(u/86400), h = Math.floor((u%86400)/3600), m = Math.floor((u%3600)/60), sec = Math.floor(u%60); await sock.sendMessage(from, { text: `🏓 PONG!\n🟢 Online\n📊 ${rt}ms\n💾 ${mm} MB\n⏱️ ${d}d ${h}h ${m}m ${sec}s\n🤖 ${global.botConfig.name}` }); }

async function cmdMyLevel(sock, from, pushName, sn) { const lv = getUserLevel(sn, pushName); let t = `⭐ LEVEL\n👤 ${pushName}\n${getLevelName(lv)}\n\n📋 `; const cs = { Info:[], Jadwal:[], Reminder:[], Alight:[], SongFess:[], Menfess:[], Sticker:[], PR:[], Partner:[], Channel:[], Auto:[], Web:[], Utility:[] }; getPermissionList(lv).forEach(p => { if (['info','menu','help','owner','walas','mylevel'].includes(p)) cs.Info.push(p); else if (['today','tomorrow','mapel','piket','jadwal'].includes(p)) cs.Jadwal.push(p); else if (['reminder','sendreminder'].includes(p)) cs.Reminder.push(p); else if (['alight','alightmotion','am'].includes(p)) cs.Alight.push(p); else if (['songfess','sf'].includes(p)) cs.SongFess.push(p); else if (['menfess','confess'].includes(p)) cs.Menfess.push(p); else if (['sticker','stiker','s'].includes(p)) cs.Sticker.push(p); else if (['addpr','delpr','pr'].includes(p)) cs.PR.push(p); else if (['addpartner','delpartner','listpartner'].includes(p)) cs.Partner.push(p); else if (['addch','delch','addgroup','delgroup','listch','listgroup'].includes(p)) cs.Channel.push(p); else if (['welcome','goodbye','typing','record','read','postsw','reactsw','auto'].includes(p)) cs.Auto.push(p); else if (['web','webstatus','weburl','webpreview','webport','webrestart'].includes(p)) cs.Web.push(p); else cs.Utility.push(p); }); for (const [c, cm] of Object.entries(cs)) { if (cm.length > 0) t += `${c}: ${cm.join(', ')}\n`; } t += `\n🛍️ /catalog | /help`; await sock.sendMessage(from, { text: t }); }

async function cmdToggleFeature(sock, from, args, fn, pushName, ul) { if (ul < 2) { await sock.sendMessage(from, { text: '🔒 Owner only.' }); return; } const st = args[0]?.toLowerCase(); if (!st || (st !== 'on' && st !== 'off')) { const f = getFeature(fn); await sock.sendMessage(from, { text: `${f?.status === 'on' ? '🟢' : '🔴'} ${fn}: ${f?.status?.toUpperCase() || 'OFF'}\n.${fn} on/off` }); return; } const r = toggleFeature(fn, st); if (r.success) { await sock.sendMessage(from, { text: `${st === 'on' ? '🟢' : '🔴'} ${fn} di${st === 'on' ? 'aktif' : 'nonaktif'}kan!` }); if (fn === 'autopostsw' && st === 'on') { try { await sock.sendMessage('status@broadcast', { text: getAutoPostSWCaption() }); } catch (e) {} } } else { await sock.sendMessage(from, { text: `❌ ${r.error}` }); } }
async function cmdSetFeatureMessage(sock, from, args, fn, pushName, ul) { if (ul < 2) { await sock.sendMessage(from, { text: '🔒 Owner only.' }); return; } if (args.length === 0) { await sock.sendMessage(from, { text: `📝 .set${fn} <pesan>` }); return; } updateFeatureMessage(fn, args.join(' ')); await sock.sendMessage(from, { text: `✅ Pesan ${fn} diupdate!` }); }
async function cmdSetReactEmoji(sock, from, args, pushName, ul) { if (ul < 2) { await sock.sendMessage(from, { text: '🔒 Owner only.' }); return; } if (args.length === 0) { await sock.sendMessage(from, { text: `😍 .setreact <emoji>` }); return; } updateFeatureEmoji('autoreactsw', args[0]); await sock.sendMessage(from, { text: `✅ ${args[0]}` }); }
async function cmdSetPostSWCaption(sock, from, args, pushName, ul) { if (ul < 2) { await sock.sendMessage(from, { text: '🔒 Owner only.' }); return; } if (args.length === 0) { await sock.sendMessage(from, { text: `📢 .setpostsw <caption>` }); return; } updateAutoPostSWCaption(args.join(' ')); await sock.sendMessage(from, { text: '✅ Caption diupdate!' }); }

async function cmdListAutoFeatures(sock, from) {
    const fs = [{ n: 'welcome', l: 'Welcome Canvas' },{ n: 'goodbye', l: 'Goodbye Canvas' },{ n: 'autotyping', l: 'Auto Typing' },{ n: 'autorecord', l: 'Auto Record' },{ n: 'autoread', l: 'Auto Read' },{ n: 'autopostsw', l: 'Auto Post SW' },{ n: 'autoreactsw', l: 'Auto React SW' }];
    let t = '⚙️ AUTO FEATURES\n\n'; fs.forEach(f => { t += `${getFeatureStatus(f.n) ? '🟢' : '🔴'} ${f.l}\n  .${f.n} on/off\n`; if (f.n === 'welcome' || f.n === 'goodbye') t += `  .set${f.n} <pesan>\n`; if (f.n === 'autoreactsw') t += `  Emoji: ${getFeature('autoreactsw')?.emoji || '❤️'}\n`; t += '\n'; });
    await sock.sendMessage(from, { text: t });
}

async function cmdChannelCreate(sock, from, args, pushName, ul) { if (ul < 2) { await sock.sendMessage(from, { text: '🔒 Owner.' }); return; } if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chcreate <nama>' }); return; } try { const r = await sock.newsletterCreate(args.join(' ')); await sock.sendMessage(from, { text: `✅ Channel dibuat!\n📰 ${args.join(' ')}\n🆔 ${r.id}` }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); } }
async function cmdChannelFollow(sock, from, args) { if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chfollow <jid>' }); return; } try { await sock.newsletterFollow(args[0]); await sock.sendMessage(from, { text: '✅ Followed!' }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); } }
async function cmdChannelInfo(sock, from, args) { if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chinfo <jid>' }); return; } try { const mt = await sock.newsletterMetadata('jid', args[0]); await sock.sendMessage(from, { text: `📰 ${mt.name || 'N/A'}\n🆔 ${mt.id}\n👥 ${mt.subscribers || 'N/A'}\n🔗 ${mt.invite || 'N/A'}` }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); } }
async function cmdChannelUpdate(sock, from, args, pushName, ul) { if (ul < 2) { await sock.sendMessage(from, { text: '🔒 Owner.' }); return; } if (args.length < 2) { await sock.sendMessage(from, { text: '❌ .chupdate <jid>|<nama>' }); return; } const pt = args.join(' ').split('|').map(x => x.trim()); try { await sock.newsletterUpdateName(pt[0], pt[1]); await sock.sendMessage(from, { text: `✅ ${pt[1]}` }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); } }
async function cmdChannelDelete(sock, from, args, pushName, ul) { if (ul < 2) { await sock.sendMessage(from, { text: '🔒 Owner.' }); return; } if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chdelete <jid>' }); return; } try { await sock.newsletterDelete(args[0]); await sock.sendMessage(from, { text: '✅ Dihapus!' }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); } }

async function cmdWebControl(sock, from, args, pushName, ul) { if (ul < 1) { await sock.sendMessage(from, { text: '🔒 Partner+.' }); return; } let t = `🌐 WEB CONTROL\n\n.webstatus - Status\n.weburl - URL publik\n.webport <port> - Ganti port\n.webrestart - Restart\n.webpreview - Preview`; await sock.sendMessage(from, { text: t }); }
async function cmdWebStatus(sock, from, pushName, ul) { if (ul < 1) { await sock.sendMessage(from, { text: '🔒 Partner+.' }); return; } try { const s = getWebStatus(); let t = `📊 WEB STATUS\n\n🟢 Running\n🔌 Port: ${s.port}\n🌍 ${s.publicUrl}\n⏱️ ${Math.floor(s.uptime/3600)}h ${Math.floor((s.uptime%3600)/60)}m\n💾 ${Math.round(s.memory)} MB`; await sock.sendMessage(from, { text: t }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); } }
async function cmdWebPort(sock, from, args, pushName, ul) { if (ul < 2) { await sock.sendMessage(from, { text: '🔒 Owner.' }); return; } if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .webport <port>' }); return; } const pt = parseInt(args[0]); if (isNaN(pt) || pt < 1024) { await sock.sendMessage(from, { text: '❌ Port 1024-65535' }); return; } try { await updateWebPort(pt, sock); await sock.sendMessage(from, { text: `✅ Port: ${pt}` }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); } }
async function cmdWebRestart(sock, from, pushName, ul) { if (ul < 1) { await sock.sendMessage(from, { text: '🔒 Partner+.' }); return; } await sock.sendMessage(from, { text: '🔄 Restarting...' }); try { await restartWebServer(sock); const s = getWebStatus(); await sock.sendMessage(from, { text: `✅ Restarted!\n🌍 ${s.publicUrl}` }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }); } }
async function cmdWebUrl(sock, from, pushName, ul) { if (ul < 1) { await sock.sendMessage(from, { text: '🔒 Partner+.' }); return; } const s = getWebStatus(); await sock.sendMessage(from, { text: `🌍 WEB URL\n\n🔗 http://localhost:${s.port}\n🌐 ${s.publicUrl}` }); }
async function cmdWebPreview(sock, from, pushName, ul) { if (ul < 1) { await sock.sendMessage(from, { text: '🔒 Partner+.' }); return; } const s = getWebStatus(); let t = `🖼️ WEB PREVIEW\n\n🤖 ${global.botConfig.name} v${global.botConfig.version}\n📊 Running on port ${s.port}\n⏱️ ${Math.floor(s.uptime/3600)}h ${Math.floor((s.uptime%3600)/60)}m\n💾 ${Math.round(s.memory)} MB\n\n📋 Fitur: Dashboard, PR, Jadwal, Piket, Kirim Pesan, Feedback, Settings\n\n🌍 ${s.publicUrl}`; await sock.sendMessage(from, { text: t }); }

async function cmdShopCatalog(sock, from, args) { const c = getCatalog(); if (args.length > 0 && !isNaN(args[0])) { await sock.sendMessage(from, { text: formatCarouselText(c, parseInt(args[0]) - 1) }); return; } if (args.length > 0) { const ct = getCategories().find(x => x.toLowerCase().includes(args.join(' ').toLowerCase())); if (ct) { const ps = c.filter(p => p.category === ct); if (ps.length > 0) { let t = `📂 ${ct}\n\n`; ps.forEach(p => { t += `🆔 ${p.id}\n📌 ${p.name}\n💰 ${p.priceDisplay}\n⏱️ ${p.duration}\n\n`; }); t += `/detail <id> | /buy <id>`; await sock.sendMessage(from, { text: t }); return; } } } await sock.sendMessage(from, { text: formatCarouselText(c, 0) + '\n\n💳 /payment | 🏆 /topbuyer' }); }
async function cmdShopDetail(sock, from, args) { if (args.length === 0) { await sock.sendMessage(from, { text: '❌ /detail <id>' }); return; } const p = getProductById(args[0]); if (!p) { await sock.sendMessage(from, { text: '❌ Tidak ditemukan.' }); return; } let t = `🛍️ ${p.name}\n\n📂 ${p.category}\n💰 ${p.priceDisplay}\n⏱️ ${p.duration}\n\n📝 ${p.description}\n\n✨ `; p.features.forEach(f => { t += `✅ ${f}\n`; }); t += `\n🛒 /buy ${p.id}`; await sock.sendMessage(from, { text: t }); }
async function cmdShopBuy(sock, from, args, pushName, sn) { if (args.length === 0) { await sock.sendMessage(from, { text: '❌ /buy <id> | <catatan>' }); return; } const pt = args.join(' ').split('|').map(x => x.trim()); const p = getProductById(pt[0]); if (!p) { await sock.sendMessage(from, { text: '❌ Tidak ditemukan.' }); return; } const b = addBuyer({ name: pushName, number: sn, productId: p.id, productName: p.name, productPrice: p.priceDisplay, note: pt[1] || '' }); let t = `🧾 ORDER!\n\n🆔 ${b.id}\n🛍️ ${p.name}\n💰 ${p.priceDisplay}\n👤 ${pushName}\n📅 ${new Date().toLocaleString('id-ID')}\n\n💡 /mybill ${b.id}`; await sock.sendMessage(from, { text: t }); setTimeout(async () => { const inv = formatOrderInvoice({ id: b.id, productName: p.name, productPrice: p.priceDisplay, customerName: pushName, customerNumber: sn, createdAt: b.createdAt }, b); await sock.sendMessage(from, { text: inv + '\n\n💰 /mybill ' + b.id + ' | ⏰ /mybill ' + b.id + ' nanti' }); }, 2000); }
async function cmdShopMyOrder(sock, from, args, sn) { const os = getBuyerByNumber(sn); if (os.length === 0) { await sock.sendMessage(from, { text: '📦 Belum ada.' }); return; } if (args.length > 0) { const o = os.find(x => x.id === args[0]); if (!o) { await sock.sendMessage(from, { text: '❌ Tidak ditemukan.' }); return; } let t = `📦 #${o.id}\n🛍️ ${o.productName}\n💰 ${o.productPrice}\n🏷️ ${o.status === 'completed' ? '✅' : '⏳'}\n💳 ${o.paymentStatus === 'paid' ? '✅' : '⏳'}`; if (o.note) t += `\n📝 ${o.note}`; await sock.sendMessage(from, { text: t }); return; } let t = '📦 PESANAN\n\n'; os.forEach(o => { t += `${o.status === 'completed' ? '✅' : '⏳'} ${o.id}\n${o.productName}\n${o.productPrice}\n\n`; }); t += '/myorder <id>'; await sock.sendMessage(from, { text: t }); }
async function cmdShopMyBill(sock, from, args, pushName, sn) { if (args.length === 0 || args.includes('list')) { const bs = getBuyerByNumber(sn).filter(b => b.paymentStatus === 'unpaid'); if (bs.length === 0) { await sock.sendMessage(from, { text: '💳 Tidak ada.' }); return; } let t = '💳 TAGIHAN\n\n'; bs.forEach(b => { t += `🆔 ${b.id}\n${b.productName}\n${b.productPrice}\n\n`; }); t += '/mybill <id>'; await sock.sendMessage(from, { text: t }); return; } if (args.includes('nanti') || args.includes('later')) { const b = getBuyerById(args[0]); if (!b) { await sock.sendMessage(from, { text: '❌ Tidak ditemukan.' }); return; } updateBuyer(args[0], { billReminder: (b.billReminder || 0) + 1 }); await sock.sendMessage(from, { text: `⏰ ${args[0]} diingatkan.` }); return; } const b = getBuyerById(args[0]); if (!b) { await sock.sendMessage(from, { text: '❌ Tidak ditemukan.' }); return; } await sock.sendMessage(from, { text: formatOrderInvoice({ id: b.id, productName: b.productName, productPrice: b.productPrice, customerName: b.name, customerNumber: b.number, createdAt: b.createdAt }, b) }); }
async function cmdShopPayment(sock, from) { const ms = getPaymentMethods(); let t = '💳 PEMBAYARAN\n\n'; for (const m of ms) { t += `${m.type === 'qris' ? '📱' : m.type === 'ewallet' ? '💳' : '🏦'} ${m.name}\n📞 ${m.number}\n`; if (m.type === 'qris' && m.qrisImage) t += `🖼️ ${m.qrisImage}\n`; t += '\n'; } t += 'Transfer & kirim bukti.\n⚠️ 1x24 jam'; const qr = ms.find(m => m.type === 'qris' && m.qrisImage); if (qr) { try { await sock.sendMessage(from, { image: { url: qr.qrisImage }, caption: t }); return; } catch (e) {} } await sock.sendMessage(from, { text: t }); }
async function cmdShopDone(sock, from, args, pushName, ul) { if (ul < 1) { await sock.sendMessage(from, { text: '🔒 Partner+.' }); return; } if (args.length === 0) { await sock.sendMessage(from, { text: '❌ /done <id>' }); return; } const b = getBuyerById(args[0]); if (!b) { await sock.sendMessage(from, { text: '❌ Tidak ditemukan.' }); return; } updateBuyer(args[0], { status: 'completed', paymentStatus: 'paid' }); const lk = global.botConfig.channelId ? `https://whatsapp.com/channel/${global.botConfig.channelId.split('@')[0]}` : 'https://whatsapp.com/channel/festiveshopid'; try { const cv = await createThanksCanvas(b.name, b.productName, lk); await sock.sendMessage(b.number + '@s.whatsapp.net', { image: cv, caption: `🎉 TERIMA KASIH!\n${b.name}, ${b.productName} selesai!\nFollow: ${lk}` }); } catch (e) {} await sock.sendMessage(from, { text: `✅ ${args[0]} selesai!` }); }
async function cmdShopTopBuyer(sock, from) { const tp = getTopBuyers(10); if (tp.length === 0) { await sock.sendMessage(from, { text: '🏆 Belum ada.' }); return; } let t = '🏆 TOP BUYERS\n\n'; tp.forEach((b, i) => { t += `${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1 + '.'} ${b.name || b.number}\n🛍️ ${b.count} order\n\n`; }); await sock.sendMessage(from, { text: t }); }
async function cmdShopInfo(sock, from) { let t = '🛍️ FESTIVESHOP ID\n\n'; t += `📋 ${getCatalog().length} produk\n💳 ${getPaymentMethods().length} metode\n🏆 ${getTopBuyers(1)[0]?.name || '-'}\n\n/catalog | /payment | /help`; await sock.sendMessage(from, { text: t }); }
async function cmdShopHelp(sock, from) { let t = '🛍️ SHOP HELP\n\n/catalog | /detail <id> | /buy <id>\n/myorder | /mybill | /payment\n/topbuyer | /info | /help\n\n💡 /catalog → /buy id → /payment → /done'; await sock.sendMessage(from, { text: t }); }
