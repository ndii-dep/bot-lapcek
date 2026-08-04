// lib/schoolData.js
// Data jadwal, piket, dan reminder harian

// ============================================
// JADWAL PELAJARAN
// ============================================
const schedule = {
    senin: {
        1: { subject: 'PJOK', time: '07.00 - 07.40', teacher: 'Pak Agung' },
        2: { subject: 'PJOK', time: '07.40 - 08.20', teacher: 'Pak Agung' },
        3: { subject: 'PJOK', time: '08.20 - 09.00', teacher: 'Pak Agung' },
        4: { subject: 'ISTIRAHAT', time: '09.00 - 09.30', teacher: '-' },
        5: { subject: 'MTK', time: '09.30 - 10.10', teacher: 'Pak Sapto' },
        6: { subject: 'MTK', time: '10.10 - 10.50', teacher: 'Pak Sapto' },
        7: { subject: 'TIK', time: '10.50 - 11.30', teacher: '-' },
        8: { subject: 'TIK', time: '11.30 - 12.10', teacher: 'Pak Arif' },
        9: { subject: 'TIK', time: '12.10 - 12.50', teacher: 'Pak Arif' },
        10: { subject: 'TIK', time: '12.50 - 13.15', teacher: 'Pak Arif' },
    },
    selasa: {
        1: { subject: 'Bahasa Inggris', time: '07.00 - 07.35', teacher: 'Mrs. Dyandra' },
        2: { subject: 'Bahasa Inggris', time: '07.35 - 08.10', teacher: 'Mrs. Dyandra' },
        3: { subject: 'IPS', time: '08.10 - 08.45', teacher: 'Bu Rozanah' },
        4: { subject: 'ISTIRAHAT', time: '08.45 - 09.15', teacher: '-' },
        5: { subject: 'IPS', time: '09.15 - 09.50', teacher: 'Bu Rozanah' },
        6: { subject: 'IPA', time: '09.50 - 10.25', teacher: 'Bu Rolla' },
        7: { subject: 'IPA', time: '10.25 - 11.00', teacher: 'Bu Rolla' },
        8: { subject: 'Agama', time: '11.00 - 11.30', teacher: 'Bu Syairoh' },
        9: { subject: 'ISTIRAHAT', time: '11.35 - 12.10', teacher: '-' },
        10: { subject: 'Agama', time: '12.10 - 12.45', teacher: 'Bu Syairoh' },
        11: { subject: 'Agama', time: '12.45 - 13.15', teacher: 'Bu Syairoh' },
    },
    rabu: {
        1: { subject: 'IPA', time: '07.00 - 07.35', teacher: 'Bu Rolla' },
        2: { subject: 'IPA', time: '07.35 - 08.10', teacher: 'Bu Rolla' },
        3: { subject: 'IPA', time: '08.10 - 08.45', teacher: 'Bu Rolla' },
        4: { subject: 'ISTIRAHAT', time: '08.45 - 09.15', teacher: '-' },
        5: { subject: 'Seni Budaya | MUSIK', time: '09.15 - 09.50', teacher: 'Pak Samuel' },
        6: { subject: 'Seni Budaya | MUSIK', time: '09.45 - 10.25', teacher: 'Pak Samuel' },
        7: { subject: 'Seni Budaya | MUSIK', time: '10.25 - 11.00', teacher: 'Pak Samuel' },
        8: { subject: 'BK', time: '11.00 - 11.35', teacher: 'Bu Mustika' },
        9: { subject: 'ISTIRAHAT', time: '11.35 - 12.10', teacher: '-' },
        10: { subject: 'IPS', time: '12.10 - 12.50', teacher: 'Bu Rozanah' },
        11: { subject: 'IPS', time: '12.50 - 13.15', teacher: 'Bu Rozanah' },
    },
    kamis: {
        1: { subject: 'Bahasa Inggris', time: '07.20 - 08.00', teacher: 'Mrs. Dyandra' },
        2: { subject: 'Bahasa Inggris', time: '08.00 - 08.35', teacher: 'Mrs. Dyandra' },
        3: { subject: 'Bahasa Indonesia', time: '08.35 - 09.10', teacher: 'Pak Sawrwanto' },
        4: { subject: 'ISTIRAHAT', time: '09.10 - 09.40', teacher: '-' },
        5: { subject: 'Bahasa Indonesia', time: '09.30 - 10.15', teacher: 'Bu Een' },
        6: { subject: 'Bahasa Indonesia', time: '10.15 - 10.50', teacher: '-' },
        7: { subject: 'Matematika', time: '10.50 - 11.30', teacher: 'Pak Sapto' },
        8: { subject: 'ISTIRAHAT', time: '11.30 - 12.10', teacher: '-' },
        9: { subject: 'Matematika', time: '12.10 - 12.45', teacher: 'Pak Sapto' },
        10: { subject: 'Matematika', time: '12.45 - 13.15', teacher: 'Pak Sapto' },
    },
    jumat: {
        1: { subject: 'Bahasa Indonesia', time: '07.00 - 07.40', teacher: 'Pak Sarwanto' },
        2: { subject: 'Bahasa Indonesia', time: '07.40 - 08.20', teacher: 'Pak Sarwanto' },
        3: { subject: 'Bahasa Indonesia', time: '08.20 - 09.00', teacher: 'Pak Sarwanto' },
        4: { subject: 'ISTIRAHAT', time: '09.00 - 09.30', teacher: '-' },
        5: { subject: 'PKN', time: '09.30 - 10.10', teacher: 'Bu Een' },
        6: { subject: 'PKN', time: '10.10 - 10.50', teacher: 'Bu Een' },
        7: { subject: 'PKN', time: '10.50 - 11.30', teacher: 'Bu Een' },
    },
};

