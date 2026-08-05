const fs = require('fs');
const path = require('path');

const CONFIG = {
    DATA_FILE: './data/partners.json'
};

const LEVELS = {
    GUEST: 0,
    PARTNER: 1,
    OWNER: 2
};

const PERMISSIONS = {
    GUEST: [
        'info', 'menu', 'help', '?',
        'owner', 'pemilik', 'creator', 'dev',
        'walas', 'walikelas', 'guru', 'teacher',
        'today', 'hariini', 'sekarang',
        'tomorrow', 'besok', 'reminderbesok',
        'mapel', 'pelajaran', 'matapelajaran', 'subject',
        'piket', 'clean', 'bersih', 'duty',
        'jadwal', 'schedule', 'fullschedule', 'lengkap',
        'reminder', 'reminders', 'pengingat', 'notif',
        'songfess', 'sf', 'song', 'lagu', 'musicfess',
        'menfess', 'confess', 'confes', 'menfes', 'anon', 'rahasia',
        'sticker', 'stiker', 's', 'stick', 'stickerwa',
        'getid', 'id', 'chatid', 'cekid', 'myid',
        'ping', 'cek', 'test', 'status', 'botstatus',
        'search', 'cari', 'find', 'cmd',
        'pr', 'listpr', 'tugas', 'dafpus',
        'mylevel', 'level', 'role'
    ],
    
    PARTNER: [
        'addpr', 'tambahpr', 'addtugas',
        'delpr', 'hapuspr', 'deletepr',
        'sendreminder', 'kirimreminder', 'sendnotif', 'kirimnotif',
        'alight', 'alightmotion', 'am', 'alightpremium', 'premium'
    ],
    
    OWNER: [
        'addpartner',
        'delpartner', 'removepartner',
        'listpartner', 'partners',
        'addch', 'addchannel',
        'delch', 'removechannel',
        'listch', 'channels',
        'addgroup', 'addgrup',
        'delgroup', 'removegroup',
        'listgroup', 'groups', 'grup',
        'broadcast', 'bc',
        'eval', 'exec',
        'resetpr', 'cleanpr'
    ]
};

let partnerData = {
    partners: [],
    stats: {
        total: 0,
        lastUpdate: new Date().toISOString()
    }
};

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

function normalizeNumber(number) {
    if (!number) return '';
    
    let cleaned = number.replace(/[^0-9]/g, '');
    
    if (cleaned.startsWith('62')) {
        return cleaned;
    }
    
    if (cleaned.startsWith('0')) {
        return '62' + cleaned.slice(1);
    }
    
    if (cleaned.startsWith('8')) {
        return '62' + cleaned;
    }
    
    return '62' + cleaned;
}

function getUserLevel(senderNumber, pushName = '') {
    loadData();
    
    const normalizedSender = normalizeNumber(senderNumber);
    
    const ownerNumberRaw = global.botConfig?.noOwner || '';
    const ownerName = global.botConfig?.owner || '';
    
    const ownerNumbers = [];
    
    if (ownerNumberRaw) {
        ownerNumbers.push(normalizeNumber(ownerNumberRaw));
        
        if (ownerNumberRaw.startsWith('0')) {
            ownerNumbers.push('62' + ownerNumberRaw.slice(1));
        }
        if (ownerNumberRaw.startsWith('62')) {
            ownerNumbers.push('0' + ownerNumberRaw.slice(2));
        }
        if (ownerNumberRaw.startsWith('8')) {
            ownerNumbers.push('0' + ownerNumberRaw);
            ownerNumbers.push('62' + ownerNumberRaw);
        }
        
        ownerNumbers.push(ownerNumberRaw.replace(/[^0-9]/g, ''));
    }
    
    const isOwner = ownerNumbers.includes(normalizedSender) || 
                    ownerNumbers.includes(senderNumber) ||
                    ownerNumbers.includes(senderNumber.replace(/[^0-9]/g, '')) ||
                    (ownerName && pushName && pushName.toLowerCase() === ownerName.toLowerCase());
    
    if (isOwner) {
        return LEVELS.OWNER;
    }
    
    const isPartner = partnerData.partners.some(p => {
        const pNormalized = normalizeNumber(p.number);
        return normalizedSender === pNormalized || 
               senderNumber === p.number || 
               senderNumber === pNormalized;
    });
    
    if (isPartner) return LEVELS.PARTNER;
    
    return LEVELS.GUEST;
}

function hasPermission(senderNumber, command, pushName = '') {
    const level = getUserLevel(senderNumber, pushName);
    
    if (level === LEVELS.OWNER) return true;
    
    if (level === LEVELS.PARTNER) {
        const allPartnerPerms = [...PERMISSIONS.GUEST, ...PERMISSIONS.PARTNER];
        return allPartnerPerms.includes(command);
    }
    
    return PERMISSIONS.GUEST.includes(command);
}

function getLevelName(level) {
    switch(level) {
        case LEVELS.OWNER: return '👑 Owner';
        case LEVELS.PARTNER: return '⭐ Partner';
        default: return '👤 Guest';
    }
}

function addPartner(number, name = '', addedBy = 'Owner') {
    loadData();
    
    const normalizedNumber = normalizeNumber(number);
    
    const exists = partnerData.partners.find(p => 
        normalizeNumber(p.number) === normalizedNumber
    );
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

function removePartner(number) {
    loadData();
    
    const normalizedNumber = normalizeNumber(number);
    
    const index = partnerData.partners.findIndex(p => 
        normalizeNumber(p.number) === normalizedNumber
    );
    if (index === -1) return { success: false, error: 'Partner tidak ditemukan' };
    
    const removed = partnerData.partners.splice(index, 1)[0];
    saveData();
    
    return { success: true, partner: removed };
}

function listPartners() {
    loadData();
    return partnerData.partners;
}

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
    normalizeNumber,
    LEVELS,
    PERMISSIONS
};
