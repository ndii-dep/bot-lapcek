const schoolData = require('./lib/schoolData');
const reminderSystem = require('./lib/reminder');
const { alightMotion } = require('./lib/alightMotion');
const { addSongFess, getSongFessStats, getAllSongFess } = require('./lib/songFess');
const { addConfess, getConfessQueue, removeConfess } = require('./lib/confess');
const { createSticker, checkFfmpeg, CONFIG: STICKER_CONFIG } = require('./lib/sticker');
const { formatDuration } = require('./lib/stickerUtils');
const { suggestCommand, formatSuggestion } = require('./lib/cmdSuggest');
const { addPR, deletePR, getPRs, getPRById, getPRStats, formatPRList, formatPRDetail } = require('./lib/prTracker');
const { addChannel, addGroup, removeChannel, removeGroup, getChannels, getGroups, getAllTargets } = require('./lib/channelManager');
const { 
    getFeature, getFeatureStatus, toggleFeature, 
    updateFeatureMessage, updateFeatureEmoji,
    updateAutoPostSWCaption, getAutoPostSWCaption
} = require('./lib/autoFeatures');
const { getUserLevel, hasPermission, getLevelName, addPartner, removePartner, getPartners, getOwner, setOwner, getPermissionList } = require('./lib/permission');
const { getCatalog, getProductById, getCategories, addBuyer, updateBuyer, getBuyerById, getBuyerByNumber, getTopBuyers, formatPaymentMethods, formatOrderInvoice, createThanksCanvas, getPaymentMethods } = require('./lib/shopV2');
const { buildCarousel, formatCarouselText } = require('./lib/carousel');

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
    
    const enrichedMessageInfo = {
        ...messageInfo,
        quotedMessage: quotedMessage,
        commandArgs: commandArgs,
        prefix: prefix
    };
    
    if (isShopPrefix) {
        try {
            switch(cmd) {
                case 'catalog':
                    await cmdShopCatalog(sock, from, commandArgs);
                    break;
                case 'detail':
                    await cmdShopDetail(sock, from, commandArgs);
                    break;
                case 'buy':
                case 'order':
                    await cmdShopBuy(sock, from, commandArgs, pushName, senderNumber);
                    break;
                case 'myorder':
                    await cmdShopMyOrder(sock, from, commandArgs, senderNumber);
                    break;
                case 'mybill':
                    await cmdShopMyBill(sock, from, commandArgs, pushName, senderNumber);
                    break;
                case 'payment':
                    await cmdShopPayment(sock, from);
                    break;
                case 'done':
                    await cmdShopDone(sock, from, commandArgs, pushName, userLevel);
                    break;
                case 'topbuyer':
                    await cmdShopTopBuyer(sock, from);
                    break;
                case 'info':
                    await cmdShopInfo(sock, from);
                    break;
                case 'help':
                    await cmdShopHelp(sock, from);
                    break;
                default:
                    await sock.sendMessage(from, { text: '❌ Command shop tidak dikenal.\n\n/catalog - Lihat produk\n/help - Bantuan' });
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
                  `Command *${prefix}${cmd}* membutuhkan level yang lebih tinggi.\n\n` +
                  `👤 Level kamu: ${levelName}\n` +
                  `🔑 Dibutuhkan: Partner atau Owner\n\n` +
                  `💡 Hubungi owner untuk jadi partner.\n` +
                  `Cek level: ${prefix}mylevel`
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
                await cmdSongFess(sock, from, commandArgs, pushName, enrichedMessageInfo);
                break;
            case 'menfess':
            case 'confess':
            case 'confes':
            case 'menfes':
            case 'anon':
            case 'rahasia':
                await cmdConfess(sock, from, commandArgs, pushName, enrichedMessageInfo);
                break;
            case 'sticker':
            case 'stiker':
            case 's':
            case 'stick':
            case 'stickerwa':
                await cmdSticker(sock, from, commandArgs, pushName, enrichedMessageInfo);
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
                await cmdAddPR(sock, from, commandArgs, pushName, enrichedMessageInfo);
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
            case 'setowner':
            case 'registerowner':
                await cmdSetOwner(sock, from, commandArgs, pushName, userLevel);
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
            case 'getid':
            case 'id':
            case 'chatid':
            case 'cekid':
            case 'myid':
                await cmdGetId(sock, from, enrichedMessageInfo);
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
            case 'autowelcome':
            case 'welcome':
                await cmdToggleFeature(sock, from, commandArgs, 'welcome', pushName, userLevel);
                break;
            case 'autogoodbye':
            case 'goodbye':
                await cmdToggleFeature(sock, from, commandArgs, 'goodbye', pushName, userLevel);
                break;
            case 'autotyping':
            case 'typing':
                await cmdToggleFeature(sock, from, commandArgs, 'autotyping', pushName, userLevel);
                break;
            case 'autorecord':
            case 'record':
                await cmdToggleFeature(sock, from, commandArgs, 'autorecord', pushName, userLevel);
                break;
            case 'autoread':
            case 'read':
                await cmdToggleFeature(sock, from, commandArgs, 'autoread', pushName, userLevel);
                break;
            case 'autopostsw':
            case 'postsw':
                await cmdToggleFeature(sock, from, commandArgs, 'autopostsw', pushName, userLevel);
                break;
            case 'autoreactsw':
            case 'reactsw':
                await cmdToggleFeature(sock, from, commandArgs, 'autoreactsw', pushName, userLevel);
                break;
            case 'setwelcome':
            case 'setwelcomemsg':
                await cmdSetFeatureMessage(sock, from, commandArgs, 'welcome', pushName, userLevel);
                break;
            case 'setgoodbye':
            case 'setgoodbyemsg':
                await cmdSetFeatureMessage(sock, from, commandArgs, 'goodbye', pushName, userLevel);
                break;
            case 'setreact':
            case 'setreactemoji':
                await cmdSetReactEmoji(sock, from, commandArgs, pushName, userLevel);
                break;
            case 'setpostsw':
            case 'setpostcaption':
                await cmdSetPostSWCaption(sock, from, commandArgs, pushName, userLevel);
                break;
            case 'autofeatures':
            case 'auto':
                await cmdListAutoFeatures(sock, from);
                break;
            case 'chcreate':
                await cmdChannelCreate(sock, from, commandArgs, pushName, userLevel);
                break;
            case 'chfollow':
                await cmdChannelFollow(sock, from, commandArgs, pushName, userLevel);
                break;
            case 'chinfo':
                await cmdChannelInfo(sock, from, commandArgs, pushName, userLevel);
                break;
            case 'chupdate':
                await cmdChannelUpdate(sock, from, commandArgs, pushName, userLevel);
                break;
            case 'chdelete':
                await cmdChannelDelete(sock, from, commandArgs, pushName, userLevel);
                break;
            default:
                if (cmd) {
                    const suggestions = suggestCommand(cmd, 0.3, 5);
                    if (suggestions.length > 0) {
                        const suggestionText = formatSuggestion(cmd, suggestions, prefix);
                        await sock.sendMessage(from, { text: suggestionText });
                    } else {
                        await sock.sendMessage(from, { 
                            text: `❌ *Unknown Command*\n\n` +
                                  `Command *${prefix}${cmd}* tidak ditemukan.\n\n` +
                                  `Ketik *${prefix}menu* untuk melihat semua command.\n` +
                                  `Ketik *${prefix}search* <kata kunci> untuk mencari command.\n\n` +
                                  `🛍️ Shop: /catalog | /help`
                        });
                    }
                }
                break;
        }
    } catch (err) {
        console.error(`❌ Error executing ${cmd}:`, err.message);
        try {
            await sock.sendMessage(from, { text: '❌ Maaf, terjadi kesalahan saat memproses command.\n\nSilakan coba lagi nanti.' });
        } catch (e) {}
    }
};

async function sendWithButtons(sock, from, text, footer, buttons) {
    try {
        await sock.sendMessage(from, {
            text: text,
            footer: footer,
            buttons: buttons,
            headerType: 1
        });
    } catch (e) {
        await sock.sendMessage(from, { text: text + '\n\n' + footer });
    }
}

