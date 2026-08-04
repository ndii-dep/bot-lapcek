// case.js
// Command handler untuk bot

const schoolData = require('./lib/schoolData');
const reminderSystem = require('./lib/reminder');

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
            // INFO COMMANDS
            case 'info':
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
                              `Ketik *${prefix}info* untuk melihat daftar command.`
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

// .info
async function cmdInfo(sock, from) {
    const info = `╔══════════════════════════╗\n` +
                 `║  🤖 BOT INFORMATION  ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `📌 *${global.botConfig.name}*\n` +
                 `🔢 Version: ${global.botConfig.version}\n` +
                 `👤 Owner: ${global.botConfig.owner}\n` +
                 `📞 No. Owner: ${global.botConfig.noOwner}\n` +
                 `📱 No. Bot: ${global.botConfig.noBot}\n\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━\n` +
                 `📚 *DAFTAR COMMAND*\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `📋 *Info:*\n` +
                 `  ${global.botConfig.prefix}info - Info bot\n` +
                 `  ${global.botConfig.prefix}owner - Info owner\n` +
                 `  ${global.botConfig.prefix}walas - Info wali kelas\n\n` +
                 `📅 *Jadwal:*\n` +
                 `  ${global.botConfig.prefix}today - Jadwal hari ini\n` +
                 `  ${global.botConfig.prefix}tomorrow - Reminder besok\n` +
                 `  ${global.botConfig.prefix}mapel [hari] - Jadwal mapel\n` +
                 `  ${global.botConfig.prefix}piket [hari] - Jadwal piket\n` +
                 `  ${global.botConfig.prefix}jadwal - Semua jadwal\n\n` +
                 `⏰ *Reminder:*\n` +
                 `  ${global.botConfig.prefix}reminder - Info reminder\n` +
                 `  ${global.botConfig.prefix}sendreminder - Kirim manual (owner)\n\n` +
                 `🛠️ *Utility:*\n` +
                 `  ${global.botConfig.prefix}getid - Lihat ID chat\n` +
                 `  ${global.botConfig.prefix}ping - Cek status bot\n\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━\n` +
                 `⏰ Reminder otomatis:\n` +
                 `🌅 12:00 | ☀️ 16:00 | 🌙 20:00\n\n` +
                 `💡 Contoh: ${global.botConfig.prefix}mapel senin\n` +
                 `         ${global.botConfig.prefix}piket 1`;
    
    await sock.sendMessage(from, { text: info });
}

// .owner
async function cmdOwner(sock, from) {
    const text = `╔══════════════════════════╗\n` +
                 `║    👤 OWNER BOT    ║\n` +
                 `╚══════════════════════════╝\n\n` +
                 `📌 Nama: *${global.botConfig.owner}*\n` +
                 `📞 WhatsApp: *${global.botConfig.noOwner}*\n` +
                 `💬 Telegram: @ndiidepzX\n\n` +
                 `🔗 Link WA: https://wa.me/${global.botConfig.noOwner.replace('0', '62')}\n\n` +
                 `💡 Untuk pertanyaan atau request,\n` +
                 `silakan hubungi owner.`;
    
    await sock.sendMessage(from, { text });
}

