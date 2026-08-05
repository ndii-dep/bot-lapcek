// lib/prTracker.js
// PR/Tugas Tracker - Auto-expire & Multi-media Support

const fs = require('fs');
const path = require('path');

const CONFIG = {
    DATA_FILE: './data/pr.json',
    MAX_PR: 50, // Maksimal PR yang tersimpan
    AUTO_CLEAN_INTERVAL: 60 * 60 * 1000 // 1 jam
};

// Inisialisasi data
let prData = {
    tasks: [],
    stats: {
        total: 0,
        active: 0,
        expired: 0,
        lastClean: new Date().toISOString()
    }
};

// Load data
function loadData() {
    try {
        if (fs.existsSync(CONFIG.DATA_FILE)) {
            const raw = fs.readFileSync(CONFIG.DATA_FILE, 'utf-8');
            prData = JSON.parse(raw);
            cleanExpiredTasks();
        }
    } catch (err) {
        console.error('Error loading PR data:', err);
    }
}

// Save data
function saveData() {
    try {
        const dir = path.dirname(CONFIG.DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(prData, null, 2));
    } catch (err) {
        console.error('Error saving PR data:', err);
    }
}

// Generate ID
function generateId() {
    const date = new Date();
    const y = date.getFullYear().toString().slice(-2);
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PR${y}${m}${d}${rand}`;
}

/**
 * Tambah PR baru
 * @param {Object} pr - Data PR
 * @param {string} pr.subject - Mata pelajaran
 * @param {string} pr.description - Deskripsi tugas
 * @param {string} pr.deadline - Deadline (YYYY-MM-DD)
 * @param {string} pr.addedBy - Yang menambahkan
 * @param {Object} pr.media - Media tambahan (opsional)
 * @returns {Object} - PR yang ditambahkan
 */
function addPR(pr) {
    loadData();
    
    const task = {
        id: generateId(),
        subject: pr.subject || 'Umum',
        description: pr.description || '',
        deadline: pr.deadline || null,
        deadlineDate: pr.deadline ? new Date(pr.deadline) : null,
        addedBy: pr.addedBy || 'Unknown',
        addedAt: new Date().toISOString(),
        status: 'active',
        media: pr.media || null, // { type: 'image'|'video'|'audio'|'document'|'link', url: '...', filename: '...' }
        attachments: []
    };
    
    // Batasi jumlah PR
    if (prData.tasks.length >= CONFIG.MAX_PR) {
        // Hapus yang paling lama expired
        const expired = prData.tasks.filter(t => t.status === 'expired');
        if (expired.length > 0) {
            prData.tasks = prData.tasks.filter(t => t.status !== 'expired');
        } else {
            // Hapus yang paling lama
            prData.tasks.shift();
        }
    }
    
    prData.tasks.unshift(task);
    prData.stats.total++;
    prData.stats.active = prData.tasks.filter(t => t.status === 'active').length;
    
    saveData();
    return task;
}

/**
 * Hapus PR by ID
 * @param {string} id - ID PR
 * @returns {boolean} - Sukses/gagal
 */
function deletePR(id) {
    loadData();
    
    const index = prData.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    prData.tasks.splice(index, 1);
    prData.stats.active = prData.tasks.filter(t => t.status === 'active').length;
    
    saveData();
    return true;
}

/**
 * Hapus PR expired
 */
function cleanExpiredTasks() {
    const now = new Date();
    let cleaned = 0;
    
    prData.tasks.forEach(task => {
        if (task.deadlineDate && new Date(task.deadlineDate) < now && task.status === 'active') {
            task.status = 'expired';
            cleaned++;
        }
    });
    
    if (cleaned > 0) {
        prData.stats.expired += cleaned;
        prData.stats.active = prData.tasks.filter(t => t.status === 'active').length;
        prData.stats.lastClean = new Date().toISOString();
        saveData();
    }
    
    return cleaned;
}

/**
 * Get semua PR (filter: all, active, expired)
 */
function getPRs(filter = 'active') {
    loadData();
    cleanExpiredTasks();
    
    switch(filter) {
        case 'all':
            return [...prData.tasks];
        case 'expired':
            return prData.tasks.filter(t => t.status === 'expired');
        case 'active':
        default:
            return prData.tasks.filter(t => t.status === 'active');
    }
}

/**
 * Get PR by ID
 */
function getPRById(id) {
    loadData();
    return prData.tasks.find(t => t.id === id) || null;
}

/**
 * Get PR stats
 */
function getPRStats() {
    loadData();
    cleanExpiredTasks();
    
    const active = prData.tasks.filter(t => t.status === 'active');
    const urgent = active.filter(t => {
        if (!t.deadlineDate) return false;
        const diff = new Date(t.deadlineDate) - new Date();
        return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // 3 hari
    });
    
    return {
        total: prData.stats.total,
        active: active.length,
        expired: prData.stats.expired,
        urgent: urgent.length,
        lastClean: prData.stats.lastClean
    };
}

/**
 * Format PR untuk display
 */
function formatPRList(prs, page = 1, perPage = 10) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageItems = prs.slice(start, end);
    const totalPages = Math.ceil(prs.length / perPage);
    
    if (pageItems.length === 0) {
        return {
            text: '📚 *Tidak ada PR/Tugas*\n\n' +
                  '✅ Semua tugas sudah selesai! 🎉',
            totalPages: 0
        };
    }
    
    let text = `╔══════════════════════════╗\n`;
    text += `║  📚 DAFTAR PR/TUGAS    ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    
    pageItems.forEach((task, i) => {
        const num = start + i + 1;
        const deadlineStr = task.deadline || 'Tidak ada deadline';
        const statusEmoji = task.status === 'expired' ? '❌' : 
                           task.status === 'done' ? '✅' : '📝';
        
        // Cek urgent (< 3 hari)
        let urgentBadge = '';
        if (task.deadlineDate && task.status === 'active') {
            const diff = new Date(task.deadlineDate) - new Date();
            const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if (daysLeft <= 1) urgentBadge = ' 🔴*URGENT!*';
            else if (daysLeft <= 3) urgentBadge = ' 🟡*SEGERA*';
        }
        
        text += `${statusEmoji} *${num}. ${task.subject}*${urgentBadge}\n`;
        text += `   📝 ${task.description.slice(0, 60)}${task.description.length > 60 ? '...' : ''}\n`;
        text += `   📅 Deadline: ${deadlineStr}\n`;
        text += `   🆔 ID: ${task.id}\n`;
        
        if (task.media) {
            text += `   📎 Media: ${task.media.type}\n`;
        }
        
        text += `   👤 Oleh: ${task.addedBy}\n`;
        text += `\n`;
    });
    
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 Halaman: ${page}/${totalPages} | Total: ${prs.length} PR\n`;
    text += `💡 .addpr <mapel>|<deskripsi>|<deadline>\n`;
    text += `   .delpr <id> | .pr <id> (detail)`;
    
    return {
        text,
        totalPages,
        currentPage: page
    };
}

/**
 * Format detail PR
 */
function formatPRDetail(task) {
    if (!task) return '❌ PR tidak ditemukan.';
    
    const statusEmoji = task.status === 'expired' ? '❌ EXPIRED' : 
                       task.status === 'done' ? '✅ SELESAI' : '📝 AKTIF';
    
    let text = `╔══════════════════════════╗\n`;
    text += `║  📚 DETAIL PR/TUGAS    ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    text += `📌 *${task.subject}*\n\n`;
    text += `📝 *Deskripsi:*\n${task.description || '-'}\n\n`;
    text += `📅 *Deadline:* ${task.deadline || 'Tidak ada'}\n`;
    text += `🏷️ *Status:* ${statusEmoji}\n`;
    text += `🆔 *ID:* ${task.id}\n`;
    text += `👤 *Ditambah oleh:* ${task.addedBy}\n`;
    text += `🕐 *Ditambah pada:* ${new Date(task.addedAt).toLocaleString('id-ID')}\n`;
    
    if (task.media) {
        text += `\n📎 *Media Terlampir:*\n`;
        text += `   • Tipe: ${task.media.type}\n`;
        if (task.media.url) text += `   • URL: ${task.media.url}\n`;
        if (task.media.filename) text += `   • File: ${task.media.filename}\n`;
    }
    
    return text;
}

// Auto-clean setiap interval
setInterval(() => {
    const cleaned = cleanExpiredTasks();
    if (cleaned > 0) {
        console.log(`🧹 Auto-cleaned ${cleaned} expired PRs`);
    }
}, CONFIG.AUTO_CLEAN_INTERVAL);

module.exports = {
    addPR,
    deletePR,
    getPRs,
    getPRById,
    getPRStats,
    formatPRList,
    formatPRDetail,
    cleanExpiredTasks,
    CONFIG
};
