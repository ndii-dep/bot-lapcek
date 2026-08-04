// lib/stickerUtils.js
// Utility functions untuk sticker maker

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Compress gambar sebelum jadi sticker
 */
async function compressImage(inputPath, maxSize = 512) {
    const outputPath = inputPath.replace(/\.[^.]+$/, '_compressed.jpg');
    
    const cmd = `ffmpeg -i "${inputPath}" -vf "scale='min(${maxSize},iw)':'min(${maxSize},ih)':force_original_aspect_ratio=decrease" -q:v 2 "${outputPath}"`;
    
    await execAsync(cmd);
    
    return outputPath;
}

/**
 * Resize video untuk sticker
 */
async function resizeVideo(inputPath, maxSize = 512) {
    const outputPath = inputPath.replace(/\.[^.]+$/, '_resized.mp4');
    
    const cmd = `ffmpeg -i "${inputPath}" -vf "scale='min(${maxSize},iw)':'min(${maxSize},ih)':force_original_aspect_ratio=decrease,fps=10" -c:v libx264 -preset fast -crf 23 "${outputPath}"`;
    
    await execAsync(cmd);
    
    return outputPath;
}

/**
 * Ambil frame pertama dari video (untuk preview)
 */
async function getVideoPreview(videoPath) {
    const outputPath = videoPath.replace(/\.[^.]+$/, '_preview.jpg');
    
    const cmd = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${outputPath}"`;
    
    await execAsync(cmd);
    
    return outputPath;
}

/**
 * Ambil durasi video
 */
async function getVideoDuration(videoPath) {
    try {
        const { stdout } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`
        );
        return parseFloat(stdout.trim());
    } catch (e) {
        return 0;
    }
}

/**
 * Bersihkan file temporary
 */
function cleanTemp(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
    } catch (e) {
        // Ignore
    }
    return false;
}

/**
 * Bersihkan semua file di folder temp
 */
function cleanAllTemp(tempDir = './temp/sticker') {
    try {
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                if (file.startsWith('media_') || file.startsWith('sticker_')) {
                    cleanTemp(filePath);
                }
            });
        }
    } catch (e) {
        // Ignore
    }
}

/**
 * Format durasi ke menit:detik
 */
function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

module.exports = {
    compressImage,
    resizeVideo,
    getVideoPreview,
    getVideoDuration,
    cleanTemp,
    cleanAllTemp,
    formatDuration
};
