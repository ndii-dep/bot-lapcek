// lib/songFessSender.js
// Auto-send songfess queue ke channel

const { getNextSongFess, removeSongFess, formatSongFess, CONFIG } = require('./songFess');

let isProcessing = false;
let intervalId = null;

/**
 * Mulai auto-sender untuk songfess
 * @param {Object} sock - WhatsApp socket
 */
function startSongFessSender(sock) {
    if (intervalId) {
        console.log('⚠️ SongFess sender already running');
        return;
    }

    console.log(`🎵 SongFess sender started (interval: ${CONFIG.INTERVAL_MINUTES} min)`);
    
    // Kirim langsung saat start
    setTimeout(() => processQueue(sock), 5000);
    
    // Set interval
    intervalId = setInterval(() => {
        processQueue(sock);
    }, CONFIG.INTERVAL_MINUTES * 60 * 1000);
}

/**
 * Proses antrian songfess
 */
async function processQueue(sock) {
    if (isProcessing) return;
    
    const songFess = getNextSongFess();
    if (!songFess) return;
    
    isProcessing = true;
    
    try {
        const channelId = CONFIG.CHANNEL_ID;
        const text = formatSongFess(songFess);
        
        // Kirim ke channel
        await sock.sendMessage(channelId, {
            text: text,
            footer: '🎵 SongFess - Rekomendasi Lagu Anonim',
            linkPreview: false
        });
        
        // Hapus dari antrian
        removeSongFess(songFess.id, true);
        
        console.log(`✅ SongFess #${songFess.id} sent to channel`);
        
        // Notifikasi ke pengirim (opsional)
        const senderJid = songFess.senderNumber + '@s.whatsapp.net';
        try {
            await sock.sendMessage(senderJid, {
                text: `✅ *SongFess Terkirim!*\n\n` +
                      `🎶 "${songFess.title}"\n` +
                      `🆔 #${songFess.id}\n\n` +
                      `Sudah dikirim ke channel! 🎉`
            });
        } catch (e) {
            // Ignore jika gagal notifikasi
        }
        
    } catch (err) {
        console.error(`❌ Failed to send SongFess #${songFess.id}:`, err.message);
        removeSongFess(songFess.id, false);
    } finally {
        isProcessing = false;
        
        // Jika masih ada antrian, proses lagi setelah delay pendek
        const next = getNextSongFess();
        if (next) {
            setTimeout(() => processQueue(sock), 30000); // 30 detik
        }
    }
}

/**
 * Stop auto-sender
 */
function stopSongFessSender() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('🎵 SongFess sender stopped');
    }
}

module.exports = {
    startSongFessSender,
    stopSongFessSender,
    processQueue
};
