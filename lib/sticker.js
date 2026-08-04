// lib/sticker.js
// Sticker Maker - Foto & Video (max 15 detik)

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Konfigurasi
const CONFIG = {
    TEMP_DIR: './temp/sticker',
    MAX_VIDEO_DURATION: 15, // Maks 15 detik
    STICKER_SIZE: 512, // Ukuran sticker (512x512)
    QUALITY: 80, // Kualitas gambar (1-100)
    AUTHOR: global.botConfig?.name || 'School Bot',
    PACK: 'Sticker Maker',
    TYPES: ['full', 'circle', 'rounded'], // Tipe sticker
    ALLOWED_MEDIA: ['image', 'video'],
    MAX_FILE_SIZE: 10 * 1024 * 1024 // 10 MB
};

// Pastikan temp dir ada
if (!fs.existsSync(CONFIG.TEMP_DIR)) {
    fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
}

/**
 * Download media dari pesan
 */
async function downloadMedia(sock, messageInfo) {
    const message = messageInfo.message;
    
    // Cek tipe media
    let mediaType = null;
    let mediaMessage = null;
    
    if (message.imageMessage) {
        mediaType = 'image';
        mediaMessage = message.imageMessage;
    } else if (message.videoMessage) {
        mediaType = 'video';
        mediaMessage = message.videoMessage;
    } else if (message.extendedTextMessage?.contextInfo?.quotedMessage) {
        // Cek quoted message
        const quoted = message.extendedTextMessage.contextInfo.quotedMessage;
        if (quoted.imageMessage) {
            mediaType = 'image';
            mediaMessage = quoted.imageMessage;
        } else if (quoted.videoMessage) {
            mediaType = 'video';
            mediaMessage = quoted.videoMessage;
        }
    }
    
    if (!mediaType || !mediaMessage) {
        throw new Error('Media tidak ditemukan. Kirim/reply gambar atau video (max 15 detik).');
    }
    
    // Cek durasi video
    if (mediaType === 'video' && mediaMessage.seconds > CONFIG.MAX_VIDEO_DURATION) {
        throw new Error(`Video terlalu panjang! Maksimal ${CONFIG.MAX_VIDEO_DURATION} detik. Video kamu: ${mediaMessage.seconds} detik.`);
    }
    
    // Cek file size
    const fileSize = mediaMessage.fileLength;
    if (fileSize > CONFIG.MAX_FILE_SIZE) {
        throw new Error(`File terlalu besar! Maksimal 10 MB. Ukuran file: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Download
    const buffer = await downloadMediaMessage(
        { message: { [mediaType + 'Message']: mediaMessage } },
        'buffer',
        {},
        { logger: console }
    );
    
    const ext = mediaType === 'image' ? 'jpg' : 'mp4';
    const filename = `media_${Date.now()}.${ext}`;
    const filepath = path.join(CONFIG.TEMP_DIR, filename);
    
    fs.writeFileSync(filepath, buffer);
    
    return {
        type: mediaType,
        buffer: buffer,
        filepath: filepath,
        filename: filename,
        duration: mediaMessage.seconds || 0
    };
}

/**
 * Convert gambar ke sticker (static)
 */
async function imageToSticker(imagePath, stickerType = 'full') {
    const outputPath = path.join(CONFIG.TEMP_DIR, `sticker_${Date.now()}.webp`);
    
    let ffmpegCmd = '';
    
    switch(stickerType) {
        case 'circle':
            // Circle sticker
            ffmpegCmd = `ffmpeg -i "${imagePath}" -vf "scale=${CONFIG.STICKER_SIZE}:${CONFIG.STICKER_SIZE}:force_original_aspect_ratio=decrease,format=rgba,crop=min(iw\\,ih):min(iw\\,ih),geq=r='r(X,Y)':a='if(lt(sqrt((X-W/2)^2+(Y-H/2)^2),W/2),255,0)'" -c:v libwebp -lossless 0 -q:v ${CONFIG.QUALITY} -preset default -loop 0 -an -vsync 0 -s ${CONFIG.STICKER_SIZE}x${CONFIG.STICKER_SIZE} "${outputPath}"`;
            break;
            
        case 'rounded':
            // Rounded corner sticker
            const radius = 40;
            ffmpegCmd = `ffmpeg -i "${imagePath}" -vf "scale=${CONFIG.STICKER_SIZE}:${CONFIG.STICKER_SIZE}:force_original_aspect_ratio=decrease,format=rgba,pad=${CONFIG.STICKER_SIZE}:${CONFIG.STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000,geq=r='r(X,Y)':a='if(lt(X,${radius}),if(lt(Y,${radius}),if(lt(sqrt((${radius}-X)^2+(${radius}-Y)^2),${radius}),255,0),if(gt(Y,H-${radius}),if(lt(sqrt((${radius}-X)^2+(Y-(H-${radius}))^2),${radius}),255,0),255)),if(gt(X,W-${radius}),if(lt(Y,${radius}),if(lt(sqrt((X-(W-${radius}))^2+(${radius}-Y)^2),${radius}),255,0),if(gt(Y,H-${radius}),if(lt(sqrt((X-(W-${radius}))^2+(Y-(H-${radius}))^2),${radius}),255,0),255)),255))'" -c:v libwebp -lossless 0 -q:v ${CONFIG.QUALITY} -preset default -loop 0 -an -vsync 0 -s ${CONFIG.STICKER_SIZE}x${CONFIG.STICKER_SIZE} "${outputPath}"`;
            break;
            
        default: // 'full'
            // Full rectangular sticker
            ffmpegCmd = `ffmpeg -i "${imagePath}" -vf "scale=${CONFIG.STICKER_SIZE}:${CONFIG.STICKER_SIZE}:force_original_aspect_ratio=decrease,pad=${CONFIG.STICKER_SIZE}:${CONFIG.STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -lossless 0 -q:v ${CONFIG.QUALITY} -preset default -loop 0 -an -vsync 0 -s ${CONFIG.STICKER_SIZE}x${CONFIG.STICKER_SIZE} "${outputPath}"`;
    }
    
    await execAsync(ffmpegCmd);
    
    return outputPath;
}

/**
 * Convert video ke sticker (animated)
 */
async function videoToSticker(videoPath, stickerType = 'full', duration = 3) {
    const outputPath = path.join(CONFIG.TEMP_DIR, `sticker_${Date.now()}.webp`);
    
    // Batasi durasi maksimal
    const maxDuration = Math.min(duration, CONFIG.MAX_VIDEO_DURATION);
    
    let ffmpegCmd = '';
    
    switch(stickerType) {
        case 'circle':
            ffmpegCmd = `ffmpeg -i "${videoPath}" -t ${maxDuration} -vf "fps=10,scale=${CONFIG.STICKER_SIZE}:${CONFIG.STICKER_SIZE}:force_original_aspect_ratio=decrease,format=rgba,crop=min(iw\\,ih):min(iw\\,ih),geq=r='r(X,Y)':a='if(lt(sqrt((X-W/2)^2+(Y-H/2)^2),W/2),255,0)'" -c:v libwebp -lossless 0 -q:v ${CONFIG.QUALITY} -preset default -loop 0 -an -vsync 0 -s ${CONFIG.STICKER_SIZE}x${CONFIG.STICKER_SIZE} "${outputPath}"`;
            break;
            
        case 'rounded':
            const radius = 40;
            ffmpegCmd = `ffmpeg -i "${videoPath}" -t ${maxDuration} -vf "fps=10,scale=${CONFIG.STICKER_SIZE}:${CONFIG.STICKER_SIZE}:force_original_aspect_ratio=decrease,format=rgba,pad=${CONFIG.STICKER_SIZE}:${CONFIG.STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000,geq=r='r(X,Y)':a='if(lt(X,${radius}),if(lt(Y,${radius}),if(lt(sqrt((${radius}-X)^2+(${radius}-Y)^2),${radius}),255,0),if(gt(Y,H-${radius}),if(lt(sqrt((${radius}-X)^2+(Y-(H-${radius}))^2),${radius}),255,0),255)),if(gt(X,W-${radius}),if(lt(Y,${radius}),if(lt(sqrt((X-(W-${radius}))^2+(${radius}-Y)^2),${radius}),255,0),if(gt(Y,H-${radius}),if(lt(sqrt((X-(W-${radius}))^2+(Y-(H-${radius}))^2),${radius}),255,0),255)),255))'" -c:v libwebp -lossless 0 -q:v ${CONFIG.QUALITY} -preset default -loop 0 -an -vsync 0 -s ${CONFIG.STICKER_SIZE}x${CONFIG.STICKER_SIZE} "${outputPath}"`;
            break;
            
        default: // 'full'
            ffmpegCmd = `ffmpeg -i "${videoPath}" -t ${maxDuration} -vf "fps=10,scale=${CONFIG.STICKER_SIZE}:${CONFIG.STICKER_SIZE}:force_original_aspect_ratio=decrease,pad=${CONFIG.STICKER_SIZE}:${CONFIG.STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -lossless 0 -q:v ${CONFIG.QUALITY} -preset default -loop 0 -an -vsync 0 -s ${CONFIG.STICKER_SIZE}x${CONFIG.STICKER_SIZE} "${outputPath}"`;
    }
    
    await execAsync(ffmpegCmd);
    
    return outputPath;
}

/**
 * Tambah metadata sticker
 */
async function addStickerMetadata(stickerPath, packName = CONFIG.PACK, authorName = CONFIG.AUTHOR) {
    const tempPath = stickerPath.replace('.webp', '_meta.webp');
    
    const cmd = `ffmpeg -i "${stickerPath}" -metadata "sticker-pack-name=${packName}" -metadata "sticker-author-name=${authorName}" -c copy "${tempPath}"`;
    
    await execAsync(cmd);
    
    // Replace original
    fs.unlinkSync(stickerPath);
    fs.renameSync(tempPath, stickerPath);
    
    return stickerPath;
}

/**
 * Main function: Create sticker
 */
async function createSticker(sock, messageInfo, options = {}) {
    const {
        type = 'full', // full, circle, rounded
        pack = CONFIG.PACK,
        author = CONFIG.AUTHOR
    } = options;
    
    try {
        // Download media
        const media = await downloadMedia(sock, messageInfo);
        
        let stickerPath;
        
        if (media.type === 'image') {
            // Convert image to sticker
            stickerPath = await imageToSticker(media.filepath, type);
        } else if (media.type === 'video') {
            // Convert video to animated sticker
            stickerPath = await videoToSticker(media.filepath, type, media.duration);
        } else {
            throw new Error('Tipe media tidak didukung');
        }
        
        // Add metadata
        await addStickerMetadata(stickerPath, pack, author);
        
        // Read sticker
        const stickerBuffer = fs.readFileSync(stickerPath);
        
        // Cleanup temp files
        try {
            fs.unlinkSync(media.filepath);
            fs.unlinkSync(stickerPath);
        } catch (e) {
            // Ignore cleanup errors
        }
        
        return {
            success: true,
            sticker: stickerBuffer,
            type: media.type === 'video' ? 'animated' : 'static'
        };
        
    } catch (error) {
        throw error;
    }
}

/**
 * Cek apakah ffmpeg terinstall
 */
async function checkFfmpeg() {
    try {
        await execAsync('ffmpeg -version');
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = {
    createSticker,
    checkFfmpeg,
    CONFIG,
    downloadMedia
};