async function sendInteractiveMsg(sock, from, text, title, footer, interactiveButtons) {
    try {
        await sock.sendMessage(from, {
            text: text,
            title: title || '',
            footer: footer || '',
            interactiveButtons: interactiveButtons
        });
    } catch (e) {
        await sock.sendMessage(from, { text: text + '\n\n' + footer });
    }
}

async function sendListMessage(sock, from, title, buttonText, footer, sections) {
    try {
        const interactiveButtons = [{
            name: "single_select",
            buttonParamsJson: JSON.stringify({
                title: buttonText || "Menu",
                sections: sections.map(s => ({
                    title: s.title,
                    highlight_label: s.highlight_label || '',
                    rows: s.rows.map(r => ({
                        header: r.header || r.title,
                        title: r.title,
                        description: r.description || '',
                        id: r.rowId || r.id
                    }))
                }))
            })
        }];
        
        await sock.sendMessage(from, {
            text: title,
            footer: footer || '',
            interactiveButtons: interactiveButtons
        });
    } catch (e) {
        let fallback = title + '\n\n';
        sections.forEach(section => {
            fallback += `📂 *${section.title}*\n`;
            section.rows.forEach(row => {
                fallback += `  • ${row.title} - ${row.description || ''}\n`;
            });
            fallback += '\n';
        });
        fallback += footer;
        await sock.sendMessage(from, { text: fallback });
    }
}

async function cmdInfo(sock, from) {
    const prefix = global.botConfig.prefix;
    
    const sections = [
        {
            title: '📋 INFO BOT',
            highlight_label: 'Info',
            rows: [
                { header: '', title: '🤖 Info Bot', description: 'Informasi lengkap tentang bot', rowId: `${prefix}info` },
                { header: '', title: '👤 Owner Bot', description: 'Kontak dan info owner', rowId: `${prefix}owner` },
                { header: '', title: '👩‍🏫 Wali Kelas', description: 'Informasi wali kelas 8C', rowId: `${prefix}walas` },
                { header: '', title: '⭐ My Level', description: 'Cek level & permission kamu', rowId: `${prefix}mylevel` }
            ]
        },
        {
            title: '📅 JADWAL SEKOLAH',
            highlight_label: 'Jadwal',
            rows: [
                { header: '', title: '📆 Hari Ini', description: 'Jadwal pelajaran hari ini', rowId: `${prefix}today` },
                { header: '', title: '📅 Besok', description: 'Reminder untuk besok', rowId: `${prefix}tomorrow` },
                { header: '', title: '📚 Mapel', description: 'Jadwal mapel per hari', rowId: `${prefix}mapel senin` },
                { header: '', title: '🧹 Piket', description: 'Jadwal piket per hari', rowId: `${prefix}piket` },
                { header: '', title: '📖 Lengkap', description: 'Semua jadwal', rowId: `${prefix}jadwal` }
            ]
        },
        {
            title: '🎵 SONGFESS & MENFESS',
            highlight_label: 'Social',
            rows: [
                { header: '', title: '🎵 SongFess', description: 'Kirim lagu ke channel', rowId: `${prefix}songfess` },
                { header: '', title: '💌 Menfess', description: 'Pesan anonim ke seseorang', rowId: `${prefix}menfess` }
            ]
        },
        {
            title: '🎨 STICKER & ALIGHT',
            highlight_label: 'Creative',
            rows: [
                { header: '', title: '🎨 Sticker', description: 'Buat sticker dari foto/video (max 15s)', rowId: `${prefix}sticker` },
                { header: '', title: '✨ Alight Motion', description: 'Generate premium 1 tahun', rowId: `${prefix}alight` }
            ]
        },
        {
            title: '📚 PR / TUGAS',
            highlight_label: 'School',
            rows: [
                { header: '', title: '📝 Tambah PR', description: 'Tambah tugas baru (partner)', rowId: `${prefix}addpr` },
                { header: '', title: '📋 Daftar PR', description: 'Lihat semua PR/tugas', rowId: `${prefix}pr` }
            ]
        },
        {
            title: '🛍️ FESTIVESHOP ID',
            highlight_label: 'Shop',
            rows: [
                { header: '', title: '📋 Katalog', description: 'Lihat katalog produk', rowId: '/catalog' },
                { header: '', title: '🛒 Order', description: 'Order produk', rowId: '/buy' },
                { header: '', title: '📦 Pesanan', description: 'Cek pesanan saya', rowId: '/myorder' },
                { header: '', title: '💳 Pembayaran', description: 'Metode pembayaran', rowId: '/payment' }
            ]
        },
        {
            title: '📰 CHANNEL',
            highlight_label: 'Channel',
            rows: [
                { header: '', title: '📰 Info Channel', description: 'Lihat info channel', rowId: `${prefix}chinfo` },
                { header: '', title: '➕ Buat Channel', description: 'Buat channel baru', rowId: `${prefix}chcreate` },
                { header: '', title: '✅ Follow Channel', description: 'Follow channel', rowId: `${prefix}chfollow` }
            ]
        },
        {
            title: '⚙️ AUTO FEATURES',
            highlight_label: 'Auto',
            rows: [
                { header: '', title: '⚙️ Status', description: 'Status auto features', rowId: `${prefix}auto` },
                { header: '', title: '👋 Welcome', description: 'Welcome canvas on/off', rowId: `${prefix}welcome` }
            ]
        },
        {
            title: '🛠️ UTILITY',
            highlight_label: 'Tools',
            rows: [
                { header: '', title: '🔍 Search', description: 'Cari command', rowId: `${prefix}search` },
                { header: '', title: '🆔 Get ID', description: 'Lihat ID chat/user', rowId: `${prefix}getid` },
                { header: '', title: '🏓 Ping', description: 'Cek status bot', rowId: `${prefix}ping` }
            ]
        }
    ];

    await sendListMessage(
        sock, from,
        `🤖 *${global.botConfig.name}* v${global.botConfig.version}\n👤 ${global.botConfig.owner}\n\n📌 *Pilih menu di bawah ini:*`,
        '📋 Menu Utama',
        `⏰ Reminder: 🌅12:00 | ☀️16:00 | 🌙20:00 | 🛍️ Shop: /catalog`,
        sections
    );
}

async function cmdOwner(sock, from) {
    const owner = getOwner();
    if (!owner.number) {
        await sock.sendMessage(from, { text: '❌ Owner belum terdaftar.\n\nGunakan .setowner <nomor>|<nama> untuk mendaftarkan owner.' });
        return;
    }
    
    const ownerNumber = owner.number.startsWith('62') ? '0' + owner.number.slice(2) : owner.number;
    
    await sendWithButtons(
        sock, from,
        `╔══════════════════════════╗\n` +
        `║       👤 OWNER BOT       ║\n` +
        `╚══════════════════════════╝\n\n` +
        `👤 *Nama:* ${owner.name}\n` +
        `📞 *WhatsApp:* ${ownerNumber}\n` +
        `🔗 *Link:* https://wa.me/${owner.number}\n\n` +
        `💡 Untuk pertanyaan atau request,\n` +
        `silakan hubungi owner.`,
        '👆 Hubungi owner melalui tombol',
        [
            { buttonId: 'call_owner', buttonText: { displayText: '📞 Hubungi Owner' }, type: 1 },
            { buttonId: `${global.botConfig.prefix}menu`, buttonText: { displayText: '📋 Menu Utama' }, type: 1 }
        ]
    );
}

