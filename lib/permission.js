// lib/permission.js
// Permission & Role System: Guest, Partner, Owner

const fs = require('fs');
const path = require('path');

const CONFIG = {
    DATA_FILE: './data/partners.json',
    DEFAULT_OWNER: global.botConfig?.noOwner || '095800650661'
};

// Level definitions
const LEVELS = {
    GUEST: 0,
    PARTNER: 1,
    OWNER: 2
};

// Permission definitions
const PERMISSIONS = {
    // Guest (semua user)
    GUEST: [
        'info', 'menu', 'help',
        'owner', 'walas',
        'today', 'tomorrow', 'besok',
        'mapel', 'piket', 'jadwal',
        'reminder',
        'songfess', 'sf',
        'menfess', 'confess', 'confes', 'menfes',
        'sticker', 'stiker', 's',
        'getid', 'id', 'chatid',
        'ping', 'cek', 'status',
        'search', 'cari', 'find',
        'pr', 'listpr', 'tugas' // Lihat PR
    ],
    
    // Partner (teman/admin grup)
    PARTNER: [
        'addpr', 'delpr', // Kelola PR
        'sendreminder', 'kirimreminder', // Kirim reminder
        'alight', 'alightmotion', 'am' // Alight Motion
    ],
    
    // Owner (pemilik bot)
    OWNER: [
        'addpartner', 'delpartner', 'listpartner', // Kelola partner
        'addch', 'delch', 'listch', // Kelola channel
        'addgroup', 'delgroup', 'listgroup', // Kelola group
        'broadcast', 'bc', // Broadcast pesan
        'eval', 'exec', // Execute code (dangerous)
        'resetpr', 'cleanpr' // Reset PR
    ]
};

// Inisialisasi data
let partnerData = {
    partners: [],
    stats: {
        total: 0,
        lastUpdate: new Date().toISOString()
    }
};

// Load data
function loadData() {
    try {
        if (fs.existsSync(CONFIG.DATA_FILE)) {
            const raw = fs.readFileSync(CONFIG.DATA_FILE, 'utf-8');
            partnerData = JSON.parse(raw);
        }
    } catch (err) {
        console.error('Error loading partners data:', err);
    }
}

// Save data
function saveData() {
    try {
        const dir = path.dirname(CONFIG.DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        partnerData.stats.lastUpdate = new Date().toISOString();
        partnerData.stats.total = partnerData.partners.length;
        fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(partnerData, null, 2));
    } catch (err) {
        console.error('Error saving partners data:', err);
    }
}

/**
 * Get user level
 * @param {string} senderNumber - Nomor pengirim (628xxx)
 * @param {string} pushName - Nama pengirim
 * @returns {number} - Level (0=Guest, 1=Partner, 2=Owner)
 */
function getUserLevel(senderNumber, pushName = '') {
    loadData();
    
    // Format nomor
    let normalizedNumber = senderNumber;
    if (normalizedNumber.startsWith('0')) {
        normalizedNumber = '62' + normalizedNumber.slice(1);
    }
    
    // Cek owner (dari config)
    const ownerNumber = CONFIG.DEFAULT_OWNER.replace(/^0/, '62');
    if (normalizedNumber === ownerNumber || 
        senderNumber === ownerNumber ||
        pushName === global.botConfig?.owner) {
        return LEVELS.OWNER;
    }
    
    // Cek partner
    const isPartner = partnerData.partners.some(p => {
        const pNumber = p.number.replace(/^0/, '62');
        return normalizedNumber === pNumber || senderNumber === pNumber;
    });
    
    if (isPartner) return LEVELS.PARTNER;
    
    // Default: Guest
    return LEVELS.GUEST;
}

/**
 * Cek apakah user punya permission untuk command tertentu
 */
function hasPermission(senderNumber, command, pushName = '') {
    const level = getUserLevel(senderNumber, pushName);
    
    // Owner bisa semua
    if (level === LEVELS.OWNER) return true;
    
    // Partner
    if (level === LEVELS.PARTNER) {
        const allPartnerPerms = [...PERMISSIONS.GUEST, ...PERMISSIONS.PARTNER];
        return allPartnerPerms.includes(command);
    }
    
    // Guest
    return PERMISSIONS.GUEST.includes(command);
}

/**
 * Get user level name
 */
function getLevelName(level) {
    switch(level) {
        case LEVELS.OWNER: return '👑 Owner';
        case LEVELS.PARTNER: return '⭐ Partner';
        default: return '👤 Guest';
    }
}

/**
 * Add partner
 */
function addPartner(number, name = '', addedBy = 'Owner') {
    loadData();
    
    // Format nomor
    let normalizedNumber = number.replace(/[^0-9]/g, '');
    if (normalizedNumber.startsWith('0')) {
        normalizedNumber = '62' + normalizedNumber.slice(1);
    }
    if (!normalizedNumber.startsWith('62')) {
        normalizedNumber = '62' + normalizedNumber;
    }
    
    // Cek duplikat
    const exists = partnerData.partners.find(p => p.number === normalizedNumber);
    if (exists) return { success: false, error: 'Partner sudah terdaftar' };
    
    const partner = {
        number: normalizedNumber,
        name: name || `Partner ${normalizedNumber.slice(-4)}`,
        addedBy: addedBy,
        addedAt: new Date().toISOString(),
        status: 'active'
    };
    
    partnerData.partners.push(partner);
    saveData();
    
    return { success: true, partner };
}

/**
 * Remove partner
 */
function removePartner(number) {
    loadData();
    
    let normalizedNumber = number.replace(/[^0-9]/g, '');
    if (normalizedNumber.startsWith('0')) {
        normalizedNumber = '62' + normalizedNumber.slice(1);
    }
    
    const index = partnerData.partners.findIndex(p => p.number === normalizedNumber);
    if (index === -1) return { success: false, error: 'Partner tidak ditemukan' };
    
    const removed = partnerData.partners.splice(index, 1)[0];
    saveData();
    
    return { success: true, partner: removed };
}

/**
 * List all partners
 */
function listPartners() {
    loadData();
    return partnerData.partners;
}

/**
 * Get permission list for a level
 */
function getPermissionList(level) {
    switch(level) {
        case LEVELS.OWNER:
            return [...PERMISSIONS.GUEST, ...PERMISSIONS.PARTNER, ...PERMISSIONS.OWNER];
        case LEVELS.PARTNER:
            return [...PERMISSIONS.GUEST, ...PERMISSIONS.PARTNER];
        default:
            return PERMISSIONS.GUEST;
    }
}

module.exports = {
    getUserLevel,
    hasPermission,
    getLevelName,
    addPartner,
    removePartner,
    listPartners,
    getPermissionList,
    LEVELS,
    PERMISSIONS
};
