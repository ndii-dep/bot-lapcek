// lib/schoolData.js
// Data jadwal, piket, dan reminder harian

// ============================================
// JADWAL PELAJARAN
// ============================================
const schedule = {
    senin: {
        1: { subject: 'PJOK', time: '07.00 - 07.40', teacher: 'Pak Rudi' },
        2: { subject: 'PJOK', time: '07.40 - 08.20', teacher: 'Pak Rudi' },
        3: { subject: 'PJOK', time: '08.20 - 09.00', teacher: 'Pak Rudi' },
        4: { subject: 'ISTIRAHAT', time: '09.00 - 09.30', teacher: '-' },
        5: { subject: 'MTK', time: '09.30 - 10.10', teacher: 'Bu Anita' },
        6: { subject: 'MTK', time: '10.10 - 10.50', teacher: 'Bu Anita' },
        7: { subject: 'ISTIRAHAT', time: '10.50 - 11.10', teacher: '-' },
        8: { subject: 'TIK', time: '11.10 - 11.50', teacher: 'Pak Eko' },
        9: { subject: 'TIK', time: '11.50 - 12.30', teacher: 'Pak Eko' },
        10: { subject: 'TIK', time: '12.30 - 13.10', teacher: 'Pak Eko' },
    },
    selasa: {
        1: { subject: 'Bahasa Inggris', time: '07.00 - 07.40', teacher: 'Mr. John' },
        2: { subject: 'Bahasa Inggris', time: '07.40 - 08.20', teacher: 'Mr. John' },
        3: { subject: 'ISTIRAHAT', time: '08.20 - 08.50', teacher: '-' },
        4: { subject: 'IPS', time: '08.50 - 09.30', teacher: 'Pak Dodi' },
        5: { subject: 'IPS', time: '09.30 - 10.10', teacher: 'Pak Dodi' },
        6: { subject: 'ISTIRAHAT', time: '10.10 - 10.30', teacher: '-' },
        7: { subject: 'IPA', time: '10.30 - 11.10', teacher: 'Pak Ahmad' },
        8: { subject: 'IPA', time: '11.10 - 11.50', teacher: 'Pak Ahmad' },
        9: { subject: 'Agama', time: '11.50 - 12.30', teacher: 'Pak Ustad' },
        10: { subject: 'Agama', time: '12.30 - 13.10', teacher: 'Pak Ustad' },
        11: { subject: 'Agama', time: '13.10 - 13.50', teacher: 'Pak Ustad' },
    },
    rabu: {
        1: { subject: 'IPA', time: '07.00 - 07.40', teacher: 'Pak Ahmad' },
        2: { subject: 'IPA', time: '07.40 - 08.20', teacher: 'Pak Ahmad' },
        3: { subject: 'IPA', time: '08.20 - 09.00', teacher: 'Pak Ahmad' },
        4: { subject: 'ISTIRAHAT', time: '09.00 - 09.30', teacher: '-' },
        5: { subject: 'Seni Budaya', time: '09.30 - 10.10', teacher: 'Bu Maya' },
        6: { subject: 'Seni Budaya', time: '10.10 - 10.50', teacher: 'Bu Maya' },
        7: { subject: 'ISTIRAHAT', time: '10.50 - 11.10', teacher: '-' },
        8: { subject: 'BK', time: '11.10 - 11.50', teacher: 'Bu Wati' },
        9: { subject: 'IPS', time: '11.50 - 12.30', teacher: 'Pak Dodi' },
        10: { subject: 'IPS', time: '12.30 - 13.10', teacher: 'Pak Dodi' },
        11: { subject: 'IPS', time: '13.10 - 13.50', teacher: 'Pak Dodi' },
    },
    kamis: {
        1: { subject: 'Bahasa Indonesia', time: '07.00 - 07.40', teacher: 'Bu Sari' },
        2: { subject: 'Bahasa Indonesia', time: '07.40 - 08.20', teacher: 'Bu Sari' },
        3: { subject: 'ISTIRAHAT', time: '08.20 - 08.50', teacher: '-' },
        4: { subject: 'PPKn', time: '08.50 - 09.30', teacher: 'Pak Hadi' },
        5: { subject: 'PPKn', time: '09.30 - 10.10', teacher: 'Pak Hadi' },
        6: { subject: 'ISTIRAHAT', time: '10.10 - 10.30', teacher: '-' },
        // Lanjutan sesuaikan
    },
    jumat: {
        1: { subject: 'Matematika', time: '07.00 - 07.40', teacher: 'Bu Anita' },
        2: { subject: 'Matematika', time: '07.40 - 08.20', teacher: 'Bu Anita' },
        3: { subject: 'ISTIRAHAT', time: '08.20 - 08.50', teacher: '-' },
        // Lanjutan sesuaikan
    },
};

// ============================================
// JADWAL PIKET (Senin-Jumat)
// ============================================
const piketSchedule = {
    senin: ['Putra', 'Qorry', 'Nur', 'Ahmad', 'Rahmat', 'Ifuazan'],
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
            'Tidak ada PR',
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
            '📝 Bahasa Inggris halaman 41 bagian B',
            '📖 Baca halaman 39-40 sebelum mengerjakan',
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
            '🎨 Membuat poster teks laporan observasi di Canva',
            '👥 Mempersiapkan kelompok untuk presentasi (bagi yang belum)',
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
            '📝 Agama ada PR (cek halaman sendiri)',
            '🔬 IPA ada PR yang kemarin',
        ],
        notes: '',
    },
    jumat: {
        items: [
            '🧴 Tumbler',
            '🕌 Membawa perlengkapan sholat',
            '📗 Buku paket IPA sudah disampul',
            '📋 Rekapan IPA (bagi yang belum)',
        ],
        pr: [
            '📝 Melanjutkan PR IPS',
            '📋 Rekapan IPA bagi yang belum',
            '🎨 PR Seni Budaya',
            '🎵 Menghafal Suwe Ora Jamu dan memenuhi kriteria',
            '🔬 PR IPA (makanan A & B) yang belum lanjutin',
            '📱 BAWA HANDPHONE! Sudah dicas, ada paketannya!',
        ],
        notes: '⚠️ PENTING: Bawa handphone untuk hari Jumat!',
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