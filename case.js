const schoolData = require('./lib/schoolData');
const reminderSystem = require('./lib/reminder');
const { alightMotion } = require('./lib/alightMotion');
const { addSongFess, getSongFessStats, getAllSongFess } = require('./lib/songFess');
const { addConfess, getConfessQueue, removeConfess } = require('./lib/confess');
const { createSticker, checkFfmpeg, CONFIG: STICKER_CONFIG } = require('./lib/sticker');
const { formatDuration } = require('./lib/stickerUtils');
const { suggestCommand, formatSuggestion } = require('./lib/cmdSuggest');
const { addPR, deletePR, getPRs, getPRById, getPRStats, formatPRList, formatPRDetail } = require('./lib/prTracker');
const { getUserLevel, hasPermission, getLevelName, addPartner, removePartner, listPartners, LEVELS, PERMISSIONS, getPermissionList } = require('./lib/permission');
const { addChannel, addGroup, removeChannel, removeGroup, getChannels, getGroups, getAllTargets } = require('./lib/channelManager');
const { 
    getFeature, getFeatureStatus, toggleFeature, 
    updateFeatureMessage, updateFeatureEmoji,
    updateAutoPostSWCaption, getAutoPostSWCaption
} = require('./lib/autoFeatures');
const { getShopStatus, toggleShop, getCatalog, getProductById, getProductsByCategory, getCategories, createOrder, getOrders, updateOrderStatus, getShopStats, formatCatalog, formatProductDetail, formatOrderDetail, formatOrderList, CONFIG: SHOP_CONFIG } = require('./lib/shop');

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
    const isShopPrefix = text.startsWith(SHOP_CONFIG.PREFIX);
    
    if (!isMainPrefix && !isShopPrefix) return;
    
    const prefix = isShopPrefix ? SHOP_CONFIG.PREFIX : global.botConfig.prefix;
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
        const shopStatus = getShopStatus();
        
        if (cmd === 'shop' && commandArgs[0] === 'on' && userLevel === 2) {
            toggleShop('on', pushName);
            await sock.sendMessage(from, { text: '🟢 *Shop berhasil diaktifkan!*\n\n🛍️ FestiveShopID sekarang BUKA.\n\nKetik /catalog untuk melihat produk.' });
            return;
        }
        
        if (cmd === 'shop' && commandArgs[0] === 'off' && userLevel === 2) {
            toggleShop('off', pushName);
            await sock.sendMessage(from, { text: '🔴 *Shop berhasil dinonaktifkan!*\n\n🛍️ FestiveShopID sekarang TUTUP.' });
            return;
        }
        
        if (!shopStatus && cmd !== 'shop') {
            await sock.sendMessage(from, { text: '🔴 *Shop sedang TUTUP.*\n\nSilakan coba lagi nanti atau hubungi owner.' });
            return;
        }
        
        try {
            switch(cmd) {
                case 'catalog':
                case 'menu':
                case 'list':
                    await cmdShopCatalog(sock, from, commandArgs);
                    break;
                    
                case 'detail':
                case 'info':
                case 'produk':
                    await cmdShopDetail(sock, from, commandArgs);
                    break;
                    
                case 'buy':
                case 'order':
                case 'beli':
                    await cmdShopBuy(sock, from, commandArgs, pushName, senderNumber);
                    break;
                    
                case 'myorder':
                case 'pesanan':
                case 'status':
                    await cmdShopMyOrder(sock, from, commandArgs, senderNumber);
                    break;
                    
                case 'complete':
                case 'selesai':
                    await cmdShopComplete(sock, from, commandArgs, userLevel);
                    break;
                    
                case 'cancel':
                case 'batal':
                    await cmdShopCancel(sock, from, commandArgs, userLevel);
                    break;
                    
                case 'orders':
                case 'allorders':
                    await cmdShopOrders(sock, from, commandArgs, userLevel);
                    break;
                    
                case 'stats':
                case 'statistik':
                    await cmdShopStats(sock, from);
                    break;
                    
                case 'help':
                case 'bantuan':
                case '?':
                    await cmdShopHelp(sock, from);
                    break;
                    
                default:
                    await sock.sendMessage(from, { text: '❌ Command shop tidak dikenal.\n\nKetik /help untuk bantuan.\nKetik /catalog untuk lihat produk.' });
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
                await cmdBroadcast(sock, from, commandArgs, pushName, enrichedMessageInfo);
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

                
            default:
                if (cmd) {
                    const suggestions = suggestCommand(cmd, 0.3, 5);
                    
                    if (suggestions.length > 0) {
                        const suggestionText = formatSuggestion(cmd, suggestions, prefix);
                        
                        try {
                            await sock.sendMessage(from, {
                                text: suggestionText,
                                footer: '💡 Command Suggestion System',
                                buttons: suggestions.slice(0, 3).map((s, i) => ({
                                    buttonId: `${prefix}${s.cmd}`,
                                    buttonText: { displayText: `${i === 0 ? '⭐ ' : ''}${prefix}${s.cmd}` },
                                    type: 1
                                })),
                                headerType: 1
                            });
                        } catch (e) {
                            await sock.sendMessage(from, { text: suggestionText });
                        }
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
            await sock.sendMessage(from, { 
                text: '❌ Maaf, terjadi kesalahan saat memproses command.\n\nSilakan coba lagi nanti.' 
            });
        } catch (e) {}
    }
};

async function cmdToggleFeature(sock, from, args, featureName, pushName, userLevel) {
    if (userLevel < 2) {
        await sock.sendMessage(from, { text: '🔒 Hanya owner yang bisa mengubah pengaturan ini.' });
        return;
    }
    
    const status = args[0]?.toLowerCase();
    if (!status || (status !== 'on' && status !== 'off')) {
        const current = getFeature(featureName);
        const emoji = current?.status === 'on' ? '🟢' : '🔴';
        await sock.sendMessage(from, {
            text: `${emoji} *${featureName.toUpperCase()}*\n\nStatus: ${current?.status?.toUpperCase() || 'OFF'}\n\nGunakan: .${featureName} on/off`
        });
        return;
    }
    
    const result = toggleFeature(featureName, status);
    
    if (result.success) {
        const emoji = status === 'on' ? '🟢' : '🔴';
        await sock.sendMessage(from, { text: `${emoji} *${featureName.toUpperCase()}* berhasil di${status === 'on' ? 'aktif' : 'nonaktif'}kan!` });
        
        if (featureName === 'autopostsw' && status === 'on') {
            try {
                const caption = getAutoPostSWCaption();
                await sock.sendMessage('status@broadcast', { text: caption });
            } catch (e) {}
        }
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdSetFeatureMessage(sock, from, args, featureName, pushName, userLevel) {
    if (userLevel < 2) {
        await sock.sendMessage(from, { text: '🔒 Hanya owner.' });
        return;
    }
    
    if (args.length === 0) {
        const feature = getFeature(featureName);
        await sock.sendMessage(from, {
            text: `📝 *SET ${featureName.toUpperCase()} MESSAGE*\n\nCurrent: ${feature?.message || '-'}\n\nGunakan: .set${featureName} <pesan>\n\nVariabel: @user @group`
        });
        return;
    }
    
    const message = args.join(' ');
    const result = updateFeatureMessage(featureName, message);
    
    if (result.success) {
        await sock.sendMessage(from, { text: `✅ Pesan ${featureName} diupdate!\n\n"${message}"` });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdSetReactEmoji(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) {
        await sock.sendMessage(from, { text: '🔒 Hanya owner.' });
        return;
    }
    
    if (args.length === 0) {
        const feature = getFeature('autoreactsw');
        await sock.sendMessage(from, {
            text: `😍 *SET REACT EMOJI*\n\nCurrent: ${feature?.emoji || '❤️'}\n\nGunakan: .setreact <emoji>`
        });
        return;
    }
    
    const result = updateFeatureEmoji('autoreactsw', args[0]);
    
    if (result.success) {
        await sock.sendMessage(from, { text: `✅ Emoji react diupdate ke: ${args[0]}` });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdSetPostSWCaption(sock, from, args, pushName, userLevel) {
    if (userLevel < 2) {
        await sock.sendMessage(from, { text: '🔒 Hanya owner.' });
        return;
    }
    
    if (args.length === 0) {
        const caption = getAutoPostSWCaption();
        await sock.sendMessage(from, {
            text: `📢 *SET POST SW CAPTION*\n\nCurrent: ${caption}\n\nGunakan: .setpostsw <caption>`
        });
        return;
    }
    
    const caption = args.join(' ');
    updateAutoPostSWCaption(caption);
    
    await sock.sendMessage(from, { text: `✅ Caption Post SW diupdate!\n\n"${caption}"` });
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
        text += `${status ? '🟢' : '🔴'} *${f.label}*\n`;
        text += `   ${f.cmd} on/off\n`;
        
        if (f.name === 'welcome' || f.name === 'goodbye') {
            const feature = getFeature(f.name);
            text += `   📝 .set${f.name} <pesan>\n`;
        }
        if (f.name === 'autoreactsw') {
            const feature = getFeature(f.name);
            text += `   😍 Emoji: ${feature?.emoji || '❤️'}\n`;
        }
        
        text += `\n`;
    });
    
    text += `👑 *Owner only commands*\n\n`;
    text += `.setwelcome <pesan> - Set welcome message\n`;
    text += `.setgoodbye <pesan> - Set goodbye message\n`;
    text += `.setreact <emoji> - Set react emoji\n`;
    text += `.setpostsw <caption> - Set post SW caption`;
    
    await sock.sendMessage(from, { text });
                               }

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

async function sendListMessage(sock, from, title, buttonText, footer, sections) {
    try {
        await sock.sendMessage(from, {
            text: title,
            footer: footer,
            buttonText: buttonText,
            sections: sections
        });
    } catch (e) {
        let fallback = title + '\n\n';
        sections.forEach(section => {
            fallback += `📂 *${section.title}*\n`;
            section.rows.forEach(row => {
                fallback += `  • ${row.title} - ${row.description}\n`;
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
            rows: [
                { title: '🤖 Info Bot', description: 'Informasi lengkap tentang bot', rowId: `${prefix}info` },
                { title: '👤 Owner Bot', description: 'Kontak dan info owner', rowId: `${prefix}owner` },
                { title: '👩‍🏫 Wali Kelas', description: 'Informasi wali kelas 8C', rowId: `${prefix}walas` },
                { title: '⭐ My Level', description: 'Cek level & permission kamu', rowId: `${prefix}mylevel` }
            ]
        },
        {
            title: '📅 JADWAL SEKOLAH',
            rows: [
                { title: '📆 Hari Ini', description: 'Jadwal pelajaran hari ini', rowId: `${prefix}today` },
                { title: '📅 Besok', description: 'Reminder untuk besok', rowId: `${prefix}tomorrow` },
                { title: '📚 Mapel', description: 'Jadwal mapel per hari', rowId: `${prefix}mapel senin` },
                { title: '🧹 Piket', description: 'Jadwal piket per hari', rowId: `${prefix}piket` },
                { title: '📖 Lengkap', description: 'Semua jadwal', rowId: `${prefix}jadwal` }
            ]
        },
        {
            title: '⏰ REMINDER',
            rows: [
                { title: '📋 Status', description: 'Cek status reminder', rowId: `${prefix}reminder` },
                { title: '📤 Kirim', description: 'Kirim reminder manual', rowId: `${prefix}sendreminder` }
            ]
        },
        {
            title: '🎵 SONGFESS & MENFESS',
            rows: [
                { title: '🎵 SongFess', description: 'Kirim lagu ke channel', rowId: `${prefix}songfess` },
                { title: '💌 Menfess', description: 'Pesan anonim ke seseorang', rowId: `${prefix}menfess` }
            ]
        },
        {
            title: '🎨 STICKER & ALIGHT',
            rows: [
                { title: '🎨 Sticker', description: 'Buat sticker dari foto/video (max 15s)', rowId: `${prefix}sticker` },
                { title: '✨ Alight Motion', description: 'Generate premium 1 tahun', rowId: `${prefix}alight` }
            ]
        },
        {
            title: '📚 PR / TUGAS',
            rows: [
                { title: '📝 Tambah PR', description: 'Tambah tugas baru (partner)', rowId: `${prefix}addpr` },
                { title: '📋 Daftar PR', description: 'Lihat semua PR/tugas', rowId: `${prefix}pr` },
                { title: '🗑️ Hapus PR', description: 'Hapus PR by ID (partner)', rowId: `${prefix}delpr` }
            ]
        },
        {
            title: '🛍️ FESTIVESHOP ID',
            rows: [
                { title: '📋 Katalog', description: 'Lihat katalog produk', rowId: '/catalog' },
                { title: '🛒 Order', description: 'Order produk', rowId: '/buy' },
                { title: '📦 Pesanan', description: 'Cek pesanan saya', rowId: '/myorder' },
                { title: '❓ Bantuan', description: 'Bantuan shop', rowId: '/help' }
            ]
        },
        {
            title: '🛠️ UTILITY',
            rows: [
                { title: '🔍 Search', description: 'Cari command', rowId: `${prefix}search` },
                { title: '🆔 Get ID', description: 'Lihat ID chat/user', rowId: `${prefix}getid` },
                { title: '🏓 Ping', description: 'Cek status bot', rowId: `${prefix}ping` }
            ]
        }
    ];

    await sendListMessage(
        sock, from,
        `🤖 *${global.botConfig.name}* v${global.botConfig.version}\n` +
        `👤 ${global.botConfig.owner}\n\n` +
        `📌 *Pilih menu di bawah ini:*\n\n` +
        `⏰ Reminder: 🌅12:00 | ☀️16:00 | 🌙20:00\n` +
        `🛍️ Shop: /catalog | Prefix: ${prefix}cmd`,
        '📋 Menu Utama',
        '💡 Prefix: . (titik) | Shop: / (slash)',
        sections
    );
}

async function cmdOwner(sock, from) {
    const ownerNumber = global.botConfig.noOwner.replace(/^0/, '62');
    
    await sendWithButtons(
        sock, from,
        `╔══════════════════════════╗\n` +
        `║       👤 OWNER BOT       ║\n` +
        `╚══════════════════════════╝\n\n` +
        `👤 *Nama:* ${global.botConfig.owner}\n` +
        `📞 *WhatsApp:* ${global.botConfig.noOwner}\n` +
        `💬 *Telegram:* @ndiidepzX\n` +
        `🔗 *Link:* https://wa.me/${ownerNumber}\n\n` +
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
        
        await sendWithButtons(
            sock, from, text,
            '📅 Jadwal Hari Ini',
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
        
        await sendWithButtons(
            sock, from, text,
            '🔮 Reminder Besok',
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
        const sections = [
            {
                title: 'PILIH HARI',
                rows: [
                    { title: '📆 Senin', description: 'Jadwal pelajaran hari Senin', rowId: `${prefix}mapel senin` },
                    { title: '📆 Selasa', description: 'Jadwal pelajaran hari Selasa', rowId: `${prefix}mapel selasa` },
                    { title: '📆 Rabu', description: 'Jadwal pelajaran hari Rabu', rowId: `${prefix}mapel rabu` },
                    { title: '📆 Kamis', description: 'Jadwal pelajaran hari Kamis', rowId: `${prefix}mapel kamis` },
                    { title: '📆 Jumat', description: 'Jadwal pelajaran hari Jumat', rowId: `${prefix}mapel jumat` }
                ]
            }
        ];
        
        await sendListMessage(
            sock, from,
            '📅 *Pilih hari untuk melihat jadwal pelajaran:*',
            '📋 Pilih Hari',
            '💡 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat',
            sections
        );
        return;
    }
    
    const result = schoolData.getScheduleByDay(args[0]);
    
    if (!result) {
        await sock.sendMessage(from, { 
            text: '❌ Hari tidak valid.\n\nGunakan: senin, selasa, rabu, kamis, jumat, atau 1-5\n\nContoh: .mapel senin' 
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
    
    await sock.sendMessage(from, { text });
}

async function cmdPiket(sock, from, args) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        const sections = [
            {
                title: 'PILIH HARI PIKET',
                rows: [
                    { title: '🧹 Senin', description: 'Anggota piket hari Senin', rowId: `${prefix}piket senin` },
                    { title: '🧹 Selasa', description: 'Anggota piket hari Selasa', rowId: `${prefix}piket selasa` },
                    { title: '🧹 Rabu', description: 'Anggota piket hari Rabu', rowId: `${prefix}piket rabu` },
                    { title: '🧹 Kamis', description: 'Anggota piket hari Kamis', rowId: `${prefix}piket kamis` },
                    { title: '🧹 Jumat', description: 'Anggota piket hari Jumat', rowId: `${prefix}piket jumat` }
                ]
            }
        ];
        
        await sendListMessage(
            sock, from,
            '🧹 *Pilih hari untuk melihat jadwal piket:*',
            '🧹 Pilih Hari',
            '💡 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat',
            sections
        );
        return;
    }
    
    const result = schoolData.getPiketByDay(args[0]);
    
    if (!result) {
        await sock.sendMessage(from, { 
            text: '❌ Hari tidak valid.\n\nGunakan: senin, selasa, rabu, kamis, jumat, atau 1-5' 
        });
        return;
    }
    
    let text = `╔══════════════════════════╗\n`;
    text += `║  🧹 PIKET ${result.day.toUpperCase().padEnd(17)} ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    text += `👥 *Anggota Piket Kelas & MBG:*\n\n`;
    
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
    
    await sendWithButtons(
        sock, from, text,
        '🧹 Piket Kelas 8C',
        [
            { buttonId: `${prefix}piket`, buttonText: { displayText: '🔄 Cek Hari Lain' }, type: 1 },
            { buttonId: `${prefix}jadwal`, buttonText: { displayText: '📖 Jadwal Lengkap' }, type: 1 }
        ]
    );
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
            text: '❌ Gagal mengirim reminder.\n\nCoba lagi nanti atau cek koneksi.' 
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
        await sendWithButtons(
            sock, from,
            `╔══════════════════════════╗\n` +
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
            `💡 *Contoh:*\n` +
            `${prefix}alight user@gmail.com`,
            'Powered by rafaelxd.my.id',
            [
                { buttonId: `${prefix}alight guide`, buttonText: { displayText: '📖 Panduan' }, type: 1 },
                { buttonId: `${prefix}owner`, buttonText: { displayText: '👤 Bantuan' }, type: 1 }
            ]
        );
        return;
    }

    if (args.length === 1) {
        const email = args[0];
        
        if (!email.includes('@') || !email.includes('.')) {
            await sock.sendMessage(from, { text: '❌ *Email tidak valid!*\n\nFormat: nama@domain.com' });
            return;
        }

        await sock.sendMessage(from, { 
            text: '🔄 *Mengirim magic link...*\n\n' +
                  `📧 Email: ${email}\n\n⏳ Mohon tunggu...`
        });

        try {
            const result = await alightMotion(email);

            if (result.success) {
                await sock.sendMessage(from, {
                    text: `✅ *Magic Link Terkirim!*\n\n` +
                          `📧 ${email}\n\n` +
                          `📌 *Langkah selanjutnya:*\n` +
                          `1. Buka inbox email (cek Spam)\n` +
                          `2. Cari email Alight Motion\n` +
                          `3. Copy link verifikasi\n` +
                          `4. ${prefix}alight ${email} <link>`
                });
            } else {
                await sock.sendMessage(from, { text: `❌ Gagal: ${result.error}` });
            }
        } catch (err) {
            await sock.sendMessage(from, { text: `❌ Error: ${err.message}` });
        }
        return;
    }

    if (args.length >= 2) {
        const email = args[0];
        const rawLink = args.slice(1).join(' ');

        await sock.sendMessage(from, { text: '🔄 *Memverifikasi akun...*' });

        try {
            const result = await alightMotion(email, rawLink);

            if (result.success) {
                await sendWithButtons(
                    sock, from,
                    `✅ *PREMIUM BERHASIL!*\n\n` +
                    `📧 ${email}\n⭐ PREMIUM\n📅 1 Tahun\n🔑 ${result.oobCode || 'N/A'}`,
                    '✨ Generated by RafaelXD',
                    [
                        { buttonId: `${prefix}alight`, buttonText: { displayText: '🔄 Generate Lagi' }, type: 1 },
                        { buttonId: `${prefix}owner`, buttonText: { displayText: '👤 Bantuan' }, type: 1 }
                    ]
                );
            } else {
                await sock.sendMessage(from, { text: `❌ Verifikasi gagal: ${result.error}` });
            }
        } catch (err) {
            await sock.sendMessage(from, { text: `❌ Error: ${err.message}` });
        }
    }
}

async function cmdSongFess(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sendWithButtons(
            sock, from,
            `╔══════════════════════════╗\n` +
            `║    🎵 S O N G F E S S   ║\n` +
            `╚══════════════════════════╝\n\n` +
            `📌 *Cara Pakai SongFess:*\n\n` +
            `${prefix}songfess judul lagu | pesan kamu\n\n` +
            `💡 *Contoh:*\n` +
            `${prefix}songfess Night Changes | bikin nangis 😭\n` +
            `${prefix}songfess Sempurna\n\n` +
            `🎵 Dikirim ke channel dalam ~5 menit.\n` +
            `🔒 Identitas dirahasiakan.`,
            '🎵 Kirim lagu favoritmu secara anonim',
            [
                { buttonId: `${prefix}songfess stats`, buttonText: { displayText: '📊 Stats' }, type: 1 }
            ]
        );
        return;
    }

    if (args[0] === 'stats') {
        const stats = getSongFessStats();
        await sock.sendMessage(from, {
            text: `🎵 *SONGFESS STATS*\n\n` +
                  `📊 Total: ${stats.total}\n` +
                  `⏳ Antrian: ${stats.pending}\n` +
                  `✅ Hari ini: ${stats.sentToday}\n` +
                  `🕐 Delay: ${stats.interval} menit`
        });
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

    if (songTitle.length > 100 || songMessage.length > 500) {
        await sock.sendMessage(from, { text: '❌ Judul max 100 karakter, pesan max 500 karakter.' });
        return;
    }

    const anonId = `#${from.split('@')[0].slice(-4)}`;

    const queueId = addSongFess({
        title: songTitle,
        message: songMessage,
        sender: pushName,
        anonId: anonId,
        timestamp: Date.now()
    });

    await sock.sendMessage(from, {
        text: `✅ *SongFess Terkirim!*\n\n` +
              `🎶 ${songTitle}\n` +
              (songMessage ? `💬 ${songMessage}\n` : '') +
              `🆔 ${queueId}\n` +
              `👤 ${anonId}\n\n` +
              `⏳ Akan dikirim ke channel ~5 menit.`
    });
}

async function cmdConfess(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sendWithButtons(
            sock, from,
            `╔══════════════════════════╗\n` +
            `║  💌 M E N F E S S      ║\n` +
            `║    CONFESS ANONIM       ║\n` +
            `╚══════════════════════════╝\n\n` +
            `📌 *Format:*\n` +
            `${prefix}menfess 628xxxx|pesan kamu\n\n` +
            `💡 *Contoh:*\n` +
            `${prefix}menfess 628123456789|hai kamu 😊\n\n` +
            `🔒 Identitas dirahasiakan.\n` +
            `⚠️ Max 5x/hari. No spam.`,
            '💌 Kirim pesan rahasiamu',
            [
                { buttonId: `${prefix}menfess stats`, buttonText: { displayText: '📊 Stats' }, type: 1 }
            ]
        );
        return;
    }

    if (args[0] === 'stats') {
        const queue = getConfessQueue();
        const sn = from.split('@')[0];
        const myCount = queue.filter(c => c.senderNumber === sn).length;
        
        await sock.sendMessage(from, {
            text: `💌 *MENFESS STATS*\n\n📊 Antrian: ${queue.length}\n✉️ Kamu: ${myCount}/5`
        });
        return;
    }

    const fullArgs = args.join(' ');
    const parts = fullArgs.split('|').map(p => p.trim());
    
    const targetNumber = parts[0]?.replace(/[^0-9]/g, '') || '';
    const confessMessage = parts.slice(1).join('|').trim();
    
    if (!targetNumber || targetNumber.length < 10) {
        await sock.sendMessage(from, { text: '❌ Nomor tidak valid! Format: 628xxxxxxxxxx' });
        return;
    }

    if (!confessMessage) {
        await sock.sendMessage(from, { text: '❌ Pesan tidak boleh kosong!' });
        return;
    }

    if (confessMessage.length > 1000) {
        await sock.sendMessage(from, { text: '❌ Pesan maksimal 1000 karakter!' });
        return;
    }

    const sn = from.split('@')[0];
    const queue = getConfessQueue();
    const myCount = queue.filter(c => c.senderNumber === sn).length;
    
    if (myCount >= 5) {
        await sock.sendMessage(from, { text: '❌ Limit harian tercapai (5x)!' });
        return;
    }

    if (targetNumber === sn || targetNumber === sn.replace(/^62/, '0')) {
        await sock.sendMessage(from, { text: '😅 Tidak bisa kirim ke diri sendiri!' });
        return;
    }

    const formattedTarget = targetNumber.startsWith('62') ? targetNumber : 
                           targetNumber.startsWith('0') ? '62' + targetNumber.slice(1) : 
                           '62' + targetNumber;
    
    const targetJid = formattedTarget + '@s.whatsapp.net';

    const confessId = addConfess({
        targetNumber: formattedTarget,
        targetJid: targetJid,
        message: confessMessage,
        senderName: pushName,
        senderNumber: sn,
        anonId: `#${sn.slice(-4)}`,
        timestamp: Date.now()
    });

    await sock.sendMessage(from, {
        text: `✅ *Menfess Terkirim!*\n\n` +
              `📱 Ke: ${formattedTarget.slice(0, 6)}xxxx\n` +
              `🆔 ${confessId}\n` +
              `👤 #${sn.slice(-4)}`
    });

    try {
        await sock.sendMessage(targetJid, {
            text: `💌 *KAMU DAPAT MENFESS!*\n\n` +
                  `_"${confessMessage}"_\n\n` +
                  `👤 Dari: Anonim #${sn.slice(-4)}\n` +
                  `🕐 ${new Date().toLocaleString('id-ID')}\n\n` +
                  `✨ Balas: ${prefix}menfess <nomor>|<pesan>`
        });
        removeConfess(confessId, true);
    } catch (err) {
        removeConfess(confessId, false);
        await sock.sendMessage(from, { text: '❌ Gagal kirim. Nomor mungkin tidak terdaftar.' });
    }
}

async function cmdSticker(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    const hasFfmpeg = await checkFfmpeg();
    if (!hasFfmpeg) {
        await sock.sendMessage(from, { text: '❌ FFmpeg tidak terinstall! Sticker maker butuh FFmpeg.' });
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
    
    if (!hasMedia && messageInfo.quotedMessage) {
        const quoted = messageInfo.quotedMessage;
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
        await sendWithButtons(
            sock, from,
            `🎨 *STICKER MAKER*\n\n` +
            `📌 Kirim/reply gambar atau video (max 15s)\n` +
            `lalu ketik ${prefix}s\n\n` +
            `🎨 Style: ${prefix}s full | circle | rounded\n` +
            `📏 Video: Max 15 detik\n📦 File: Max 10 MB`,
            '🎨 Sticker Maker v1.0',
            [
                { buttonId: `${prefix}s full`, buttonText: { displayText: '📱 Full' }, type: 1 },
                { buttonId: `${prefix}s circle`, buttonText: { displayText: '⭕ Circle' }, type: 1 }
            ]
        );
        return;
    }
    
    if (mediaType === 'video' && mediaDuration > STICKER_CONFIG.MAX_VIDEO_DURATION) {
        await sock.sendMessage(from, { 
            text: `❌ Video terlalu panjang!\n⏱️ ${formatDuration(mediaDuration)}\n📏 Max: ${STICKER_CONFIG.MAX_VIDEO_DURATION}s` 
        });
        return;
    }
    
    await sock.sendMessage(from, { text: '🔄 *Membuat sticker...*' });
    
    try {
        const result = await createSticker(sock, messageInfo, {
            type: stickerType,
            pack: packName,
            author: authorName
        });
        
        await sock.sendMessage(from, { sticker: result.sticker });
        
        setTimeout(async () => {
            await sock.sendMessage(from, {
                text: `✅ *Sticker Berhasil!*\n📸 ${result.type === 'animated' ? '🎬 Animasi' : '🖼️ Statis'}\n🎨 ${stickerType}`
            });
        }, 500);
        
    } catch (err) {
        await sock.sendMessage(from, { text: `❌ Gagal: ${err.message}` });
    }
}

async function cmdSearch(sock, from, args, prefix) {
    if (args.length === 0) {
        await sock.sendMessage(from, { 
            text: `🔍 *COMMAND SEARCH*\n\n` +
                  `Cari command berdasarkan kata kunci.\n\n` +
                  `${prefix}search <kata kunci>\n\n` +
                  `Contoh: ${prefix}search jadwal`
        });
        return;
    }

    const query = args.join(' ').toLowerCase();
    const suggestions = suggestCommand(query, 0.1, 10);
    
    if (suggestions.length === 0) {
        await sock.sendMessage(from, { 
            text: `🔍 "${query}" tidak ditemukan.\n\nKetik ${prefix}menu untuk semua command.` 
        });
        return;
    }

    let text = `🔍 *SEARCH: "${query}"*\n📊 Ditemukan: ${suggestions.length}\n\n`;

    suggestions.forEach(s => {
        text += `📝 *${prefix}${s.cmd}* (${Math.round(s.similarity * 100)}%)\n   📖 ${s.desc}\n   📂 ${s.category}\n\n`;
    });

    await sock.sendMessage(from, { text });
}

async function cmdAddPR(sock, from, args, pushName, messageInfo) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `📚 *TAMBAH PR/TUGAS*\n\n` +
                  `${prefix}addpr <mapel>|<deskripsi>|<deadline>\n\n` +
                  `Contoh:\n${prefix}addpr Matematika|Hal 100-101|2024-12-20\n` +
                  `${prefix}addpr IPA|Buat laporan|2024-12-25\n\n` +
                  `📎 Reply gambar/file untuk lampiran.\n📅 Deadline: YYYY-MM-DD`
        });
        return;
    }
    
    const parts = args.join(' ').split('|').map(p => p.trim());
    const subject = parts[0] || 'Umum';
    const description = parts[1] || '';
    const deadline = parts[2] || null;
    
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
        await sock.sendMessage(from, { text: '❌ Format deadline: YYYY-MM-DD' });
        return;
    }
    
    let media = null;
    const quoted = messageInfo.quotedMessage;
    if (quoted) {
        if (quoted.imageMessage) media = { type: 'image', filename: 'image.jpg' };
        else if (quoted.videoMessage) media = { type: 'video', filename: 'video.mp4' };
        else if (quoted.audioMessage) media = { type: 'audio', filename: 'audio.mp3' };
        else if (quoted.documentMessage) media = { type: 'document', filename: quoted.documentMessage.fileName || 'file' };
    }
    
    const pr = addPR({ subject, description, deadline, addedBy: pushName, media });
    const prDetail = formatPRDetail(pr);
    
    const targets = getAllTargets();
    for (const ch of targets.channels) {
        try { await sock.sendMessage(ch.id, { text: `📢 *PR BARU!*\n\n${prDetail}` }); } catch (e) {}
    }
    for (const gr of targets.groups) {
        try { await sock.sendMessage(gr.id, { text: `📢 *PR BARU!*\n\n${prDetail}` }); } catch (e) {}
    }
    
    await sock.sendMessage(from, { text: `✅ *PR Ditambahkan!*\n\n${prDetail}` });
}

async function cmdDeletePR(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, { text: `❌ ${prefix}delpr <id>\n🔍 Cari ID: ${prefix}pr` });
        return;
    }
    
    const pr = getPRById(args[0]);
    if (!pr) {
        await sock.sendMessage(from, { text: `❌ PR ${args[0]} tidak ditemukan.` });
        return;
    }
    
    deletePR(args[0]);
    await sock.sendMessage(from, { text: `✅ PR *${pr.subject}* (${pr.id}) dihapus!` });
}

async function cmdListPR(sock, from, args) {
    let filter = 'active';
    if (args.includes('all')) filter = 'all';
    if (args.includes('expired')) filter = 'expired';
    
    const prs = getPRs(filter);
    const result = formatPRList(prs);
    await sock.sendMessage(from, { text: result.text });
}

async function cmdAddPartner(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, { 
            text: `⭐ *TAMBAH PARTNER*\n\n${prefix}addpartner <nomor>|<nama>\n\nContoh:\n${prefix}addpartner 628123456789|Budi` 
        });
        return;
    }
    
    const parts = args.join(' ').split('|').map(p => p.trim());
    const number = parts[0]?.replace(/[^0-9]/g, '') || '';
    const name = parts[1] || '';
    
    if (number.length < 10) {
        await sock.sendMessage(from, { text: '❌ Nomor tidak valid!' });
        return;
    }
    
    const result = addPartner(number, name, pushName);
    
    if (result.success) {
        await sock.sendMessage(from, { 
            text: `✅ *Partner Ditambahkan!*\n\n👤 ${result.partner.name}\n📱 ${result.partner.number}` 
        });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdRemovePartner(sock, from, args, pushName) {
    if (args.length === 0) {
        await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delpartner <nomor>` });
        return;
    }
    
    const result = removePartner(args[0].replace(/[^0-9]/g, ''));
    
    if (result.success) {
        await sock.sendMessage(from, { text: `✅ Partner *${result.partner.name}* dihapus!` });
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
    
    let text = `⭐ *DAFTAR PARTNER*\n\n`;
    partners.forEach((p, i) => {
        text += `${i + 1}. 👤 ${p.name}\n   📱 ${p.number}\n   📅 ${new Date(p.addedAt).toLocaleDateString('id-ID')}\n\n`;
    });
    text += `Total: ${partners.length} partner`;
    
    await sock.sendMessage(from, { text });
}

async function cmdAddChannel(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, { 
            text: `📢 *TAMBAH CHANNEL*\n\n${prefix}addch <channel_id>|<nama>\n\nContoh: ${prefix}addch 120363xxx@newsletter|Channel Kelas` 
        });
        return;
    }
    
    const parts = args.join(' ').split('|').map(p => p.trim());
    const result = addChannel(parts[0] || '', parts[1] || '', pushName);
    
    if (result.success) {
        await sock.sendMessage(from, { text: `✅ Channel *${result.channel.name}* ditambahkan!` });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdRemoveChannel(sock, from, args, pushName) {
    if (args.length === 0) {
        await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delch <channel_id>` });
        return;
    }
    
    const result = removeChannel(args[0]);
    await sock.sendMessage(from, { text: result.success ? '✅ Channel dihapus!' : `❌ ${result.error}` });
}

async function cmdListChannels(sock, from) {
    const channels = getChannels();
    
    if (channels.length === 0) {
        await sock.sendMessage(from, { text: '📢 *Belum ada channel terdaftar.*' });
        return;
    }
    
    let text = `📢 *DAFTAR CHANNEL*\n\n`;
    channels.forEach((ch, i) => {
        text += `${i + 1}. 📢 ${ch.name}\n   🆔 \`${ch.id}\`\n\n`;
    });
    
    await sock.sendMessage(from, { text });
}

async function cmdAddGroupCmd(sock, from, args, pushName) {
    const prefix = global.botConfig.prefix;
    
    if (args.length === 0) {
        await sock.sendMessage(from, { 
            text: `👥 *TAMBAH GROUP*\n\n${prefix}addgroup <group_id>|<nama>\n\nContoh: ${prefix}addgroup 120363xxx@g.us|Grup Kelas` 
        });
        return;
    }
    
    const parts = args.join(' ').split('|').map(p => p.trim());
    const result = addGroup(parts[0] || '', parts[1] || '', pushName);
    
    if (result.success) {
        await sock.sendMessage(from, { text: `✅ Group *${result.group.name}* ditambahkan!` });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdRemoveGroupCmd(sock, from, args, pushName) {
    if (args.length === 0) {
        await sock.sendMessage(from, { text: `❌ ${global.botConfig.prefix}delgroup <group_id>` });
        return;
    }
    
    const result = removeGroup(args[0]);
    await sock.sendMessage(from, { text: result.success ? '✅ Group dihapus!' : `❌ ${result.error}` });
}

async function cmdListGroups(sock, from) {
    const groups = getGroups();
    
    if (groups.length === 0) {
        await sock.sendMessage(from, { text: '👥 *Belum ada group terdaftar.*' });
        return;
    }
    
    let text = `👥 *DAFTAR GROUP*\n\n`;
    groups.forEach((gr, i) => {
        text += `${i + 1}. 👥 ${gr.name}\n   🆔 \`${gr.id}\`\n\n`;
    });
    
    await sock.sendMessage(from, { text });
}

async function cmdBroadcast(sock, from, args, pushName, messageInfo) {
    if (args.length === 0) {
        await sock.sendMessage(from, { 
            text: `📢 *BROADCAST*\n\n${global.botConfig.prefix}bc <pesan>\n\nPesan akan dikirim ke semua channel & group terdaftar.` 
        });
        return;
    }
    
    const message = args.join(' ');
    const targets = getAllTargets();
    let sentCount = 0;
    let failCount = 0;
    
    for (const ch of targets.channels) {
        try { 
            await sock.sendMessage(ch.id, { text: `📢 *BROADCAST*\n\n${message}\n\n━━━━━━━━━━━━━━━━━━━━━━\n👑 ${global.botConfig.owner}` }); 
            sentCount++; 
        } catch (e) { failCount++; }
    }
    
    for (const gr of targets.groups) {
        try { 
            await sock.sendMessage(gr.id, { text: `📢 *BROADCAST*\n\n${message}\n\n━━━━━━━━━━━━━━━━━━━━━━\n👑 ${global.botConfig.owner}` }); 
            sentCount++; 
        } catch (e) { failCount++; }
    }
    
    await sock.sendMessage(from, { 
        text: `✅ *Broadcast Selesai!*\n\n📊 Terkirim: ${sentCount}\n❌ Gagal: ${failCount}` 
    });
}

async function cmdGetId(sock, from, messageInfo) {
    const prefix = global.botConfig.prefix;
    const msg = messageInfo.message;
    
    let taggedUsers = [];
    if (msg?.extendedTextMessage?.contextInfo?.mentionedJid) {
        taggedUsers = msg.extendedTextMessage.contextInfo.mentionedJid;
    }
    
    if (taggedUsers.length > 0) {
        let text = `👤 *TAGGED USERS*\n\n`;
        taggedUsers.forEach((userJid, i) => {
            const userId = userJid.split('@')[0];
            let no = userId.startsWith('62') ? '0' + userId.slice(2) : userId;
            text += `${i + 1}. No: ${no}\n   ID: ${userId}\n   JID: ${userJid}\n\n`;
        });
        text += `💡 Gunakan untuk kirim Menfess: ${prefix}menfess nomor|pesan`;
        await sock.sendMessage(from, { text, mentions: taggedUsers });
        return;
    }
    
    const chatType = messageInfo.isChannel ? 'channel' : messageInfo.isGroup ? 'group' : 'private';
    
    if (chatType === 'channel') {
        const id = from.split('@')[0];
        await sock.sendMessage(from, { 
            text: `📢 *CHANNEL ID*\n\nFull JID: \`${from}\`\nChannel ID: \`${id}\`\n\n📝 Konfigurasi:\nchannelId: "${from}"` 
        });
    } else if (chatType === 'group') {
        const id = from.split('@')[0];
        try {
            const meta = await sock.groupMetadata(from);
            await sock.sendMessage(from, { 
                text: `👥 *GROUP ID*\n\nNama: ${meta.subject}\nMember: ${meta.participants.length}\nFull JID: \`${from}\`\nGroup ID: \`${id}\`\n\n📝 Konfigurasi:\ngroupId: "${from}"` 
            });
        } catch (e) {
            await sock.sendMessage(from, { text: `👥 *GROUP ID*\n\nFull JID: \`${from}\`\nGroup ID: \`${id}\`` });
        }
    } else {
        const userId = from.split('@')[0];
        const no = userId.startsWith('62') ? '0' + userId.slice(2) : userId;
        await sock.sendMessage(from, { 
            text: `👤 *USER ID*\n\nNama: ${messageInfo.pushName}\nNo: ${no}\nFull JID: \`${from}\`\nUser ID: \`${userId}\`` 
        });
    }
}

async function cmdPing(sock, from) {
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;
    const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
    const uptime = process.uptime();
    const d = Math.floor(uptime / 86400);
    const h = Math.floor((uptime % 86400) / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    
    await sock.sendMessage(from, {
        text: `╔══════════════════════════╗\n` +
              `║     🏓 P I N G !       ║\n` +
              `╚══════════════════════════╝\n\n` +
              `🟢 *Online*\n` +
              `📊 ${responseTime}ms\n` +
              `💾 ${memMB} MB\n` +
              `⏱️ ${d}d ${h}h ${m}m ${s}s\n\n` +
              `🤖 ${global.botConfig.name} v${global.botConfig.version}`
    });
}

async function cmdMyLevel(sock, from, pushName, senderNumber) {
    const level = getUserLevel(senderNumber, pushName);
    const levelName = getLevelName(level);
    const permissions = getPermissionList(level);
    
    let text = `╔══════════════════════════╗\n` +
               `║  👤 LEVEL INFO         ║\n` +
               `╚══════════════════════════╝\n\n` +
               `👤 ${pushName}\n` +
               `⭐ ${levelName} (Level ${level})\n\n` +
               `📋 *Commands:*\n`;
    
    const cats = { 'Info': [], 'Jadwal': [], 'Reminder': [], 'Alight': [], 'SongFess': [], 'Menfess': [], 'Sticker': [], 'PR': [], 'Partner': [], 'Channel': [], 'Utility': [] };
    
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
        else if (['addch','delch','addgroup','delgroup','broadcast'].includes(p)) cats['Channel'].push(p);
        else cats['Utility'].push(p);
    });
    
    for (const [cat, cmds] of Object.entries(cats)) {
        if (cmds.length > 0) text += `📂 ${cat}: ${cmds.join(', ')}\n`;
    }
    
    text += `\n🛍️ Shop: /catalog | /help`;
    
    await sock.sendMessage(from, { text });
}

async function cmdShopCatalog(sock, from, args) {
    if (args.length > 0) {
        const category = getCategories().find(c => c.toLowerCase().includes(args.join(' ').toLowerCase()));
        if (category) {
            const products = getProductsByCategory(category);
            if (products.length > 0) {
                let text = `📂 *${category}*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                products.forEach(p => {
                    text += `🆔 \`${p.id}\`\n📌 ${p.name}\n💰 ${p.priceDisplay}\n⏱️ ${p.duration}\n\n`;
                });
                text += `💡 /detail <id> untuk info lengkap\n🛒 /buy <id> untuk order`;
                await sock.sendMessage(from, { text });
                return;
            }
        }
    }
    
    const text = formatCatalog();
    await sock.sendMessage(from, { text });
}

