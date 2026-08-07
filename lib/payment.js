const { getPaymentMethods, addBuyer, updateBuyer, getBuyerById } = require('./dbManager');
const { createCanvas } = require('@napi-rs/canvas');

function formatPaymentMethods() {
    const methods = getPaymentMethods();
    let text = `💳 *METODE PEMBAYARAN*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    methods.forEach((m, i) => {
        const typeIcon = m.type === 'qris' ? '📱' : m.type === 'ewallet' ? '💳' : '🏦';
        text += `${i + 1}. ${typeIcon} *${m.name}*\n   📞 ${m.number}\n\n`;
    });
    
    text += `💡 *Cara Bayar:*\n` +
            `1. Transfer ke salah satu metode di atas\n` +
            `2. Kirim bukti pembayaran ke owner\n` +
            `3. Admin akan verifikasi dan proses order\n\n` +
            `⚠️ Pembayaran dalam 1x24 jam`;
    
    return text;
}

function formatOrderInvoice(order, buyer) {
    let text = `🧾 *INVOICE PEMBAYARAN*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🆔 Order: ${order.id}\n`;
    text += `🛍️ Produk: ${order.productName}\n`;
    text += `💰 Harga: ${order.productPrice}\n`;
    text += `📅 Tanggal: ${new Date(order.createdAt).toLocaleString('id-ID')}\n`;
    text += `👤 Customer: ${order.customerName}\n`;
    text += `📱 No: ${order.customerNumber}\n\n`;
    text += `🏷️ *Status Pembayaran:* ${buyer.paymentStatus === 'paid' ? '✅ LUNAS' : '⏳ BELUM BAYAR'}\n\n`;
    text += formatPaymentMethods();
    
    return text;
}

async function createThanksCanvas(buyerName, productName, channelLink) {
    const width = 800;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#11998e');
    gradient.addColorStop(0.5, '#38ef7d');
    gradient.addColorStop(1, '#00b09b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 50 + 10, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 THANK YOU! 🎉', width / 2, 120);
    
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText(buyerName, width / 2, 190);
    
    ctx.font = '22px Arial, sans-serif';
    ctx.fillText(`Pesanan "${productName}" telah selesai!`, width / 2, 240);
    
    ctx.font = '18px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('Terima kasih telah berbelanja di', width / 2, 300);
    
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('🛍️ FestiveShopID', width / 2, 340);
    
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Jangan lupa follow channel kami!', width / 2, 390);
    ctx.fillText(channelLink, width / 2, 420);
    
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText(new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), width / 2, 470);
    
    return canvas.toBuffer('image/jpeg', 85);
}

module.exports = {
    formatPaymentMethods,
    formatOrderInvoice,
    createThanksCanvas
};