async function cmdWalas(sock, from) {
    const text = `╔══════════════════════════╗\n` +
                 `║    👩‍🏫 WALI KELAS 8C     ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `👤 Nama: Ibu Sari, S.Pd.\n` +
                 `🏫 Kelas: 8C\n` +
                 `📞 No. HP: 081234567890\n\n` +
                 `🕐 Konsultasi:\n` +
                 `   Senin-Jumat: 08.00-14.00\n` +
                 `   Sabtu: 08.00-12.00\n\n` +
                 `📍 Ruang: Kantor Guru Lt. 2`;
    await sock.sendMessage(from, { text });
}

async function cmdToday(sock, from) {
    try {
        const data = schoolData.getTodayReminder();
        const text = schoolData.formatReminderText(data);
        await sendWithButtons(sock, from, text, '📅 Jadwal Hari Ini',
            [
                { buttonId: `${global.botConfig.prefix}tomorrow`, buttonText: { displayText: '🔮 Besok' }, type: 1 },
                { buttonId: `${global.botConfig.prefix}jadwal`, buttonText: { displayText: '📖 Jadwal Lengkap' }, type: 1 }
            ]
        );
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil jadwal hari ini.' });
    }
}

async function cmdTomorrow(sock, from) {
    try {
        const data = schoolData.getTomorrowReminder();
        const text = schoolData.formatReminderText(data);
        await sendWithButtons(sock, from, text, '🔮 Reminder Besok',
            [
                { buttonId: `${global.botConfig.prefix}today`, buttonText: { displayText: '📅 Hari Ini' }, type: 1 },
                { buttonId: `${global.botConfig.prefix}reminder`, buttonText: { displayText: '⏰ Info Reminder' }, type: 1 }
            ]
        );
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil reminder besok.' });
    }
}

async function cmdMapel(sock, from, args) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const sections = [{
            title: 'PILIH HARI', highlight_label: 'Hari',
            rows: [
                { header: '', title: '📆 Senin', description: 'Jadwal pelajaran hari Senin', rowId: `${prefix}mapel senin` },
                { header: '', title: '📆 Selasa', description: 'Jadwal pelajaran hari Selasa', rowId: `${prefix}mapel selasa` },
                { header: '', title: '📆 Rabu', description: 'Jadwal pelajaran hari Rabu', rowId: `${prefix}mapel rabu` },
                { header: '', title: '📆 Kamis', description: 'Jadwal pelajaran hari Kamis', rowId: `${prefix}mapel kamis` },
                { header: '', title: '📆 Jumat', description: 'Jadwal pelajaran hari Jumat', rowId: `${prefix}mapel jumat` }
            ]
        }];
        await sendListMessage(sock, from, '📅 *Pilih hari untuk melihat jadwal pelajaran:*', '📋 Pilih Hari', '💡 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat', sections);
        return;
    }
    
    const result = schoolData.getScheduleByDay(args[0]);
    if (!result) { await sock.sendMessage(from, { text: '❌ Hari tidak valid.\n\nGunakan: senin, selasa, rabu, kamis, jumat, atau 1-5' }); return; }
    
    let text = `╔══════════════════════════╗\n║  📅 JADWAL ${result.day.toUpperCase().padEnd(14)} ║\n╚══════════════════════════╝\n\n`;
    Object.entries(result.schedule).forEach(([key, lesson]) => {
        if (lesson.subject === 'ISTIRAHAT') {
            text += `🍽️  *Istirahat*\n   ⏰ ${lesson.time}\n\n`;
        } else {
            text += `📚 *Jam ke-${key}*\n   📖 ${lesson.subject}\n   ⏰ ${lesson.time}\n   👨‍🏫 ${lesson.teacher}\n\n`;
        }
    });
    await sock.sendMessage(from, { text });
}

async function cmdPiket(sock, from, args) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const sections = [{
            title: 'PILIH HARI PIKET', highlight_label: 'Hari',
            rows: [
                { header: '', title: '🧹 Senin', description: 'Anggota piket hari Senin', rowId: `${prefix}piket senin` },
                { header: '', title: '🧹 Selasa', description: 'Anggota piket hari Selasa', rowId: `${prefix}piket selasa` },
                { header: '', title: '🧹 Rabu', description: 'Anggota piket hari Rabu', rowId: `${prefix}piket rabu` },
                { header: '', title: '🧹 Kamis', description: 'Anggota piket hari Kamis', rowId: `${prefix}piket kamis` },
                { header: '', title: '🧹 Jumat', description: 'Anggota piket hari Jumat', rowId: `${prefix}piket jumat` }
            ]
        }];
        await sendListMessage(sock, from, '🧹 *Pilih hari untuk melihat jadwal piket:*', '🧹 Pilih Hari', '💡 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat', sections);
        return;
    }
    
    const result = schoolData.getPiketByDay(args[0]);
    if (!result) { await sock.sendMessage(from, { text: '❌ Hari tidak valid.\n\nGunakan: senin, selasa, rabu, kamis, jumat, atau 1-5' }); return; }
    
    let text = `╔══════════════════════════╗\n║  🧹 PIKET ${result.day.toUpperCase().padEnd(17)} ║\n╚══════════════════════════╝\n\n👥 *Anggota Piket:*\n\n`;
    result.members.forEach((name, i) => { text += `   ${i + 1}. ${name}\n`; });
    text += `\n📌 *Tugas Piket:*\n   • Membersihkan ruang kelas\n   • Menghapus papan tulis\n   • Merapikan meja dan kursi\n   • Membuang sampah\n   • Menyapu dan mengepel lantai\n\n💡 Jangan lupa bawa peralatan kebersihan ✨`;
    
    await sendWithButtons(sock, from, text, '🧹 Piket Kelas 8C',
        [
            { buttonId: `${prefix}piket`, buttonText: { displayText: '🔄 Cek Hari Lain' }, type: 1 },
            { buttonId: `${prefix}jadwal`, buttonText: { displayText: '📖 Jadwal Lengkap' }, type: 1 }
        ]
    );
}

async function cmdJadwal(sock, from) {
    try {
        let text = `╔══════════════════════════╗\n║  📚 JADWAL KELAS 8C     ║\n╚══════════════════════════╝\n\n📅 *JADWAL PELAJARAN*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        const fullSchedule = schoolData.getFullSchedule();
        for (const [day, lessons] of Object.entries(fullSchedule)) {
            text += `📆 *${day.toUpperCase()}*\n`;
            Object.values(lessons).forEach(lesson => {
                if (lesson.subject === 'ISTIRAHAT') text += `   🍽️  Istirahat (${lesson.time})\n`;
                else text += `   📖 ${lesson.subject} (${lesson.time})\n`;
            });
            text += `\n`;
        }
        text += `🧹 *JADWAL PIKET*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        const fullPiket = schoolData.getFullPiket();
        for (const [day, members] of Object.entries(fullPiket)) {
            text += `📆 *${day.toUpperCase()}:*\n`;
            members.forEach((name, i) => { text += `   ${i + 1}. ${name}\n`; });
            text += `\n`;
        }
        if (text.length > 4000) {
            const parts = text.match(/[\s\S]{1,4000}/g) || [text];
            for (const part of parts) { await sock.sendMessage(from, { text: part }); await new Promise(r => setTimeout(r, 500)); }
        } else {
            await sock.sendMessage(from, { text });
        }
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengambil jadwal lengkap.' });
    }
}

async function cmdSendReminder(sock, from, pushName) {
    await sock.sendMessage(from, { text: '🔄 *Mengirim reminder...*\n\nMohon tunggu sebentar...' });
    try {
        await reminderSystem.sendManualReminder();
        await sock.sendMessage(from, { text: '✅ *Reminder berhasil dikirim!*\n\n📢 Terkirim ke Channel & Group WhatsApp\n\n⏰ ' + new Date().toLocaleTimeString('id-ID') });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal mengirim reminder.' });
    }
}

async function cmdReminderMenu(sock, from) {
    const prefix = global.botConfig.prefix;
    await sock.sendMessage(from, { text: `╔══════════════════════════╗\n║  ⏰ SISTEM REMINDER     ║\n╚══════════════════════════╝\n\n📋 *Status:* 🟢 AKTIF\n\n🕐 *Jadwal (3x/hari):*\n   🌅 12:00 | ☀️ 16:00 | 🌙 20:00\n\n📅 *Hari:* Senin-Jumat (H-1)\n\n💡 ${prefix}tomorrow | ${prefix}sendreminder` });
}

async function cmdAlightMotion(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) {
        await sendWithButtons(sock, from,
            `╔══════════════════════════╗\n║  ✨ ALIGHT MOTION GEN   ║\n║    PREMIUM GENERATOR    ║\n╚══════════════════════════╝\n\n🎬 *Generate Alight Motion Premium*\n📅 *Durasi:* 1 Tahun\n\n📌 *Step 1:* ${prefix}alight email\n📌 *Step 2:* ${prefix}alight email link\n\n💡 ${prefix}alight user@gmail.com`,
            'Powered by rafaelxd.my.id',
            [{ buttonId: `${prefix}owner`, buttonText: { displayText: '👤 Bantuan' }, type: 1 }]
        );
        return;
    }
    if (args.length === 1) {
        const email = args[0];
        if (!email.includes('@')) { await sock.sendMessage(from, { text: '❌ Email tidak valid!' }); return; }
        await sock.sendMessage(from, { text: '🔄 *Mengirim magic link...*\n\n📧 ' + email });
        try {
            const result = await alightMotion(email);
            if (result.success) {
                await sock.sendMessage(from, { text: `✅ *Magic Link Terkirim!*\n\n📧 ${email}\n\n📌 1. Buka inbox (cek Spam)\n2. Cari email Alight Motion\n3. Copy link\n4. ${prefix}alight ${email} <link>` });
            } else {
                await sock.sendMessage(from, { text: `❌ Gagal: ${result.error}` });
            }
        } catch (err) { await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }); }
        return;
    }
    if (args.length >= 2) {
        const email = args[0];
        const rawLink = args.slice(1).join(' ');
        await sock.sendMessage(from, { text: '🔄 *Memverifikasi...*' });
        try {
            const result = await alightMotion(email, rawLink);
            if (result.success) {
                await sendWithButtons(sock, from, `✅ *PREMIUM BERHASIL!*\n\n📧 ${email}\n⭐ PREMIUM\n📅 1 Tahun`, '✨ Generated by RafaelXD',
                    [{ buttonId: `${prefix}alight`, buttonText: { displayText: '🔄 Generate Lagi' }, type: 1 }]
                );
            } else {
                await sock.sendMessage(from, { text: `❌ Gagal: ${result.error}` });
            }
        } catch (err) { await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }); }
    }
}

async function cmdSongFess(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) {
        await sendWithButtons(sock, from,
            `╔══════════════════════════╗\n║    🎵 S O N G F E S S   ║\n╚══════════════════════════╝\n\n📌 *Cara Pakai:*\n${prefix}songfess judul | pesan\n\n💡 ${prefix}songfess Night Changes | bikin nangis 😭\n\n🎵 Dikirim ke channel ~5 menit.\n🔒 Identitas dirahasiakan.`,
            '🎵 Kirim lagu favoritmu',
            [{ buttonId: `${prefix}songfess stats`, buttonText: { displayText: '📊 Stats' }, type: 1 }]
        );
        return;
    }
    if (args[0] === 'stats') {
        const stats = getSongFessStats();
        await sock.sendMessage(from, { text: `🎵 *STATS*\n\n📊 Total: ${stats.total}\n⏳ Antrian: ${stats.pending}\n✅ Hari ini: ${stats.sentToday}` });
        return;
    }
    const parts = args.join(' ').split('|').map(p => p.trim());
    const title = parts[0] || '';
    const msg = parts[1] || '';
    if (!title) { await sock.sendMessage(from, { text: '❌ Judul tidak boleh kosong!' }); return; }
    if (title.length > 100 || msg.length > 500) { await sock.sendMessage(from, { text: '❌ Judul max 100, pesan max 500 karakter.' }); return; }
    const anonId = `#${from.split('@')[0].slice(-4)}`;
    const queueId = addSongFess({ title, message: msg, sender: pushName, anonId, timestamp: Date.now() });
    await sock.sendMessage(from, { text: `✅ *SongFess Terkirim!*\n\n🎶 ${title}\n${msg ? '💬 ' + msg + '\n' : ''}🆔 ${queueId}\n👤 ${anonId}\n\n⏳ Dikirim ke channel ~5 menit.` });
}