// ============================================
// JADWAL PIKET (Senin-Jumat)
// ============================================
const piketSchedule = {
    senin: ['Putra', 'Qorry', 'Nur', 'Achmad', 'Rahmat', 'Ifuazan'],
    selasa: ['Muzaki', 'Rayyaa', 'Andi', 'Aimee', 'Syahmi', 'Mozza', 'Asyraf'],
    rabu: ['Rivanno', 'Anum', 'Raffa', 'Mario', 'Zaskia', 'Kafkah', 'Nazwa'],
    kamis: ['Rifqi', 'Fakhri', 'Saifi', 'Azkia', 'Rayzan', 'Humairo', 'Rivanni'],
    jumat: ['Wahyu', 'Umar', 'Silvi', 'Ashra', 'Messi', 'Wina', 'Fahri'],
};

// ============================================
// REMINDER HARIAN (dari data chat)
// ============================================
const dailyReminders = {
    senin: {
        items: [
            '🧴 Tumbler',
            '🕌 Membawa perlengkapan sholat',
            '👕 Membawa baju olahraga',
        ],
        pr: [
        ],
        notes: '',
    },
    selasa: {
        items: [
            '🧴 Tumbler',
            '🕌 Membawa perlengkapan sholat',
            '📗 Buku paket IPA sudah disampul',
        ],
        pr: [
        ],
        notes: '',
    },
    rabu: {
        items: [
            '🧴 Tumbler',
            '🕌 Membawa perlengkapan sholat',
            '📗 Buku paket IPA sudah disampul',
        ],
        pr: [
        ],
        notes: '',
    },
    kamis: {
        items: [
            '🧴 Tumbler',
            '🕌 Membawa perlengkapan sholat',
            '📗 Buku paket IPA sudah disampul',
            '📋 Rekapan IPA (bagi yang belum)',
        ],
        pr: [
        ],
        notes: '',
    },
    jumat: {
        items: [
            '🧴 Tumbler',
            '🕌 Membawa perlengkapan sholat',
            '📗 Buku paket IPA sudah disampul',
        ],
        pr: [
            '🎵 Menghafal Suwe Ora Jamu dan memenuhi kriteria',
            '📱 BAWA HANDPHONE! Sudah dicas, ada paketannya!',
        ],
        notes: '⚠️ PENTING: Bawa handphone untuk hari Kamis!',
    },
};

