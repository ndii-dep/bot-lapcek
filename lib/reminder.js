// lib/reminder.js
// Sistem reminder otomatis - kirim 3x sehari

const schoolData = require('./schoolData');

class ReminderSystem {
    constructor() {
        this.sock = null;
        this.checkInterval = null;
        this.lastSentDate = null;
        this.sentTimes = {}; // Track pengiriman per sesi
    }
    
    /**
     * Inisialisasi sistem reminder
     * @param {Object} sock - WhatsApp socket
     */
    init(sock) {
        this.sock = sock;
        
        console.log('═══════════════════════════════════════');
        console.log('⏰ AUTOMATIC REMINDER SYSTEM');
        console.log('═══════════════════════════════════════');
        console.log('📋 Status: ACTIVE');
        console.log('🕐 Jadwal kirim:');
        console.log('   🌅 Siang : 12:00 WIB');
        console.log('   ☀️ Sore  : 16:00 WIB');
        console.log('   🌙 Malam : 20:00 WIB');
        console.log('📅 Hanya hari Senin-Jumat');
        console.log('📢 Kirim ke: Channel & Grup');
        console.log('═══════════════════════════════════════\n');
        
        // Check setiap 30 detik
        this.checkInterval = setInterval(() => {
            this.checkAndSendReminder();
        }, 30000);
        
        // Langsung check pertama kali
        setTimeout(() => {
            this.checkAndSendReminder();
        }, 3000);
    }
    
    /**
     * Check waktu dan kirim reminder jika waktunya
     */
    async checkAndSendReminder() {
        if (!this.sock) return;
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        const currentDate = now.toISOString().split('T')[0];
        const dayIndex = now.getDay(); // 0=Minggu, 1=Senin...6=Sabtu
        
        // Reset sent times setiap hari baru
        if (this.lastSentDate !== currentDate) {
            this.sentTimes = {};
            this.lastSentDate = currentDate;
            console.log(`📅 Tanggal baru: ${currentDate}`);
        }
        
        // Jadwal kirim
        const sendSchedules = [
            { time: '12:00', label: '🌅 SIANG' },
            { time: '16:00', label: '☀️ SORE' },
            { time: '20:00', label: '🌙 MALAM' },
        ];
        
        // Cek apakah sekarang waktunya kirim
        for (const schedule of sendSchedules) {
            if (currentTime === schedule.time && !this.sentTimes[schedule.time]) {
                
                // Cek besok hari apa
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowDayIndex = tomorrow.getDay();
                
                // Skip jika besok Sabtu atau Minggu
                if (tomorrowDayIndex === 0 || tomorrowDayIndex === 6) {
                    console.log(`⏭️ ${schedule.label} - Besok libur, skip reminder`);
                    this.sentTimes[schedule.time] = true;
                    return;
                }
                
                // Kirim reminder
                console.log(`\n🔔 ${schedule.label} - MENGIRIM REMINDER BESOK`);
                await this.sendReminder(schedule.label);
                
                // Tandai sudah dikirim
                this.sentTimes[schedule.time] = true;
            }
        }
    }
    
    /**
     * Kirim reminder ke channel dan grup
     * @param {string} label - Label waktu (SIANG/SORE/MALAM)
     */
    async sendReminder(label) {
        try {
            // Ambil data reminder besok
            const reminderData = schoolData.getTomorrowReminder();
            
            if (reminderData.isHoliday) {
                console.log('⏭️ Besok libur, tidak kirim reminder');
                return;
            }
            
            // Format teks reminder
            const reminderText = schoolData.formatReminderText(reminderData);
            
            let sentToChannel = false;
            let sentToGroup = false;
            
            // Kirim ke channel
            if (global.botConfig.channelId && 
                global.botConfig.channelId !== '120363000000000000@newsletter') {
                try {
                    await this.sock.sendMessage(global.botConfig.channelId, { 
                        text: reminderText 
                    });
                    sentToChannel = true;
                    console.log('   ✅ Terkirim ke Channel');
                } catch (err) {
                    console.log('   ❌ Gagal kirim ke Channel:', err.message);
                }
            }
            
            // Kirim ke grup
            if (global.botConfig.groupId && 
                global.botConfig.groupId !== '120363000000000000@g.us') {
                try {
                    await this.sock.sendMessage(global.botConfig.groupId, { 
                        text: reminderText 
                    });
                    sentToGroup = true;
                    console.log('   ✅ Terkirim ke Grup');
                } catch (err) {
                    console.log('   ❌ Gagal kirim ke Grup:', err.message);
                }
            }
            
            // Log hasil
            if (sentToChannel || sentToGroup) {
                console.log(`✅ [${label}] Reminder berhasil dikirim - ${reminderData.day}`);
            } else {
                console.log('⚠️  Reminder tidak terkirim - Channel/Grup belum dikonfigurasi');
                console.log('💡 Tips: Update channelId dan groupId di index.js');
            }
            
        } catch (err) {
            console.error('❌ Error saat kirim reminder:', err.message);
        }
    }
    
    /**
     * Kirim reminder manual (via command)
     */
    async sendManualReminder() {
        console.log('\n📤 MENGIRIM REMINDER MANUAL...');
        await this.sendReminder('MANUAL');
    }
    
    /**
     * Stop reminder system
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            console.log('⏰ Reminder system stopped');
        }
    }
}

// Export singleton
module.exports = new ReminderSystem();
