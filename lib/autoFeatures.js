const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    DATA_FILE: './data/autofeatures.json',
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 400,
    DEFAULT_PROFILE: 'https://files.catbox.moe/default-profile.jpg',
    FONT_PATH: './assets/fonts/'
};

let featureData = {
    welcome: { status: 'on', message: 'Selamat datang @user di grup @group! 🎉' },
    goodbye: { status: 'off', message: 'Selamat tinggal @user, semoga hari-harimu menyenangkan! 👋' },
    autotyping: { status: 'on' },
    autorecord: { status: 'off' },
    autoread: { status: 'on' },
    autopostsw: { status: 'off', caption: '🚀 Bot baru saja diupdate! Cek fitur baru dengan .menu', lastPost: null },
    autoreactsw: { status: 'off', emoji: '❤️' }
};

function loadData() {
    try {
        if (fs.existsSync(CONFIG.DATA_FILE)) {
            const raw = fs.readFileSync(CONFIG.DATA_FILE, 'utf-8');
            featureData = JSON.parse(raw);
        }
    } catch (err) {
        console.error('Error loading autofeatures data:', err);
    }
}

function saveData() {
    try {
        const dir = path.dirname(CONFIG.DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(featureData, null, 2));
    } catch (err) {
        console.error('Error saving autofeatures data:', err);
    }
}

function getFeature(featureName) {
    loadData();
    return featureData[featureName] || null;
}

function getFeatureStatus(featureName) {
    loadData();
    const feature = featureData[featureName];
    if (!feature) return false;
    return feature.status === 'on';
}

function toggleFeature(featureName, status) {
    loadData();
    
    if (!featureData[featureName]) {
        return { success: false, error: 'Fitur tidak ditemukan' };
    }
    
    if (status !== 'on' && status !== 'off') {
        return { success: false, error: 'Status tidak valid. Gunakan: on / off' };
    }
    
    featureData[featureName].status = status;
    
    if (featureName === 'autopostsw' && status === 'on') {
        featureData[featureName].lastPost = new Date().toISOString();
    }
    
    saveData();
    
    return { success: true, feature: featureName, status: status };
}

function updateFeatureMessage(featureName, message) {
    loadData();
    
    if (!featureData[featureName]) {
        return { success: false, error: 'Fitur tidak ditemukan' };
    }
    
    if (featureName === 'welcome' || featureName === 'goodbye') {
        featureData[featureName].message = message;
        saveData();
        return { success: true, feature: featureName, message: message };
    }
    
    return { success: false, error: 'Hanya welcome/goodbye yang bisa diubah pesannya' };
}

function updateFeatureEmoji(featureName, emoji) {
    loadData();
    
    if (!featureData[featureName]) {
        return { success: false, error: 'Fitur tidak ditemukan' };
    }
    
    if (featureName === 'autoreactsw') {
        featureData[featureName].emoji = emoji;
        saveData();
        return { success: true, feature: featureName, emoji: emoji };
    }
    
    return { success: false, error: 'Hanya autoreactsw yang bisa diubah emojinya' };
}

function updateAutoPostSWCaption(caption) {
    loadData();
    featureData.autopostsw.caption = caption;
    saveData();
    return { success: true };
}

function getLastAutoPostTime() {
    loadData();
    return featureData.autopostsw.lastPost;
}

function getAutoPostSWCaption() {
    loadData();
    return featureData.autopostsw.caption || '🚀 Bot baru saja diupdate!';
}

async function createWelcomeCanvas(userName, groupName, profilePicUrl = null) {
    const width = CONFIG.CANVAS_WIDTH;
    const height = CONFIG.CANVAS_HEIGHT;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(0.5, '#764ba2');
    gradient.addColorStop(1, '#f093fb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = Math.random() * 100 + 20;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(30, 30, width - 60, height - 60);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, width - 60, height - 60);
    
    if (profilePicUrl) {
        try {
            const response = await fetch(profilePicUrl);
            const buffer = Buffer.from(await response.arrayBuffer());
            const img = await loadImage(buffer);
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(width / 2, 150, 70, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            
            ctx.drawImage(img, width / 2 - 70, 80, 140, 140);
            ctx.restore();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(width / 2, 150, 72, 0, Math.PI * 2);
            ctx.stroke();
        } catch (e) {
            drawDefaultAvatar(ctx, width, height, userName);
        }
    } else {
        drawDefaultAvatar(ctx, width, height, userName);
    }
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WELCOME', width / 2, 260);
    
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText(userName, width / 2, 300);
    
    ctx.font = '18px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`Selamat bergabung di ${groupName}!`, width / 2, 335);
    
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText(new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }), width / 2, 370);
    
    return canvas.toBuffer('image/jpeg', 80);
}

async function createGoodbyeCanvas(userName, groupName, profilePicUrl = null) {
    const width = CONFIG.CANVAS_WIDTH;
    const height = CONFIG.CANVAS_HEIGHT;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(0.5, '#3498db');
    gradient.addColorStop(1, '#2980b9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 15; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = Math.random() * 80 + 15;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    
    if (profilePicUrl) {
        try {
            const response = await fetch(profilePicUrl);
            const buffer = Buffer.from(await response.arrayBuffer());
            const img = await loadImage(buffer);
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(width / 2, 150, 70, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            
            ctx.drawImage(img, width / 2 - 70, 80, 140, 140);
            ctx.restore();
            
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(width / 2, 150, 72, 0, Math.PI * 2);
            ctx.stroke();
        } catch (e) {
            drawDefaultAvatar(ctx, width, height, userName, true);
        }
    } else {
        drawDefaultAvatar(ctx, width, height, userName, true);
    }
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOODBYE', width / 2, 260);
    
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText(userName, width / 2, 300);
    
    ctx.font = '18px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`Telah meninggalkan ${groupName}`, width / 2, 335);
    
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText(new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }), width / 2, 370);
    
    return canvas.toBuffer('image/jpeg', 80);
}

function drawDefaultAvatar(ctx, width, height, userName, isGoodbye = false) {
    ctx.fillStyle = isGoodbye ? 'rgba(255,255,255,0.3)' : '#fff';
    ctx.beginPath();
    ctx.arc(width / 2, 150, 70, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = isGoodbye ? '#2c3e50' : '#764ba2';
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(userName.charAt(0).toUpperCase(), width / 2, 168);
}

module.exports = {
    getFeature,
    getFeatureStatus,
    toggleFeature,
    updateFeatureMessage,
    updateFeatureEmoji,
    updateAutoPostSWCaption,
    getLastAutoPostTime,
    createWelcomeCanvas,
    createGoodbyeCanvas,
    getAutoPostSWCaption,
    CONFIG
};