async function cmdConfess(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) {
        await sendWithButtons(sock, from,
            `╔══════════════════════════╗\n║  💌 M E N F E S S      ║\n║    CONFESS ANONIM       ║\n╚══════════════════════════╝\n\n📌 *Format:*\n${prefix}menfess 628xxxx|pesan\n\n💡 ${prefix}menfess 628123456789|hai 😊\n\n🔒 Identitas dirahasiakan.\n⚠️ Max 5x/hari.`,
            '💌 Kirim pesan rahasiamu',
            [{ buttonId: `${prefix}menfess stats`, buttonText: { displayText: '📊 Stats' }, type: 1 }]
        );
        return;
    }
    if (args[0] === 'stats') {
        const queue = getConfessQueue();
        const sn = from.split('@')[0];
        await sock.sendMessage(from, { text: `💌 *STATS*\n\n📊 Antrian: ${queue.length}\n✉️ Kamu: ${queue.filter(c => c.senderNumber === sn).length}/5` });
        return;
    }
    const parts = args.join(' ').split('|').map(p => p.trim());
    const targetNumber = parts[0]?.replace(/[^0-9]/g, '') || '';
    const confessMessage = parts.slice(1).join('|').trim();
    if (!targetNumber || targetNumber.length < 10) { await sock.sendMessage(from, { text: '❌ Nomor tidak valid! Format: 628xxxxxxxxxx' }); return; }
    if (!confessMessage) { await sock.sendMessage(from, { text: '❌ Pesan tidak boleh kosong!' }); return; }
    if (confessMessage.length > 1000) { await sock.sendMessage(from, { text: '❌ Pesan maksimal 1000 karakter!' }); return; }
    const sn = from.split('@')[0];
    const queue = getConfessQueue();
    if (queue.filter(c => c.senderNumber === sn).length >= 5) { await sock.sendMessage(from, { text: '❌ Limit harian (5x)!' }); return; }
    if (targetNumber === sn || targetNumber === sn.replace(/^62/, '0')) { await sock.sendMessage(from, { text: '😅 Tidak bisa kirim ke diri sendiri!' }); return; }
    const formattedTarget = targetNumber.startsWith('62') ? targetNumber : targetNumber.startsWith('0') ? '62' + targetNumber.slice(1) : '62' + targetNumber;
    const targetJid = formattedTarget + '@s.whatsapp.net';
    const confessId = addConfess({ targetNumber: formattedTarget, targetJid, message: confessMessage, senderName: pushName, senderNumber: sn, anonId: `#${sn.slice(-4)}`, timestamp: Date.now() });
    await sock.sendMessage(from, { text: `✅ *Menfess Terkirim!*\n\n📱 Ke: ${formattedTarget.slice(0, 6)}xxxx\n🆔 ${confessId}\n👤 #${sn.slice(-4)}` });
    try {
        await sock.sendMessage(targetJid, { text: `💌 *KAMU DAPAT MENFESS!*\n\n_"${confessMessage}"_\n\n👤 Dari: Anonim #${sn.slice(-4)}\n🕐 ${new Date().toLocaleString('id-ID')}\n\n✨ Balas: ${prefix}menfess <nomor>|<pesan>` });
        removeConfess(confessId, true);
    } catch (err) { removeConfess(confessId, false); await sock.sendMessage(from, { text: '❌ Gagal kirim. Nomor tidak terdaftar.' }); }
}

