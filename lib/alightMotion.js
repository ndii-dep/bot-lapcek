// lib/alightMotion.js
// Alight Motion Premium Generator

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    BASE_URL: 'https://am.rafaelxd.my.id',
    OUTPUT_DIR: './alight-output',
    TIMEOUT: 60000
};

// Buat direktori output jika belum ada
if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
}

/**
 * Generate Alight Motion Premium
 * @param {string} email - Email untuk generate premium
 * @param {string|null} rawLink - Raw link dari email (untuk verifikasi)
 * @returns {Promise<Object>} - Hasil generate
 */
async function alightMotion(email, rawLink = null) {
    try {
        if (!email) {
            return { success: false, error: 'Email wajib diisi' };
        }

        // Validasi format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, error: 'Format email tidak valid' };
        }

        // Step 1: Kirim magic link
        const sendResult = await axios.post(`${CONFIG.BASE_URL}/api/send`, {
            email: email
        }, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
            },
            timeout: CONFIG.TIMEOUT
        });

        // Jika ada rawLink, langsung verifikasi
        if (rawLink) {
            const verifyResult = await axios.post(`${CONFIG.BASE_URL}/api/verify`, {
                email: email,
                rawLink: rawLink
            }, {
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
                },
                timeout: CONFIG.TIMEOUT
            });

            const result = {
                success: true,
                email: email,
                message: verifyResult.data.message || 'Account verified successfully',
                oobCode: verifyResult.data.oobCode || null,
                idToken: verifyResult.data.idToken || null,
                userProfile: verifyResult.data.userProfile || null,
                premium: true,
                duration: '1 Tahun'
            };

            // Simpan hasil ke file
            const outputPath = path.join(CONFIG.OUTPUT_DIR, `alight_${Date.now()}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

            return result;
        }

        // Return hasil step 1
        return {
            success: true,
            email: email,
            message: sendResult.data.message || 'Link berhasil dikirim',
            orderCode: sendResult.data.orderCode || null,
            instructions: [
                'Buka inbox email (cek folder Spam juga)',
                'Cari email dari "Alight Motion" / "Alight Creative"',
                'Tekan-tahan tombol "Login ke Alight Creative", pilih "Salin URL"',
                'Jangan klik langsung — copy link doang',
                'Kirim link yang dicopy untuk verifikasi'
            ]
        };

    } catch (error) {
        console.error('AlightMotion Error:', error.message);
        
        if (error.response) {
            return {
                success: false,
                error: error.response.data?.message || `Server error: ${error.response.status}`
            };
        }
        
        if (error.code === 'ECONNABORTED') {
            return {
                success: false,
                error: 'Request timeout, server mungkin sibuk. Coba lagi nanti.'
            };
        }
        
        return {
            success: false,
            error: error.message || 'Terjadi kesalahan tidak diketahui'
        };
    }
}

module.exports = { alightMotion };
