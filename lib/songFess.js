// lib/songFess.js
// SongFess System - Kirim lagu + pesan ke channel

const fs = require('fs');
const path = require('path');

// Konfigurasi
const CONFIG = {
    DATA_FILE: './data/songfess.json',
    INTERVAL_MINUTES: 5, // Delay kirim per songfess (menit)
    MAX_QUEUE: 20, // Maksimal antrian
    CHANNEL_ID: global.botConfig?.channelId || '120363xxxxx@newsletter'
};

// Inisialisasi data
let songFessData = {
    stats: {
        total: 0,
        sentToday: 0,
        pending: 0,
        lastReset: new Date().toDateString()
    },
    queue: [],
    history: []
};

// Load data dari file
function loadData() {
    try {
        if (fs.existsSync(CONFIG.DATA_FILE)) {
            const raw = fs.readFileSync(CONFIG.DATA_FILE, 'utf-8');
            songFessData = JSON.parse(raw);
            
            // Reset counter harian
            const today = new Date().toDateString();
            if (songFessData.stats.lastReset !== today) {
                songFessData.stats.sentToday = 0;
                songFessData.stats.lastReset = today;
            }
        }
    } catch (err) {
        console.error('Error loading songfess data:', err);
    }
}

// Simpan data ke file
function saveData() {
    try {
        const dir = path.dirname(CONFIG.DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(songFessData, null, 2));
    } catch (err) {
        console.error('Error saving songfess data:', err);
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
    const s = date.getSeconds().toString().padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `SF${y}${m}${d}${h}${min}${s}${rand}`;
}

// Tambah songfess ke antrian
function addSongFess(data) {
    loadData();
    
    const id = generateId();
    const songFess = {
        id: id,
        ...data,
        status: 'pending',
        createdAt: new Date().toISOString(),
        sentAt: null
    };
    
    songFessData.queue.push(songFess);
    songFessData.stats.total++;
    songFessData.stats.pending = songFessData.queue.length;
    
    saveData();
    return id;
}

// Ambil songfess berikutnya dari antrian
function getNextSongFess() {
    loadData();
    if (songFessData.queue.length === 0) return null;
    return songFessData.queue[0];
}

// Hapus songfess dari antrian (setelah terkirim)
function removeSongFess(id, success = true) {
    loadData();
    
    const index = songFessData.queue.findIndex(sf => sf.id === id);
    if (index === -1) return false;
    
    const sf = songFessData.queue[index];
    sf.status = success ? 'sent' : 'failed';
    sf.sentAt = new Date().toISOString();
    
    // Pindahkan ke history
    songFessData.history.unshift(sf);
    
    // Hapus dari queue
    songFessData.queue.splice(index, 1);
    
    // Update stats
    songFessData.stats.pending = songFessData.queue.length;
    if (success) {
        songFessData.stats.sentToday++;
    }
    
    // Batasi history (maks 100)
    if (songFessData.history.length > 100) {
        songFessData.history = songFessData.history.slice(0, 100);
    }
    
    saveData();
    return true;
}

// Format tampilan songfess untuk channel
function formatSongFess(sf) {
    let text = `╔══════════════════════════╗\n`;
    text += `║    🎵 S O N G F E S S   ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    text += `🎶 *${sf.title}*\n`;
    
    if (sf.message) {
        text += `\n💬 *Pesan:*\n`;
        text += `_"${sf.message}"_\n`;
    }
    
    text += `\n─────────────────────────\n`;
    text += `👤 *Dari:* ${sf.anonId}\n`;
    text += `🕐 *${new Date(sf.timestamp).toLocaleString('id-ID')}*\n`;
    text += `🆔 *ID:* ${sf.id}\n\n`;
    text += `🎵 Ingin kirim SongFess juga?\n`;
    text += `Ketik: ${global.botConfig?.prefix || '.'}songfess judul|pesan\n\n`;
    text += `#SongFess #MusicRecommendation`;
    
    return text;
}

// Get stats
function getSongFessStats() {
    loadData();
    return {
        total: songFessData.stats.total,
        pending: songFessData.queue.length,
        sentToday: songFessData.stats.sentToday,
        interval: CONFIG.INTERVAL_MINUTES
    };
}

// Get all songfess (history)
function getAllSongFess(limit = 10) {
    loadData();
    const all = [...songFessData.queue, ...songFessData.history];
    return all.slice(0, limit);
}

module.exports = {
    addSongFess,
    getNextSongFess,
    removeSongFess,
    formatSongFess,
    getSongFessStats,
    getAllSongFess,
    CONFIG
};