async function cmdSticker(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    const hasFfmpeg = await checkFfmpeg();
    if (!hasFfmpeg) { await sock.sendMessage(from, { text: '❌ FFmpeg tidak terinstall!' }); return; }
    let stickerType = 'full';
    let packName = STICKER_CONFIG.PACK;
    let authorName = STICKER_CONFIG.AUTHOR;
    args.forEach(arg => {
        if (['full', 'circle', 'rounded'].includes(arg.toLowerCase())) stickerType = arg.toLowerCase();
        else if (arg.startsWith('pack=')) packName = arg.replace('pack=', '').replace(/"/g, '');
        else if (arg.startsWith('author=')) authorName = arg.replace('author=', '').replace(/"/g, '');
    });
    const msg = messageInfo.message;
    let hasMedia = false, mediaType = '', mediaDuration = 0;
    if (msg.imageMessage) { hasMedia = true; mediaType = 'image'; }
    else if (msg.videoMessage) { hasMedia = true; mediaType = 'video'; mediaDuration = msg.videoMessage.seconds || 0; }
    if (!hasMedia && messageInfo.quotedMessage) {
        const q = messageInfo.quotedMessage;
        if (q.imageMessage) { hasMedia = true; mediaType = 'image'; }
        else if (q.videoMessage) { hasMedia = true; mediaType = 'video'; mediaDuration = q.videoMessage.seconds || 0; }
    }
    if (!hasMedia) {
        await sendWithButtons(sock, from, `🎨 *STICKER MAKER*\n\n📌 Kirim/reply gambar/video (max 15s)\nlalu ketik ${prefix}s\n\n🎨 Style: full | circle | rounded\n📏 Video: Max 15 detik`,
            '🎨 Sticker Maker', [{ buttonId: `${prefix}s full`, buttonText: { displayText: '📱 Full' }, type: 1 }, { buttonId: `${prefix}s circle`, buttonText: { displayText: '⭕ Circle' }, type: 1 }]
        );
        return;
    }
    if (mediaType === 'video' && mediaDuration > STICKER_CONFIG.MAX_VIDEO_DURATION) {
        await sock.sendMessage(from, { text: `❌ Video terlalu panjang! Max ${STICKER_CONFIG.MAX_VIDEO_DURATION}s` }); return;
    }
    await sock.sendMessage(from, { text: '🔄 *Membuat sticker...*' });
    try {
        const result = await createSticker(sock, messageInfo, { type: stickerType, pack: packName, author: authorName });
        await sock.sendMessage(from, { sticker: result.sticker });
        setTimeout(async () => { await sock.sendMessage(from, { text: `✅ *Sticker Berhasil!*\n📸 ${result.type === 'animated' ? '🎬 Animasi' : '🖼️ Statis'}` }); }, 500);
    } catch (err) { await sock.sendMessage(from, { text: `❌ Gagal: ${err.message}` }); }
}

async function cmdSearch(sock, from, args, prefix) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `🔍 *SEARCH*\n\n${prefix}search <kata kunci>\nContoh: ${prefix}search jadwal` }); return; }
    const query = args.join(' ');
    const suggestions = suggestCommand(query, 0.1, 10);
    if (suggestions.length === 0) { await sock.sendMessage(from, { text: `🔍 "${query}" tidak ditemukan.` }); return; }
    let text = `🔍 *SEARCH: "${query}"*\n📊 ${suggestions.length} hasil\n\n`;
    suggestions.forEach(s => { text += `📝 *${prefix}${s.cmd}* (${Math.round(s.similarity * 100)}%)\n   📖 ${s.desc}\n\n`; });
    await sock.sendMessage(from, { text });
}

async function cmdAddPR(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) { await sock.sendMessage(from, { text: `📚 *TAMBAH PR*\n\n${prefix}addpr mapel|deskripsi|deadline\nContoh: ${prefix}addpr MTK|Hal 100|2024-12-20` }); return; }
    const parts = args.join(' ').split('|').map(p => p.trim());
    const subject = parts[0] || 'Umum';
    const desc = parts[1] || '';
    const deadline = parts[2] || null;
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) { await sock.sendMessage(from, { text: '❌ Format deadline: YYYY-MM-DD' }); return; }
    let media = null;
    if (messageInfo.quotedMessage) {
        const q = messageInfo.quotedMessage;
        if (q.imageMessage) media = { type: 'image' };
        else if (q.videoMessage) media = { type: 'video' };
        else if (q.documentMessage) media = { type: 'document', filename: q.documentMessage.fileName || 'file' };
    }
    const pr = addPR({ subject, description: desc, deadline, addedBy: pushName, media });
    const detail = formatPRDetail(pr);
    const targets = getAllTargets();
    for (const ch of targets.channels) { try { await sock.sendMessage(ch.id, { text: `📢 *PR BARU!*\n\n${detail}` }); } catch (e) {} }
    for (const gr of targets.groups) { try { await sock.sendMessage(gr.id, { text: `📢 *PR BARU!*\n\n${detail}` }); } catch (e) {} }
    await sock.sendMessage(from, { text: `✅ *PR Ditambahkan!*\n\n${detail}` });
}

async function cmdDeletePR(sock, from, args, pushName) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delpr <id>` }); return; }
    const pr = getPRById(args[0]);
    if (!pr) { await sock.sendMessage(from, { text: `❌ PR ${args[0]} tidak ditemukan.` }); return; }
    deletePR(args[0]);
    await sock.sendMessage(from, { text: `✅ PR *${pr.subject}* dihapus!` });
}

async function cmdListPR(sock, from, args) {
    let filter = 'active';
    if (args.includes('all')) filter = 'all';
    if (args.includes('expired')) filter = 'expired';
    const result = formatPRList(getPRs(filter));
    await sock.sendMessage(from, { text: result.text });
}

async function cmdSetOwner(sock, from, args, pushName, userLevel) {
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .setowner <nomor>|<nama>\n⚠️ Hanya bisa diset 1x!' }); return; }
    const currentOwner = getOwner();
    if (currentOwner.number && userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Owner sudah terdaftar.' }); return; }
    const parts = args.join(' ').split('|').map(p => p.trim());
    const number = parts[0]?.replace(/[^0-9]/g, '') || '';
    const name = parts[1] || pushName;
    if (number.length < 10) { await sock.sendMessage(from, { text: '❌ Nomor tidak valid!' }); return; }
    setOwner(number, name);
    await sock.sendMessage(from, { text: `✅ *Owner Terdaftar!*\n\n👤 ${name}\n📱 ${number}\n\nGunakan .mylevel untuk cek.` });
}

async function cmdAddPartner(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    if (args.length === 0) { await sock.sendMessage(from, { text: `⭐ ${prefix}addpartner nomor|nama\nContoh: ${prefix}addpartner 628xxx|Budi` }); return; }
    const parts = args.join(' ').split('|').map(p => p.trim());
    const number = parts[0]?.replace(/[^0-9]/g, '') || '';
    if (number.length < 10) { await sock.sendMessage(from, { text: '❌ Nomor tidak valid!' }); return; }
    const result = addPartner(number, parts[1] || '', pushName);
    await sock.sendMessage(from, { text: result.success ? `✅ Partner *${result.partner.name}* ditambahkan!` : `❌ ${result.error}` });
}

async function cmdRemovePartner(sock, from, args, pushName) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delpartner <nomor>` }); return; }
    const result = removePartner(args[0].replace(/[^0-9]/g, ''));
    await sock.sendMessage(from, { text: result.success ? `✅ Partner *${result.partner.name}* dihapus!` : `❌ ${result.error}` });
}

async function cmdListPartners(sock, from) {
    const partners = getPartners();
    if (partners.length === 0) { await sock.sendMessage(from, { text: '⭐ Belum ada partner.' }); return; }
    let text = `⭐ *DAFTAR PARTNER*\n\n`;
    partners.forEach((p, i) => { text += `${i + 1}. 👤 ${p.name}\n   📱 ${p.number}\n\n`; });
    await sock.sendMessage(from, { text });
}

async function cmdAddChannel(sock, from, args, pushName) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `📢 ${global.botConfig.prefix}addch channel_id|nama` }); return; }
    const parts = args.join(' ').split('|').map(p => p.trim());
    const result = addChannel(parts[0] || '', parts[1] || '', pushName);
    await sock.sendMessage(from, { text: result.success ? `✅ Channel *${result.channel.name}* ditambahkan!` : `❌ ${result.error}` });
}

async function cmdRemoveChannel(sock, from, args, pushName) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delch <channel_id>` }); return; }
    const result = removeChannel(args[0]);
    await sock.sendMessage(from, { text: result.success ? '✅ Channel dihapus!' : `❌ ${result.error}` });
}

async function cmdListChannels(sock, from) {
    const channels = getChannels();
    if (channels.length === 0) { await sock.sendMessage(from, { text: '📢 Belum ada channel.' }); return; }
    let text = `📢 *DAFTAR CHANNEL*\n\n`;
    channels.forEach(ch => { text += `📢 ${ch.name}\n   🆔 \`${ch.id}\`\n\n`; });
    await sock.sendMessage(from, { text });
}