// .walas
async function cmdWalas(sock, from) {
    const text = `╔══════════════════════════╗\n` +
                 `║  👩‍🏫 WALI KELAS 8C  ║\n` +
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

// .today
async function cmdToday(sock, from) {
    const data = schoolData.getTodayReminder();
    const text = schoolData.formatReminderText(data);
    await sock.sendMessage(from, { text });
}

// .tomorrow / .besok
async function cmdTomorrow(sock, from) {
    const data = schoolData.getTomorrowReminder();
    const text = schoolData.formatReminderText(data);
    await sock.sendMessage(from, { text });
}

// .mapel [hari]
async function cmdMapel(sock, from, args) {
    if (args.length === 0) {
        await sock.sendMessage(from, { 
            text: `❌ *Cara Penggunaan:*\n\n` +
                  `${global.botConfig.prefix}mapel <hari>\n\n` +
                  `📅 Contoh:\n` +
                  `  ${global.botConfig.prefix}mapel senin\n` +
                  `  ${global.botConfig.prefix}mapel 1\n` +
                  `  ${global.botConfig.prefix}mapel selasa\n` +
                  `  ${global.botConfig.prefix}mapel 2\n\n` +
                  `📌 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat`
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
    
    let text = `📅 *JADWAL MAPEL ${result.day.toUpperCase()}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    Object.entries(result.schedule).forEach(([key, lesson]) => {
        if (lesson.subject === 'ISTIRAHAT') {
            text += `🍽 *Istirahat*\n   ⏰ ${lesson.time}\n\n`;
        } else {
            text += `📚 *Jam ke-${key}*\n`;
            text += `   📖 ${lesson.subject}\n`;
            text += `   ⏰ ${lesson.time}\n`;
            text += `   👨‍🏫 ${lesson.teacher}\n\n`;
        }
    });
    
    await sock.sendMessage(from, { text });
}

// .piket [hari]
async function cmdPiket(sock, from, args) {
    if (args.length === 0) {
        await sock.sendMessage(from, { 
            text: `❌ *Cara Penggunaan:*\n\n` +
                  `${global.botConfig.prefix}piket <hari>\n\n` +
                  `📅 Contoh:\n` +
                  `  ${global.botConfig.prefix}piket senin\n` +
                  `  ${global.botConfig.prefix}piket 1\n` +
                  `  ${global.botConfig.prefix}piket jumat\n\n` +
                  `📌 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat`
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
    
    let text = `🧹 *JADWAL PIKET ${result.day.toUpperCase()}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `👥 *Anggota Piket Kelas & MBG:*\n\n`;
    
    result.members.forEach((name, i) => {
        text += `   ${i + 1}. ${name}\n`;
    });
    
    text += `\n📌 *Tugas Piket:*\n`;
    text += `   • Membersihkan ruang kelas\n`;
    text += `   • Menghapus papan tulis\n`;
    text += `   • Merapikan meja dan kursi\n`;
    text += `   • Membuang sampah\n`;
    text += `   • Menyapu dan mengepel lantai\n`;
    
    await sock.sendMessage(from, { text });
}

// .jadwal
async function cmdJadwal(sock, from) {
    let text = `📚 *JADWAL LENGKAP KELAS 8C*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Jadwal pelajaran
    text += `📅 *JADWAL PELAJARAN*\n`;
    text += `────────────────────────\n\n`;
    
    const fullSchedule = schoolData.getFullSchedule();
    for (const [day, lessons] of Object.entries(fullSchedule)) {
        text += `📆 *${day}*\n`;
        Object.values(lessons).forEach(lesson => {
            if (lesson.subject === 'ISTIRAHAT') {
                text += `   🍽 Istirahat (${lesson.time})\n`;
            } else {
                text += `   📖 ${lesson.subject} (${lesson.time})\n`;
            }
        });
        text += `\n`;
    }
    
    // Jadwal piket
    text += `🧹 *JADWAL PIKET*\n`;
    text += `────────────────────────\n\n`;
    
    const fullPiket = schoolData.getFullPiket();
    for (const [day, members] of Object.entries(fullPiket)) {
        text += `📆 *${day}:*\n`;
        members.forEach((name, i) => {
            text += `   ${i + 1}. ${name}\n`;
        });
        text += `\n`;
    }
    
    // Split jika terlalu panjang
    if (text.length > 4000) {
        const parts = text.match(/[\s\S]{1,4000}/g) || [text];
        for (const part of parts) {
            await sock.sendMessage(from, { text: part });
            await new Promise(r => setTimeout(r, 500));
        }
    } else {
        await sock.sendMessage(from, { text });
    }
}

// .sendreminder / .kirimreminder
async function cmdSendReminder(sock, from, pushName) {
    // Cek apakah owner
    const ownerNumber = global.botConfig.noOwner.replace(/^0/, '62');
    const senderNumber = from.split('@')[0];
    
    if (pushName !== global.botConfig.owner && 
        senderNumber !== ownerNumber &&
        !senderNumber.includes(ownerNumber)) {
        await sock.sendMessage(from, { 
            text: '❌ *Akses Ditolak*\n\nHanya owner yang bisa mengirim reminder manual.' 
        });
        return;
    }
    
    await sock.sendMessage(from, { text: '🔄 *Mengirim reminder...*\n\nMohon tunggu sebentar...' });
    
    await reminderSystem.sendManualReminder();
    
    await sock.sendMessage(from, { 
        text: '✅ *Reminder berhasil dikirim!*\n\n' +
              '📢 Terkirim ke:\n' +
              '   • Channel WhatsApp\n' +
              '   • Grup WhatsApp\n\n' +
              `⏰ Waktu: ${new Date().toLocaleTimeString('id-ID')}`
    });
}

// .reminder
async function cmdReminderMenu(sock, from) {
    const text = `⏰ *SISTEM REMINDER OTOMATIS*\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `📋 *Status:* AKTIF\n\n` +
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
                 `   ${global.botConfig.prefix}tomorrow - Lihat reminder\n` +
                 `   ${global.botConfig.prefix}sendreminder - Kirim manual`;
    
    await sock.sendMessage(from, { text });
}

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