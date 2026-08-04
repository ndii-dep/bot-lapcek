// lib/confess.js
// Menfess/Confess System - Kirim pesan anonim ke personal chat

const fs = require('fs');
const path = require('path');

// Konfigurasi
const CONFIG = {
    DATA_FILE: './data/confess.json',
    MAX_DAILY_PER_USER: 5, // Maks 5x per hari per user
    MAX_QUEUE: 50
};

// Inisialisasi data
let confessData = {
    stats: {
        total: 0,
        sentToday: 0,
        pending: 0,
        lastReset: new Date().toDateString()
    },
    queue: [],
    history: [],
    userDailyCount: {} // { senderNumber: count }
};

// Load data dari file
function loadData() {
    try {
        if (fs.existsSync(CONFIG.DATA_FILE)) {
            const raw = fs.readFileSync(CONFIG.DATA_FILE, 'utf-8');
            confessData = JSON.parse(raw);
            
            // Reset counter harian
            const today = new Date().toDateString();
            if (confessData.stats.lastReset !== today) {
                confessData.stats.sentToday = 0;
                confessData.stats.lastReset = today;
                confessData.userDailyCount = {};
            }
        }
    } catch (err) {
        console.error('Error loading confess data:', err);
    }
}

// Simpan data ke file
function saveData() {
    try {
        const dir = path.dirname(CONFIG.DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(confessData, null, 2));
    } catch (err) {
        console.error('Error saving confess data:', err);
    }
}

// Generate ID unik
function generateId() {
    const date = new Date();
    const y = date.getFullYear().toString().slice(-2);
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CF${y}${m}${d}${h}${min}${rand}`;
}

// Cek apakah user sudah mencapai limit harian
function isUserAtLimit(senderNumber) {
    loadData();
    const count = confessData.userDailyCount[senderNumber] || 0;
    return count >= CONFIG.MAX_DAILY_PER_USER;
}

// Tambah confess ke antrian
function addConfess(data) {
    loadData();
    
    if (isUserAtLimit(data.senderNumber)) {
        return null;
    }
    
    const id = generateId();
    const confess = {
        id: id,
        ...data,
        status: 'pending',
        createdAt: new Date().toISOString(),
        sentAt: null
    };
    
    confessData.queue.push(confess);
    confessData.stats.total++;
    confessData.stats.pending = confessData.queue.length;
    
    // Update daily count
    confessData.userDailyCount[data.senderNumber] = 
        (confessData.userDailyCount[data.senderNumber] || 0) + 1;
    
    saveData();
    return id;
}

// Hapus confess dari antrian
function removeConfess(id, success = true) {
    loadData();
    
    const index = confessData.queue.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    const confess = confessData.queue[index];
    confess.status = success ? 'sent' : 'failed';
    confess.sentAt = new Date().toISOString();
    
    // Pindahkan ke history
    confessData.history.unshift(confess);
    
    // Hapus dari queue
    confessData.queue.splice(index, 1);
    
    // Update stats
    confessData.stats.pending = confessData.queue.length;
    if (success) {
        confessData.stats.sentToday++;
    }
    
    // Batasi history (maks 100)
    if (confessData.history.length > 100) {
        confessData.history = confessData.history.slice(0, 100);
    }
    
    saveData();
    return true;
}

// Get queue
function getConfessQueue() {
    loadData();
    return confessData.queue;
}

// Get stats
function getConfessStats(senderNumber = null) {
    loadData();
    
    const stats = {
        total: confessData.stats.total,
        pending: confessData.queue.length,
        sentToday: confessData.stats.sentToday
    };
    
    if (senderNumber) {
        stats.userDailyCount = confessData.userDailyCount[senderNumber] || 0;
        stats.userLimit = CONFIG.MAX_DAILY_PER_USER;
        stats.userRemaining = Math.max(0, CONFIG.MAX_DAILY_PER_USER - stats.userDailyCount);
    }
    
    return stats;
}

module.exports = {
    addConfess,
    removeConfess,
    getConfessQueue,
    getConfessStats,
    CONFIG
};