async function cmdAddGroupCmd(sock, from, args, pushName) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `👥 ${global.botConfig.prefix}addgroup group_id|nama` }); return; }
    const parts = args.join(' ').split('|').map(p => p.trim());
    const result = addGroup(parts[0] || '', parts[1] || '', pushName);
    await sock.sendMessage(from, { text: result.success ? `✅ Group *${result.group.name}* ditambahkan!` : `❌ ${result.error}` });
}

async function cmdRemoveGroupCmd(sock, from, args, pushName) {
    if (args.length === 0) { await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delgroup <group_id>` }); return; }
    const result = removeGroup(args[0]);
    await sock.sendMessage(from, { text: result.success ? '✅ Group dihapus!' : `❌ ${result.error}` });
}

async function cmdListGroups(sock, from) {
    const groups = getGroups();
    if (groups.length === 0) { await sock.sendMessage(from, { text: '👥 Belum ada group.' }); return; }
    let text = `👥 *DAFTAR GROUP*\n\n`;
    groups.forEach(gr => { text += `👥 ${gr.name}\n   🆔 \`${gr.id}\`\n\n`; });
    await sock.sendMessage(from, { text });
}

async function cmdGetId(sock, from, messageInfo) {
    const prefix = global.botConfig.prefix;
    const msg = messageInfo.message;
    let taggedUsers = [];
    if (msg?.extendedTextMessage?.contextInfo?.mentionedJid) taggedUsers = msg.extendedTextMessage.contextInfo.mentionedJid;
    if (taggedUsers.length > 0) {
        let text = `👤 *TAGGED USERS*\n\n`;
        taggedUsers.forEach(userJid => {
            const userId = userJid.split('@')[0];
            const no = userId.startsWith('62') ? '0' + userId.slice(2) : userId;
            text += `No: ${no}\nID: ${userId}\n\n`;
        });
        await sock.sendMessage(from, { text, mentions: taggedUsers });
        return;
    }
    const chatType = messageInfo.isChannel ? 'channel' : messageInfo.isGroup ? 'group' : 'private';
    if (chatType === 'channel') {
        await sock.sendMessage(from, { text: `📢 *CHANNEL ID*\n\nFull: \`${from}\`\nID: \`${from.split('@')[0]}\`` });
    } else if (chatType === 'group') {
        try {
            const meta = await sock.groupMetadata(from);
            await sock.sendMessage(from, { text: `👥 *GROUP ID*\n\nNama: ${meta.subject}\nMember: ${meta.participants.length}\nFull: \`${from}\`\nID: \`${from.split('@')[0]}\`` });
        } catch (e) {
            await sock.sendMessage(from, { text: `👥 *GROUP ID*\n\nFull: \`${from}\`` });
        }
    } else {
        const userId = from.split('@')[0];
        const no = userId.startsWith('62') ? '0' + userId.slice(2) : userId;
        await sock.sendMessage(from, { text: `👤 *USER ID*\n\nNama: ${messageInfo.pushName}\nNo: ${no}\nFull: \`${from}\`\nID: \`${userId}\`` });
    }
}

async function cmdPing(sock, from) {
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;
    const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
    const uptime = process.uptime();
    const d = Math.floor(uptime / 86400), h = Math.floor((uptime % 86400) / 3600), m = Math.floor((uptime % 3600) / 60), s = Math.floor(uptime % 60);
    await sock.sendMessage(from, { text: `🏓 *PONG!*\n\n🟢 Online\n📊 ${responseTime}ms\n💾 ${memMB} MB\n⏱️ ${d}d ${h}h ${m}m ${s}s\n\n🤖 ${global.botConfig.name} v${global.botConfig.version}` });
}

async function cmdMyLevel(sock, from, pushName, senderNumber) {
    const level = getUserLevel(senderNumber, pushName);
    const levelName = getLevelName(level);
    const permissions = getPermissionList(level);
    let text = `╔══════════════════════════╗\n║  👤 LEVEL INFO         ║\n╚══════════════════════════╝\n\n👤 ${pushName}\n⭐ ${levelName} (Level ${level})\n\n📋 *Commands:*\n`;
    const cats = { 'Info': [], 'Jadwal': [], 'Reminder': [], 'Alight': [], 'SongFess': [], 'Menfess': [], 'Sticker': [], 'PR': [], 'Partner': [], 'Channel': [], 'Auto': [], 'Utility': [] };
    permissions.forEach(p => {
        if (['info','menu','help','owner','walas','mylevel'].includes(p)) cats['Info'].push(p);
        else if (['today','tomorrow','mapel','piket','jadwal'].includes(p)) cats['Jadwal'].push(p);
        else if (['reminder','sendreminder'].includes(p)) cats['Reminder'].push(p);
        else if (['alight','alightmotion','am'].includes(p)) cats['Alight'].push(p);
        else if (['songfess','sf'].includes(p)) cats['SongFess'].push(p);
        else if (['menfess','confess'].includes(p)) cats['Menfess'].push(p);
        else if (['sticker','stiker','s'].includes(p)) cats['Sticker'].push(p);
        else if (['addpr','delpr','pr'].includes(p)) cats['PR'].push(p);
        else if (['addpartner','delpartner','listpartner'].includes(p)) cats['Partner'].push(p);
        else if (['addch','delch','addgroup','delgroup','listch','listgroup'].includes(p)) cats['Channel'].push(p);
        else if (['welcome','goodbye','typing','record','read','postsw','reactsw','auto'].includes(p)) cats['Auto'].push(p);
        else cats['Utility'].push(p);
    });
    for (const [cat, cmds] of Object.entries(cats)) { if (cmds.length > 0) text += `📂 ${cat}: ${cmds.join(', ')}\n`; }
    text += `\n🛍️ Shop: /catalog | /help`;
    await sock.sendMessage(from, { text });
}

async function cmdToggleFeature(sock, from, args, featureName, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    const status = args[0]?.toLowerCase();
    if (!status || (status !== 'on' && status !== 'off')) {
        const current = getFeature(featureName);
        await sock.sendMessage(from, { text: `${current?.status === 'on' ? '🟢' : '🔴'} *${featureName.toUpperCase()}*\n\nStatus: ${current?.status?.toUpperCase() || 'OFF'}\n\nGunakan: .${featureName} on/off` });
        return;
    }
    const result = toggleFeature(featureName, status);
    if (result.success) {
        await sock.sendMessage(from, { text: `${status === 'on' ? '🟢' : '🔴'} *${featureName.toUpperCase()}* di${status === 'on' ? 'aktif' : 'nonaktif'}kan!` });
        if (featureName === 'autopostsw' && status === 'on') {
            try { await sock.sendMessage('status@broadcast', { text: getAutoPostSWCaption() }); } catch (e) {}
        }
    } else { await sock.sendMessage(from, { text: `❌ ${result.error}` }); }
}

async function cmdSetFeatureMessage(sock, from, args, featureName, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: `📝 *SET ${featureName.toUpperCase()}*\n\nCurrent: ${getFeature(featureName)?.message || '-'}\n\nGunakan: .set${featureName} <pesan>` }); return; }
    const result = updateFeatureMessage(featureName, args.join(' '));
    await sock.sendMessage(from, { text: result.success ? `✅ Pesan ${featureName} diupdate!` : `❌ ${result.error}` });
}

async function cmdSetReactEmoji(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: `😍 *SET REACT*\n\nCurrent: ${getFeature('autoreactsw')?.emoji || '❤️'}\n\nGunakan: .setreact <emoji>` }); return; }
    const result = updateFeatureEmoji('autoreactsw', args[0]);
    await sock.sendMessage(from, { text: result.success ? `✅ Emoji diupdate ke: ${args[0]}` : `❌ ${result.error}` });
}

async function cmdSetPostSWCaption(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: `📢 *SET POST SW*\n\nCurrent: ${getAutoPostSWCaption()}\n\nGunakan: .setpostsw <caption>` }); return; }
    updateAutoPostSWCaption(args.join(' '));
    await sock.sendMessage(from, { text: '✅ Caption Post SW diupdate!' });
}