// ============================================
// DAY NAME MAPPINGS
// ============================================
const dayNames = {
    1: 'senin',
    2: 'selasa',
    3: 'rabu',
    4: 'kamis',
    5: 'jumat',
};

const dayNamesIndonesian = {
    'senin': 'Senin',
    'selasa': 'Selasa',
    'rabu': 'Rabu',
    'kamis': 'Kamis',
    'jumat': 'Jumat',
    'sabtu': 'Sabtu',
    'minggu': 'Minggu',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get day index from day name
function getDayKey(day) {
    const dayLower = day.toLowerCase();
    if (dayLower === '1' || dayLower === 'senin') return 'senin';
    if (dayLower === '2' || dayLower === 'selasa') return 'selasa';
    if (dayLower === '3' || dayLower === 'rabu') return 'rabu';
    if (dayLower === '4' || dayLower === 'kamis') return 'kamis';
    if (dayLower === '5' || dayLower === 'jumat') return 'jumat';
    return null;
}

// Get tomorrow's date info
function getTomorrowInfo() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayIndex = tomorrow.getDay(); // 0=Minggu, 1=Senin...6=Sabtu
    const dateStr = tomorrow.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    
    return { dayIndex, dateStr, date: tomorrow };
}

// Get today's date info
function getTodayInfo() {
    const today = new Date();
    const dayIndex = today.getDay();
    const dateStr = today.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    
    return { dayIndex, dateStr, date: today };
}

// ============================================
// MAIN FUNCTIONS
// ============================================

function getTomorrowReminder() {
    const { dayIndex, dateStr } = getTomorrowInfo();
    
    // Weekend check
    if (dayIndex === 0 || dayIndex === 6) {
        return { 
            isHoliday: true, 
            message: `📅 Besok (${dateStr}) adalah hari ${dayIndex === 0 ? 'Minggu' : 'Sabtu'}.\n\n✨ Selamat beristirahat! Tidak ada jadwal pelajaran.` 
        };
    }
    
    const dayKey = dayNames[dayIndex];
    const dayIndo = dayNamesIndonesian[dayKey];
    const reminder = dailyReminders[dayKey] || { items: [], pr: [], notes: '' };
    const scheduleData = schedule[dayKey] || {};
    const piketData = piketSchedule[dayKey] || [];
    
    return {
        isHoliday: false,
        day: dayIndo,
        dayKey: dayKey,
        date: dateStr,
        items: reminder.items,
        pr: reminder.pr,
        notes: reminder.notes,
        schedule: scheduleData,
        piket: piketData,
    };
}

function getTodayReminder() {
    const { dayIndex, dateStr } = getTodayInfo();
    
    if (dayIndex === 0 || dayIndex === 6) {
        return { 
            isHoliday: true, 
            message: `📅 Hari ini (${dateStr}) adalah hari ${dayIndex === 0 ? 'Minggu' : 'Sabtu'}.\n\n✨ Selamat beristirahat!` 
        };
    }
    
    const dayKey = dayNames[dayIndex];
    const dayIndo = dayNamesIndonesian[dayKey];
    const reminder = dailyReminders[dayKey] || { items: [], pr: [], notes: '' };
    const scheduleData = schedule[dayKey] || {};
    const piketData = piketSchedule[dayKey] || [];
    
    return {
        isHoliday: false,
        day: dayIndo,
        dayKey: dayKey,
        date: dateStr,
        items: reminder.items,
        pr: reminder.pr,
        notes: reminder.notes,
        schedule: scheduleData,
        piket: piketData,
    };
}

function getScheduleByDay(day) {
    const dayKey = getDayKey(day);
    if (!dayKey) return null;
    
    const scheduleData = schedule[dayKey];
    if (!scheduleData) return null;
    
    return {
        day: dayNamesIndonesian[dayKey],
        schedule: scheduleData,
    };
}