async function cmdShopDetail(sock, from, args) {
    if (args.length === 0) {
        await sock.sendMessage(from, { text: '❌ /detail <id_produk>\n\nContoh: /detail edit-foto\n\nKetik /catalog untuk lihat semua produk.' });
        return;
    }
    
    const product = getProductById(args[0]);
    if (!product) {
        await sock.sendMessage(from, { text: '❌ Produk tidak ditemukan.\n\nKetik /catalog untuk lihat semua produk.' });
        return;
    }
    
    const text = formatProductDetail(product);
    
    await sendWithButtons(
        sock, from, text,
        '🛍️ FestiveShopID',
        [
            { buttonId: `/buy ${product.id}`, buttonText: { displayText: '🛒 Order Sekarang' }, type: 1 },
            { buttonId: '/catalog', buttonText: { displayText: '📋 Katalog' }, type: 1 }
        ]
    );
}

async function cmdShopBuy(sock, from, args, pushName, senderNumber) {
    if (args.length === 0) {
        await sock.sendMessage(from, { 
            text: '❌ *Format:* /buy <id_produk> | <catatan>\n\nContoh:\n/buy edit-foto\n/buy edit-foto | Foto wisuda keluarga\n\nKetik /catalog untuk lihat produk.' 
        });
        return;
    }
    
    const fullArgs = args.join(' ');
    const parts = fullArgs.split('|').map(p => p.trim());
    const productId = parts[0] || '';
    const note = parts[1] || '';
    
    const product = getProductById(productId);
    if (!product) {
        await sock.sendMessage(from, { text: '❌ Produk tidak ditemukan.\n\nKetik /catalog untuk lihat semua produk.' });
        return;
    }
    
    const result = createOrder(productId, pushName, senderNumber, note);
    
    if (result.success) {
        const order = result.order;
        const text = `✅ *ORDER BERHASIL!*\n\n` +
                     formatOrderDetail(order) +
                     `\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                     `📱 *Hubungi Admin:*\n` +
                     `wa.me/${SHOP_CONFIG.OWNER_NUMBER.replace(/^0/, '62')}\n\n` +
                     `💡 Kirim ID Order *${order.id}* ke admin\n` +
                     `untuk konfirmasi dan pembayaran.\n\n` +
                     `🔍 Cek status: /myorder ${order.id}`;
        
        await sendWithButtons(
            sock, from, text,
            '🛍️ FestiveShopID',
            [
                { buttonId: '/catalog', buttonText: { displayText: '📋 Katalog' }, type: 1 },
                { buttonId: `/myorder ${order.id}`, buttonText: { displayText: '📦 Cek Status' }, type: 1 }
            ]
        );
        
        const ownerJid = SHOP_CONFIG.OWNER_NUMBER.replace(/^0/, '62') + '@s.whatsapp.net';
        try {
            await sock.sendMessage(ownerJid, {
                text: `📢 *ORDER BARU!*\n\n${formatOrderDetail(order)}\n\n👤 Customer: ${pushName}\n📱 ${senderNumber}`
            });
        } catch (e) {}
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdShopMyOrder(sock, from, args, senderNumber) {
    if (args.length > 0) {
        const orders = getOrders();
        const order = orders.find(o => o.id === args[0] && o.customerNumber === senderNumber);
        
        if (!order) {
            await sock.sendMessage(from, { text: '❌ Order tidak ditemukan.\n\nPastikan ID order benar dan itu adalah pesanan kamu.' });
            return;
        }
        
        await sock.sendMessage(from, { text: formatOrderDetail(order) });
        return;
    }
    
    const orders = getOrders().filter(o => o.customerNumber === senderNumber);
    const text = formatOrderList(orders, '📦 *PESANAN SAYA*');
    await sock.sendMessage(from, { text });
}

async function cmdShopComplete(sock, from, args, userLevel) {
    if (userLevel < 1) {
        await sock.sendMessage(from, { text: '🔒 Hanya partner & owner yang bisa menyelesaikan order.' });
        return;
    }
    
    if (args.length === 0) {
        await sock.sendMessage(from, { text: '❌ /complete <order_id>\n\nContoh: /complete ORD241201ABC' });
        return;
    }
    
    const result = updateOrderStatus(args[0], 'completed');
    if (result.success) {
        await sock.sendMessage(from, { text: `✅ Order *${args[0]}* selesai!` });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdShopCancel(sock, from, args, userLevel) {
    if (userLevel < 1) {
        await sock.sendMessage(from, { text: '🔒 Hanya partner & owner yang bisa membatalkan order.' });
        return;
    }
    
    if (args.length === 0) {
        await sock.sendMessage(from, { text: '❌ /cancel <order_id>\n\nContoh: /cancel ORD241201ABC' });
        return;
    }
    
    const result = updateOrderStatus(args[0], 'cancelled');
    if (result.success) {
        await sock.sendMessage(from, { text: `❌ Order *${args[0]}* dibatalkan.` });
    } else {
        await sock.sendMessage(from, { text: `❌ ${result.error}` });
    }
}

async function cmdShopOrders(sock, from, args, userLevel) {
    if (userLevel < 1) {
        await sock.sendMessage(from, { text: '🔒 Hanya partner & owner.' });
        return;
    }
    
    let filter = 'all';
    if (args.includes('pending')) filter = 'pending';
    else if (args.includes('completed')) filter = 'completed';
    else if (args.includes('cancelled')) filter = 'cancelled';
    
    const orders = getOrders(filter);
    const text = formatOrderList(orders, `📦 *${filter.toUpperCase()} ORDERS*`);
    
    if (orders.length === 0) {
        await sock.sendMessage(from, { text: `📦 *Tidak ada order ${filter}.*` });
        return;
    }
    
    await sock.sendMessage(from, { text });
}

async function cmdShopStats(sock, from) {
    const stats = getShopStats();
    const text = `╔══════════════════════════╗\n` +
                 `║  📊 SHOP STATISTIK     ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `📦 Total Order: ${stats.totalOrders}\n` +
                 `⏳ Pending: ${stats.pendingOrders}\n` +
                 `✅ Completed: ${stats.completedOrders}\n` +
                 `🕐 Last: ${stats.lastOrder ? new Date(stats.lastOrder).toLocaleString('id-ID') : '-'}`;
    
    await sock.sendMessage(from, { text });
}

async function cmdShopHelp(sock, from) {
    const text = `╔══════════════════════════╗\n` +
                 `║ 🛍️ FESTIVESHOP ID HELP ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `📋 *Commands:*\n\n` +
                 `/catalog - Lihat katalog produk\n` +
                 `/catalog <kategori> - Filter kategori\n` +
                 `/detail <id> - Detail produk\n` +
                 `/buy <id> | <catatan> - Order produk\n` +
                 `/myorder - Lihat pesanan saya\n` +
                 `/myorder <id> - Cek status order\n` +
                 `/stats - Statistik shop\n` +
                 `/help - Bantuan ini\n\n` +
                 `👑 *Owner/Partner:*\n` +
                 `/orders - Semua order\n` +
                 `/orders pending - Filter pending\n` +
                 `/complete <id> - Selesaikan\n` +
                 `/cancel <id> - Batalkan\n` +
                 `/shop on/off - Buka/tutup\n\n` +
                 `💡 *Cara Order:*\n` +
                 `1. /catalog (lihat produk)\n` +
                 `2. /buy id_produk | catatan\n` +
                 `3. Hubungi admin\n` +
                 `4. Admin proses order\n\n` +
                 `🛍️ *FestiveShopID*\n` +
                 `Your Trusted Digital Creative Partner`;
    
    await sock.sendMessage(from, { text });
}
