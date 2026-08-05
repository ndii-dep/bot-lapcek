// lib/channelManager.js
// Channel & Group Manager untuk Reminder

const fs = require('fs');
const path = require('path');

const CONFIG = {
    DATA_FILE: './data/channels.json'
};

// Inisialisasi data
let channelData = {
    channels: [], // Untuk reminder
    groups: [],   // Untuk reminder
    stats: {
        totalChannels: 0,
        totalGroups: 0,
        lastUpdate: new Date().toISOString()
    }
};

// Load data
function loadData() {
    try {
        if (fs.existsSync(CONFIG.DATA_FILE)) {
            const raw = fs.readFileSync(CONFIG.DATA_FILE, 'utf-8');
            channelData = JSON.parse(raw);
        }
    } catch (err) {
        console.error('Error loading channels data:', err);
    }
}

// Save data
function saveData() {
    try {
        const dir = path.dirname(CONFIG.DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        channelData.stats.totalChannels = channelData.channels.length;
        channelData.stats.totalGroups = channelData.groups.length;
        channelData.stats.lastUpdate = new Date().toISOString();
        fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(channelData, null, 2));
    } catch (err) {
        console.error('Error saving channels data:', err);
    }
}

/**
 * Add channel untuk reminder
 */
function addChannel(channelId, name = '', addedBy = 'Owner') {
    loadData();
    
    // Cek duplikat
    const exists = channelData.channels.find(c => c.id === channelId);
    if (exists) return { success: false, error: 'Channel sudah terdaftar' };
    
    const channel = {
        id: channelId,
        name: name || `Channel ${channelId.slice(0, 10)}...`,
        addedBy: addedBy,
        addedAt: new Date().toISOString(),
        status: 'active',
        type: 'channel'
    };
    
    channelData.channels.push(channel);
    saveData();
    
    return { success: true, channel };
}

/**
 * Add group untuk reminder
 */
function addGroup(groupId, name = '', addedBy = 'Owner') {
    loadData();
    
    // Cek duplikat
    const exists = channelData.groups.find(g => g.id === groupId);
    if (exists) return { success: false, error: 'Group sudah terdaftar' };
    
    const group = {
        id: groupId,
        name: name || `Group ${groupId.slice(0, 10)}...`,
        addedBy: addedBy,
        addedAt: new Date().toISOString(),
        status: 'active',
        type: 'group'
    };
    
    channelData.groups.push(group);
    saveData();
    
    return { success: true, group };
}

/**
 * Remove channel
 */
function removeChannel(channelId) {
    loadData();
    
    const index = channelData.channels.findIndex(c => c.id === channelId);
    if (index === -1) return { success: false, error: 'Channel tidak ditemukan' };
    
    channelData.channels.splice(index, 1);
    saveData();
    
    return { success: true };
}

/**
 * Remove group
 */
function removeGroup(groupId) {
    loadData();
    
    const index = channelData.groups.findIndex(g => g.id === groupId);
    if (index === -1) return { success: false, error: 'Group tidak ditemukan' };
    
    channelData.groups.splice(index, 1);
    saveData();
    
    return { success: true };
}

/**
 * Get all channels
 */
function getChannels() {
    loadData();
    return channelData.channels;
}

/**
 * Get all groups
 */
function getGroups() {
    loadData();
    return channelData.groups;
}

/**
 * Get all reminder targets (channels + groups)
 */
function getAllTargets() {
    loadData();
    return {
        channels: channelData.channels.filter(c => c.status === 'active'),
        groups: channelData.groups.filter(g => g.status === 'active')
    };
}

module.exports = {
    addChannel,
    addGroup,
    removeChannel,
    removeGroup,
    getChannels,
    getGroups,
    getAllTargets,
    CONFIG
};