async function cmdListAutoFeatures(sock, from) {
    const features = [
        { name: 'welcome', label: 'Welcome Canvas', cmd: '.welcome' },
        { name: 'goodbye', label: 'Goodbye Canvas', cmd: '.goodbye' },
        { name: 'autotyping', label: 'Auto Typing', cmd: '.typing' },
        { name: 'autorecord', label: 'Auto Record VN', cmd: '.record' },
        { name: 'autoread', label: 'Auto Read', cmd: '.read' },
        { name: 'autopostsw', label: 'Auto Post SW', cmd: '.postsw' },
        { name: 'autoreactsw', label: 'Auto React SW', cmd: '.reactsw' },
    ];
    let text = `⚙️ *AUTO FEATURES STATUS*\n\n`;
    features.forEach(f => {
        const status = getFeatureStatus(f.name);
        text += `${status ? '🟢' : '🔴'} *${f.label}*\n   ${f.cmd} on/off\n`;
        if (f.name === 'welcome' || f.name === 'goodbye') text += `   📝 .set${f.name} <pesan>\n`;
        if (f.name === 'autoreactsw') text += `   😍 ${getFeature('autoreactsw')?.emoji || '❤️'}\n`;
        text += `\n`;
    });
    text += `👑 .setwelcome | .setgoodbye | .setreact | .setpostsw`;
    await sock.sendMessage(from, { text });
}

async function cmdChannelCreate(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chcreate <nama>\nContoh: .chcreate FestiveShopID' }); return; }
    try {
        const result = await sock.newsletterCreate(args.join(' '));
        await sock.sendMessage(from, { text: `✅ *Channel Dibuat!*\n\n📰 ${args.join(' ')}\n🆔 \`${result.id}\`\n\n💡 .chinfo ${result.id}` });
    } catch (e) { await sock.sendMessage(from, { text: `❌ Gagal: ${e.message}` }); }
}

async function cmdChannelFollow(sock, from, args, pushName, userLevel) {
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chfollow <jid>\nContoh: .chfollow 120363xxx@newsletter' }); return; }
    try { await sock.newsletterFollow(args[0]); await sock.sendMessage(from, { text: '✅ Berhasil follow channel!' }); }
    catch (e) { await sock.sendMessage(from, { text: `❌ Gagal: ${e.message}` }); }
}

async function cmdChannelInfo(sock, from, args, pushName, userLevel) {
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chinfo <jid>' }); return; }
    try {
        const meta = await sock.newsletterMetadata('jid', args[0]);
        let text = `📰 *CHANNEL INFO*\n━━━━━━━━━━━━━━━━━━━━━━\n\n📰 Nama: ${meta.name || 'N/A'}\n🆔 JID: ${meta.id || args[0]}\n📝 Deskripsi: ${meta.description || 'N/A'}\n👥 Subscribers: ${meta.subscribers || 'N/A'}\n🔗 Invite: ${meta.invite || 'N/A'}`;
        await sock.sendMessage(from, { text });
    } catch (e) { await sock.sendMessage(from, { text: `❌ Gagal: ${e.message}` }); }
}

async function cmdChannelUpdate(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length < 2) { await sock.sendMessage(from, { text: '❌ .chupdate <jid>|<nama_baru>' }); return; }
    const parts = args.join(' ').split('|').map(p => p.trim());
    try { await sock.newsletterUpdateName(parts[0], parts[1]); await sock.sendMessage(from, { text: `✅ Nama channel diupdate ke: *${parts[1]}*` }); }
    catch (e) { await sock.sendMessage(from, { text: `❌ Gagal: ${e.message}` }); }
}

async function cmdChannelDelete(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) { await sock.sendMessage(from, { text: '🔒 Hanya owner.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ .chdelete <jid>' }); return; }
    try { await sock.newsletterDelete(args[0]); await sock.sendMessage(from, { text: '✅ Channel berhasil dihapus!' }); }
    catch (e) { await sock.sendMessage(from, { text: `❌ Gagal: ${e.message}` }); }
}

async function cmdShopCatalog(sock, from, args) {
    const catalog = getCatalog();
    if (args.length > 0 && !isNaN(args[0])) {
        const page = parseInt(args[0]) - 1;
        const text = formatCarouselText(catalog, page);
        await sock.sendMessage(from, { text });
        return;
    }
    if (args.length > 0) {
        const category = getCategories().find(c => c.toLowerCase().includes(args.join(' ').toLowerCase()));
        if (category) {
            const products = catalog.filter(p => p.category === category);
            if (products.length > 0) {
                let text = `📂 *${category}*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                products.forEach(p => { text += `🆔 \`${p.id}\`\n📌 ${p.name}\n💰 ${p.priceDisplay}\n⏱️ ${p.duration}\n\n`; });
                text += `💡 /detail <id> | /buy <id>`;
                await sock.sendMessage(from, { text });
                return;
            }
        }
    }
    const text = formatCarouselText(catalog, 0);
    await sendWithButtons(sock, from, text, '🛍️ FestiveShopID',
        [
            { buttonId: '/payment', buttonText: { displayText: '💳 Pembayaran' }, type: 1 },
            { buttonId: '/topbuyer', buttonText: { displayText: '🏆 Top Buyer' }, type: 1 }
        ]
    );
}

async function cmdShopDetail(sock, from, args) {
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ /detail <id>\nContoh: /detail edit-foto' }); return; }
    const product = getProductById(args[0]);
    if (!product) { await sock.sendMessage(from, { text: '❌ Produk tidak ditemukan.' }); return; }
    let text = `🛍️ *${product.name}*\n━━━━━━━━━━━━━━━━━━━━━━\n\n📂 ${product.category}\n💰 ${product.priceDisplay}\n⏱️ ${product.duration}\n\n📝 ${product.description}\n\n✨ *Fitur:*\n`;
    product.features.forEach(f => { text += `  ✅ ${f}\n`; });
    text += `\n🛒 Order: /buy ${product.id} | catatan`;
    await sendWithButtons(sock, from, text, '🛍️ FestiveShopID',
        [
            { buttonId: `/buy ${product.id}`, buttonText: { displayText: '🛒 Order' }, type: 1 },
            { buttonId: '/catalog', buttonText: { displayText: '📋 Katalog' }, type: 1 }
        ]
    );
}

async function cmdShopBuy(sock, from, args, pushName, senderNumber) {
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ /buy <id> | <catatan>\nContoh: /buy edit-foto | Foto wisuda' }); return; }
    const parts = args.join(' ').split('|').map(p => p.trim());
    const product = getProductById(parts[0]);
    if (!product) { await sock.sendMessage(from, { text: '❌ Produk tidak ditemukan.' }); return; }
    const buyer = addBuyer({
        name: pushName, number: senderNumber,
        productId: product.id, productName: product.name,
        productPrice: product.priceDisplay, note: parts[1] || ''
    });
    const invoiceText = `🧾 *ORDER BERHASIL!*\n━━━━━━━━━━━━━━━━━━━━━━\n\n🆔 ${buyer.id}\n🛍️ ${product.name}\n💰 ${product.priceDisplay}\n👤 ${pushName}\n📅 ${new Date().toLocaleString('id-ID')}\n\n💡 Pembayaran akan dikirim otomatis.\nCek: /mybill ${buyer.id}`;
    await sock.sendMessage(from, { text: invoiceText });
    setTimeout(async () => {
        const paymentText = formatOrderInvoice(
            { id: buyer.id, productName: product.name, productPrice: product.priceDisplay, customerName: pushName, customerNumber: senderNumber, createdAt: buyer.createdAt }, buyer
        );
        await sendWithButtons(sock, from, paymentText, '💳 Pembayaran',
            [
                { buttonId: `/mybill ${buyer.id}`, buttonText: { displayText: '💰 Bayar Sekarang' }, type: 1 },
                { buttonId: `/mybill ${buyer.id} nanti`, buttonText: { displayText: '⏰ Nanti' }, type: 1 }
            ]
        );
    }, 2000);
}