function getPiketByDay(day) {
    const dayKey = getDayKey(day);
    if (!dayKey) return null;
    
    const piketData = piketSchedule[dayKey];
    if (!piketData) return null;
    
    return {
        day: dayNamesIndonesian[dayKey],
        members: piketData,
    };
}

function getFullSchedule() {
    const result = {};
    for (const [key, dayIndo] of Object.entries(dayNamesIndonesian)) {
        if (schedule[key]) {
            result[dayIndo] = schedule[key];
        }
    }
    return result;
}

function getFullPiket() {
    const result = {};
    for (const [key, members] of Object.entries(piketSchedule)) {
        const dayIndo = dayNamesIndonesian[key];
        if (dayIndo) {
            result[dayIndo] = members;
        }
    }
    return result;
}

// ============================================
// FORMAT REMINDER TEXT
// ============================================
function formatReminderText(data) {
    if (data.isHoliday) {
        return data.message;
    }
    
    let text = '';
    text += `╔══════════════════════════╗\n`;
    text += `║  📍 REMINDER BESOK 📍  ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    text += `📅 *${data.day}, ${data.date}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Items yang harus dibawa
    if (data.items && data.items.length > 0) {
        text += `🎒 *YANG HARUS DIBAWA:*\n`;
        data.items.forEach((item, i) => {
            text += `   ${i + 1}. ${item}\n`;
        });
        text += `\n`;
    }
    
    // Mata pelajaran
    if (data.schedule && Object.keys(data.schedule).length > 0) {
        text += `🗒️ *MATA PELAJARAN:*\n`;
        const seenSubjects = new Set();
        Object.values(data.schedule).forEach(lesson => {
            if (lesson.subject !== 'ISTIRAHAT' && !seenSubjects.has(lesson.subject)) {
                seenSubjects.add(lesson.subject);
                text += `   📖 ${lesson.subject}\n`;
            }
        });
        text += `\n`;
    }
    
    // PR dan Tugas
    if (data.pr && data.pr.length > 0) {
        text += `📑 *PR & TUGAS:*\n`;
        data.pr.forEach((pr, i) => {
            text += `   ${i + 1}. ${pr}\n`;
        });
        text += `\n`;
    }
    
    // Piket
    if (data.piket && data.piket.length > 0) {
        text += `🧹 *PIKET KELAS & MBG:*\n`;
        data.piket.forEach((name, i) => {
            text += `   ${i + 1}. ${name}\n`;
        });
        text += `\n`;
    }
    
    // Catatan
    if (data.notes) {
        text += `⚠️ *CATATAN:*\n${data.notes}\n\n`;
    }
    
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⏰ Reminder otomatis dikirim 3x\n`;
    text += `   (Siang • Sore • Malam)\n`;
    text += `🤖 ${global.botConfig.name} v${global.botConfig.version}\n`;
    
    return text;
}

// Format jadwal singkat
function formatShortSchedule(data) {
    if (data.isHoliday) {
        return data.message;
    }
    
    let text = '';
    text += `📅 *JADWAL ${data.day.toUpperCase()}*\n`;
    text += `📆 ${data.date}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (data.schedule && Object.keys(data.schedule).length > 0) {
        Object.entries(data.schedule).forEach(([key, lesson]) => {
            if (lesson.subject === 'ISTIRAHAT') {
                text += `🍽 *Istirahat* (${lesson.time})\n`;
            } else {
                text += `📖 ${lesson.subject}\n`;
                text += `   ⏰ ${lesson.time} | 👨‍🏫 ${lesson.teacher}\n`;
            }
        });
    }
    
    return text;
}

// ============================================
// EXPORT
// ============================================
module.exports = {
    schedule,
    piketSchedule,
    dailyReminders,
    dayNames,
    dayNamesIndonesian,
    getTomorrowReminder,
    getTodayReminder,
    getScheduleByDay,
    getPiketByDay,
    getFullSchedule,
    getFullPiket,
    formatReminderText,
    formatShortSchedule,
    getDayKey,
};
