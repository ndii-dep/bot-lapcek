const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Convert media buffer ke audio MP3
 * @param {Buffer} mediaBuffer - Buffer media (video/audio)
 * @param {string} inputExt - Ekstensi input (mp4, mp3, etc)
 * @returns {Promise<{data: Buffer}>}
 */
async function toAudio(mediaBuffer, inputExt) {
    return new Promise((resolve, reject) => {
        const tempDir = os.tmpdir();
        const inputFile = path.join(tempDir, `input_${Date.now()}.${inputExt}`);
        const outputFile = path.join(tempDir, `output_${Date.now()}.mp3`);
        
        // Tulis buffer ke file temporary
        fs.writeFileSync(inputFile, mediaBuffer);
        
        // Convert ke audio mp3
        const command = `ffmpeg -i "${inputFile}" -vn -acodec libmp3lame -q:a 2 "${outputFile}" -y`;
        
        exec(command, (error, stdout, stderr) => {
            // Hapus file input
            try { fs.unlinkSync(inputFile); } catch (e) {}
            
            if (error) {
                try { fs.unlinkSync(outputFile); } catch (e) {}
                reject(new Error(`Conversion failed: ${error.message}`));
                return;
            }
            
            // Baca file output
            const data = fs.readFileSync(outputFile);
            
            // Hapus file output
            try { fs.unlinkSync(outputFile); } catch (e) {}
            
            resolve({ data });
        });
    });
}

/**
 * Convert media buffer ke voice note (PTT)
 * @param {Buffer} mediaBuffer - Buffer media (video/audio)
 * @param {string} inputExt - Ekstensi input
 * @returns {Promise<{data: Buffer}>}
 */
async function toPTT(mediaBuffer, inputExt) {
    return new Promise((resolve, reject) => {
        const tempDir = os.tmpdir();
        const inputFile = path.join(tempDir, `input_${Date.now()}.${inputExt}`);
        const outputFile = path.join(tempDir, `output_${Date.now()}.ogg`);
        
        fs.writeFileSync(inputFile, mediaBuffer);
        
        // Convert ke opus/ogg untuk voice note
        const command = `ffmpeg -i "${inputFile}" -vn -acodec libopus -b:a 16k -ar 16000 -ac 1 "${outputFile}" -y`;
        
        exec(command, (error, stdout, stderr) => {
            try { fs.unlinkSync(inputFile); } catch (e) {}
            
            if (error) {
                try { fs.unlinkSync(outputFile); } catch (e) {}
                reject(new Error(`Conversion failed: ${error.message}`));
                return;
            }
            
            const data = fs.readFileSync(outputFile);
            try { fs.unlinkSync(outputFile); } catch (e) {}
            
            resolve({ data });
        });
    });
}

/**
 * Convert video buffer (processing)
 * @param {Buffer} mediaBuffer - Buffer video
 * @param {string} inputExt - Ekstensi input
 * @returns {Promise<{data: Buffer}>}
 */
async function toVideo(mediaBuffer, inputExt) {
    return new Promise((resolve, reject) => {
        const tempDir = os.tmpdir();
        const inputFile = path.join(tempDir, `input_${Date.now()}.${inputExt}`);
        const outputFile = path.join(tempDir, `output_${Date.now()}.mp4`);
        
        fs.writeFileSync(inputFile, mediaBuffer);
        
        // Compress/re-encode video
        const command = `ffmpeg -i "${inputFile}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "${outputFile}" -y`;
        
        exec(command, (error, stdout, stderr) => {
            try { fs.unlinkSync(inputFile); } catch (e) {}
            
            if (error) {
                try { fs.unlinkSync(outputFile); } catch (e) {}
                reject(new Error(`Conversion failed: ${error.message}`));
                return;
            }
            
            const data = fs.readFileSync(outputFile);
            try { fs.unlinkSync(outputFile); } catch (e) {}
            
            resolve({ data });
        });
    });
}

/**
 * Cek apakah ffmpeg terinstall
 * @returns {Promise<boolean>}
 */
function checkFfmpeg() {
    return new Promise((resolve) => {
        exec('ffmpeg -version', (error) => {
            resolve(!error);
        });
    });
}

module.exports = {
    toAudio,
    toPTT,
    toVideo,
    checkFfmpeg,
    ffmpeg: {
        exec: (cmd) => new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve({ stdout, stderr });
            });
        })
    }
};