async function cmdShopMyOrder(sock, from, args, senderNumber) {
    const orders = getBuyerByNumber(senderNumber);
    if (orders.length === 0) { await sock.sendMessage(from, { text: '📦 Belum ada pesanan.' }); return; }
    if (args.length > 0) {
        const order = orders.find(o => o.id === args[0]);
        if (!order) { await sock.sendMessage(from, { text: '❌ Order tidak ditemukan.' }); return; }
        let text = `📦 *ORDER #${order.id}*\n━━━━━━━━━━━━━━━━━━━━━━\n\n🛍️ ${order.productName}\n💰 ${order.productPrice}\n🏷️ Status: ${order.status === 'completed' ? '✅ Selesai' : order.status === 'pending' ? '⏳ Pending' : '❌ Cancelled'}\n💳 Pembayaran: ${order.paymentStatus === 'paid' ? '✅ LUNAS' : '⏳ BELUM BAYAR'}\n📅 ${new Date(order.createdAt).toLocaleString('id-ID')}`;
        if (order.note) text += `\n📝 Catatan: ${order.note}`;
        await sock.sendMessage(from, { text });
        return;
    }
    let text = `📦 *PESANAN SAYA*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    orders.forEach(o => {
        const emoji = o.status === 'completed' ? '✅' : o.status === 'pending' ? '⏳' : '❌';
        text += `${emoji} ${o.id}\n   🛍️ ${o.productName}\n   💰 ${o.productPrice}\n\n`;
    });
    text += `/myorder <id> untuk detail`;
    await sock.sendMessage(from, { text });
}

async function cmdShopMyBill(sock, from, args, pushName, senderNumber) {
    if (args.length === 0 || args.includes('list')) {
        const bills = getBuyerByNumber(senderNumber).filter(b => b.paymentStatus === 'unpaid');
        if (bills.length === 0) { await sock.sendMessage(from, { text: '💳 Tidak ada tagihan pending.' }); return; }
        let text = `💳 *TAGIHAN*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        bills.forEach(b => { text += `🆔 ${b.id}\n🛍️ ${b.productName}\n💰 ${b.productPrice}\n\n`; });
        text += `/mybill <id> untuk bayar`;
        await sock.sendMessage(from, { text });
        return;
    }
    const buyerId = args[0];
    if (args.includes('nanti') || args.includes('later')) {
        const buyer = getBuyerById(buyerId);
        if (!buyer) { await sock.sendMessage(from, { text: '❌ Tagihan tidak ditemukan.' }); return; }
        updateBuyer(buyerId, { billReminder: (buyer.billReminder || 0) + 1 });
        await sock.sendMessage(from, { text: `⏰ *Diingatkan!*\n\nTagihan ${buyerId} akan diingatkan.\nKetik /mybill untuk bayar nanti.` });
        return;
    }
    const buyer = getBuyerById(buyerId);
    if (!buyer) { await sock.sendMessage(from, { text: '❌ Tagihan tidak ditemukan.' }); return; }
    const orderInfo = { id: buyer.id, productName: buyer.productName, productPrice: buyer.productPrice, customerName: buyer.name, customerNumber: buyer.number, createdAt: buyer.createdAt };
    const text = formatOrderInvoice(orderInfo, buyer);
    await sock.sendMessage(from, { text });
}

async function cmdShopPayment(sock, from) {
    const methods = getPaymentMethods();
    let text = `💳 *METODE PEMBAYARAN*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const m of methods) {
        const typeIcon = m.type === 'qris' ? '📱' : m.type === 'ewallet' ? '💳' : '🏦';
        text += `${typeIcon} *${m.name}*\n   📞 ${m.number}\n`;
        
        if (m.type === 'qris' && m.qrisImage) {
            text += `   🖼️ QRIS: ${m.qrisImage}\n`;
        }
        text += `\n`;
    }
    
    text += `💡 Transfer ke salah satu metode.\nKirim bukti ke owner untuk verifikasi.\n\n⚠️ Pembayaran dalam 1x24 jam`;
    
    const qrisMethod = methods.find(m => m.type === 'qris' && m.qrisImage);
    if (qrisMethod) {
        try {
            await sock.sendMessage(from, {
                image: { url: qrisMethod.qrisImage },
                caption: text
            });
            return;
        } catch (e) {}
    }
    
    await sock.sendMessage(from, { text });
}

async function cmdShopDone(sock, from, args, pushName, userLevel) {
    if (userLevel < 1) { await sock.sendMessage(from, { text: '🔒 Partner & owner only.' }); return; }
    if (args.length === 0) { await sock.sendMessage(from, { text: '❌ /done <buyer_id>' }); return; }
    const buyer = getBuyerById(args[0]);
    if (!buyer) { await sock.sendMessage(from, { text: '❌ Buyer tidak ditemukan.' }); return; }
    updateBuyer(args[0], { status: 'completed', paymentStatus: 'paid' });
    const channelLink = global.botConfig.channelId ? `https://whatsapp.com/channel/${global.botConfig.channelId.split('@')[0]}` : 'https://whatsapp.com/channel/festiveshopid';
    const canvasBuffer = await createThanksCanvas(buyer.name, buyer.productName, channelLink);
    const buyerJid = buyer.number + '@s.whatsapp.net';
    try {
        await sock.sendMessage(buyerJid, { image: canvasBuffer, caption: `🎉 *TERIMA KASIH!*\n\nHai ${buyer.name}!\nPesanan *${buyer.productName}* telah selesai!\n\nJangan lupa follow channel kami:\n${channelLink}\n\n🛍️ FestiveShopID` });
    } catch (e) {}
    await sock.sendMessage(from, { text: `✅ Order *${args[0]}* selesai!\n\n🎉 Canvas thanks terkirim ke buyer.\n📰 Channel link dikirim.` });
}

async function cmdShopTopBuyer(sock, from) {
    const top = getTopBuyers(10);
    if (top.length === 0) { await sock.sendMessage(from, { text: '🏆 Belum ada buyer.' }); return; }
    let text = `🏆 *TOP 10 BUYERS*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    top.forEach((b, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        text += `${medal} ${b.name || b.number}\n   🛍️ ${b.count} order\n\n`;
    });
    await sock.sendMessage(from, { text });
}

async function cmdShopInfo(sock, from) {
    const methods = getPaymentMethods();
    const topBuyers = getTopBuyers(5);
    const totalProducts = getCatalog().length;
    
    let text = `🛍️ *FESTIVESHOP ID INFO*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📋 Total Produk: ${totalProducts}\n`;
    text += `💳 Metode Bayar: ${methods.length}\n`;
    text += `🏆 Top Buyer: ${topBuyers.length > 0 ? topBuyers[0].name || topBuyers[0].number : '-'}\n\n`;
    text += `💡 *Commands:*\n/catalog - Lihat produk\n/buy <id> - Order\n/myorder - Pesanan saya\n/mybill - Tagihan\n/payment - Pembayaran\n/topbuyer - Top buyer\n/info - Info ini\n/help - Bantuan`;
    
    await sendWithButtons(sock, from, text, '🛍️ FestiveShopID',
        [
            { buttonId: '/catalog', buttonText: { displayText: '📋 Katalog' }, type: 1 },
            { buttonId: '/payment', buttonText: { displayText: '💳 Pembayaran' }, type: 1 }
        ]
    );
}

async function cmdShopHelp(sock, from) {
    const text = `🛍️ *FESTIVESHOP ID HELP*\n━━━━━━━━━━━━━━━━━━━━━━\n\n📋 *Commands:*\n\n/catalog - Lihat katalog\n/catalog <page> - Halaman\n/detail <id> - Detail produk\n/buy <id> | <note> - Order\n/myorder - Pesanan saya\n/mybill - Tagihan\n/mybill <id> nanti - Bayar nanti\n/payment - Metode bayar\n/topbuyer - Top buyer\n/info - Info shop\n/help - Bantuan\n\n/done <id> - Selesai (partner+)\n\n💡 1. /catalog\n2. /buy id | catatan\n3. Bayar via /payment\n4. Kirim bukti ke owner\n5. Owner /done\n\n🛍️ FestiveShopID\nYour Trusted Digital Creative Partner`;
    await sock.sendMessage(from, { text });
}
