const fs = require('fs');
const path = require('path');

const DB_PATH = './db';

function ensureDbFolder() {
    if (!fs.existsSync(DB_PATH)) {
        fs.mkdirSync(DB_PATH, { recursive: true });
    }
}

function readDB(filename) {
    ensureDbFolder();
    const filepath = path.join(DB_PATH, filename);
    try {
        if (fs.existsSync(filepath)) {
            const raw = fs.readFileSync(filepath, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error(`Error reading ${filename}:`, e.message);
    }
    return null;
}

function writeDB(filename, data) {
    ensureDbFolder();
    const filepath = path.join(DB_PATH, filename);
    try {
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`Error writing ${filename}:`, e.message);
        return false;
    }
}

function getOwner() {
    const data = readDB('owner.json');
    return data || { number: '', name: '', registeredAt: null };
}

function setOwner(number, name) {
    const owner = {
        number: normalizeNumber(number),
        name: name,
        registeredAt: new Date().toISOString()
    };
    return writeDB('owner.json', owner);
}

function isOwner(senderNumber, pushName = '') {
    const owner = getOwner();
    if (!owner.number) return false;
    
    const normalized = normalizeNumber(senderNumber);
    const ownerNormalized = normalizeNumber(owner.number);
    
    if (normalized === ownerNormalized || senderNumber === owner.number) return true;
    if (owner.name && pushName && pushName.toLowerCase() === owner.name.toLowerCase()) return true;
    
    return false;
}

function getPartners() {
    const data = readDB('partner.json');
    return data?.partners || [];
}

function addPartner(number, name = '', addedBy = 'Owner') {
    const data = readDB('partner.json') || { partners: [] };
    const normalized = normalizeNumber(number);
    
    if (data.partners.find(p => p.number === normalized)) {
        return { success: false, error: 'Partner sudah terdaftar' };
    }
    
    data.partners.push({
        number: normalized,
        name: name || `Partner ${normalized.slice(-4)}`,
        addedBy,
        addedAt: new Date().toISOString(),
        status: 'active'
    });
    
    writeDB('partner.json', data);
    return { success: true, partner: data.partners[data.partners.length - 1] };
}

function removePartner(number) {
    const data = readDB('partner.json') || { partners: [] };
    const normalized = normalizeNumber(number);
    const index = data.partners.findIndex(p => p.number === normalized);
    
    if (index === -1) return { success: false, error: 'Partner tidak ditemukan' };
    
    const removed = data.partners.splice(index, 1)[0];
    writeDB('partner.json', data);
    return { success: true, partner: removed };
}

function isPartner(senderNumber) {
    const partners = getPartners();
    const normalized = normalizeNumber(senderNumber);
    return partners.some(p => p.number === normalized || p.number === senderNumber);
}

function getUserLevel(senderNumber, pushName = '') {
    if (isOwner(senderNumber, pushName)) return 2;
    if (isPartner(senderNumber)) return 1;
    return 0;
}

function getPaymentMethods() {
    const data = readDB('pt.json');
    return data?.methods || [
        { name: 'QRIS', number: '085800650661', type: 'qris' },
        { name: 'DANA', number: '085800650661', type: 'ewallet' },
        { name: 'GOPAY', number: '085800650661', type: 'ewallet' },
        { name: 'Bank Transfer BCA', number: '1234567890', type: 'bank' }
    ];
}

function setPaymentMethods(methods) {
    return writeDB('pt.json', { methods, updatedAt: new Date().toISOString() });
}

function getBuyers() {
    const data = readDB('buyer.json');
    return data?.buyers || [];
}

function addBuyer(buyerData) {
    const data = readDB('buyer.json') || { buyers: [] };
    
    const buyer = {
        id: generateBuyerId(),
        ...buyerData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentStatus: 'unpaid',
        billReminder: 0
    };
    
    data.buyers.unshift(buyer);
    writeDB('buyer.json', data);
    return buyer;
}

function updateBuyer(buyerId, updates) {
    const data = readDB('buyer.json') || { buyers: [] };
    const index = data.buyers.findIndex(b => b.id === buyerId);
    
    if (index === -1) return null;
    
    data.buyers[index] = { ...data.buyers[index], ...updates, updatedAt: new Date().toISOString() };
    writeDB('buyer.json', data);
    return data.buyers[index];
}

function getBuyerById(buyerId) {
    const buyers = getBuyers();
    return buyers.find(b => b.id === buyerId) || null;
}

function getBuyerByNumber(number) {
    const buyers = getBuyers();
    const normalized = normalizeNumber(number);
    return buyers.filter(b => normalizeNumber(b.number) === normalized);
}

function getTopBuyers(limit = 10) {
    const buyers = getBuyers();
    const completed = buyers.filter(b => b.status === 'completed');
    const countMap = {};
    
    completed.forEach(b => {
        const key = normalizeNumber(b.number);
        countMap[key] = (countMap[key] || 0) + 1;
    });
    
    return Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([number, count]) => {
            const buyer = completed.find(b => normalizeNumber(b.number) === number);
            return { number, count, name: buyer?.name || 'Unknown', lastOrder: buyer?.createdAt };
        });
}

function normalizeNumber(number) {
    if (!number) return '';
    let cleaned = number.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0') && cleaned.length >= 10) return '62' + cleaned.slice(1);
    if (cleaned.startsWith('8') && cleaned.length >= 10) return '62' + cleaned;
    return cleaned;
}

function generateBuyerId() {
    const d = new Date();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BUY${d.getFullYear().toString().slice(-2)}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}${rand}`;
}

module.exports = {
    getOwner, setOwner, isOwner,
    getPartners, addPartner, removePartner, isPartner,
    getUserLevel,
    getPaymentMethods, setPaymentMethods,
    getBuyers, addBuyer, updateBuyer, getBuyerById, getBuyerByNumber, getTopBuyers,
    normalizeNumber
};
