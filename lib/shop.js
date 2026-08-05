const fs = require('fs');
const path = require('path');

const CONFIG = {
    DATA_FILE: './data/shop.json',
    SHOP_NAME: '🛍️ FestiveShopID',
    SHOP_TAGLINE: 'Your Trusted Digital Creative Partner',
    PREFIX: '/',
    OWNER_NUMBER: global.botConfig?.noOwner || '085800650661'
};

let shopData = {
    status: 'on',
    orders: [],
    stats: {
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        lastOrder: null
    }
};

const CATALOG = [
    {
        id: 'edit-foto',
        category: '🎨 Jasa Edit',
        name: 'Edit Foto Profesional',
        price: 10000,
        priceDisplay: 'Rp10.000 - Rp50.000',
        description: 'Edit foto profesional untuk berbagai kebutuhan. Mulai dari retouch, color grading, manipulasi, hingga restorasi foto lama.',
        features: ['Color grading', 'Retouch wajah', 'Background removal', 'Foto produk', 'Restorasi foto lama'],
        duration: '1-24 jam'
    },
    {
        id: 'poster',
        category: '🎨 Jasa Edit',
        name: 'Desain Poster',
        price: 15000,
        priceDisplay: 'Rp15.000 - Rp75.000',
        description: 'Desain poster untuk event, promosi, pengumuman, poster film, poster musik, dan lainnya.',
        features: ['Poster event', 'Poster promosi', 'Poster film/musik', 'Poster ilmiah', 'Multiple revisi'],
        duration: '1-48 jam'
    },
    {
        id: 'feed-instagram',
        category: '🎨 Jasa Edit',
        name: 'Feed/Grid Instagram',
        price: 20000,
        priceDisplay: 'Rp20.000 - Rp100.000',
        description: 'Desain feed Instagram aesthetic 3/6/9 grid. Termasuk konsep, layout, dan template matching.',
        features: ['3/6/9 grid design', 'Template matching', 'Color palette', 'Branding konsisten', 'Story template'],
        duration: '1-3 hari'
    },
    {
        id: 'edit-video',
        category: '🎨 Jasa Edit',
        name: 'Edit Video',
        price: 25000,
        priceDisplay: 'Rp25.000 - Rp150.000',
        description: 'Edit video untuk konten, cinematic, color grading, transition, text animation, dan lainnya.',
        features: ['Color grading', 'Transition', 'Text animation', 'Audio sync', 'Subtitle', 'Durasi < 15 menit'],
        duration: '1-3 hari'
    },
    {
        id: 'panel-1gb',
        category: '🖥️ Panel Pterodactyl',
        name: 'Panel 1GB RAM',
        price: 2000,
        priceDisplay: 'Rp2.000',
        description: 'Panel Pterodactyl dengan RAM 1GB. Cocok untuk bot WhatsApp, bot Discord, atau server kecil.',
        features: ['RAM 1GB', 'CPU 50%', 'Storage 5GB', 'Backup mingguan', 'Support 24/7'],
        duration: '1 bulan'
    },
    {
        id: 'panel-2gb',
        category: '🖥️ Panel Pterodactyl',
        name: 'Panel 2GB RAM',
        price: 4000,
        priceDisplay: 'Rp4.000',
        description: 'Panel Pterodactyl RAM 2GB. Cocok untuk bot complex atau website kecil.',
        features: ['RAM 2GB', 'CPU 75%', 'Storage 10GB', 'Backup mingguan', 'Support 24/7'],
        duration: '1 bulan'
    },
    {
        id: 'panel-4gb',
        category: '🖥️ Panel Pterodactyl',
        name: 'Panel 4GB RAM',
        price: 8000,
        priceDisplay: 'Rp8.000',
        description: 'Panel Pterodactyl RAM 4GB. Untuk bot multiple, website, atau aplikasi.',
        features: ['RAM 4GB', 'CPU 100%', 'Storage 20GB', 'Backup mingguan', 'Support 24/7'],
        duration: '1 bulan'
    },
    {
        id: 'panel-8gb',
        category: '🖥️ Panel Pterodactyl',
        name: 'Panel 8GB RAM',
        price: 16000,
        priceDisplay: 'Rp16.000',
        description: 'Panel Pterodactyl RAM 8GB. Performa maksimal untuk project besar.',
        features: ['RAM 8GB', 'CPU 150%', 'Storage 40GB', 'Backup harian', 'Support prioritas'],
        duration: '1 bulan'
    },
    {
        id: 'panel-unli',
        category: '🖥️ Panel Pterodactyl',
        name: 'Panel Unlimited',
        price: 25000,
        priceDisplay: 'Rp25.000',
        description: 'Panel Pterodactyl dengan resource unlimited. No limit, full power!',
        features: ['RAM Unlimited', 'CPU Unlimited', 'Storage Unlimited', 'Backup harian', 'Support VIP'],
        duration: '1 bulan'
    },
    {
        id: 'web-landing',
        category: '💻 Jasa Website',
        name: 'Landing Page',
        price: 10000,
        priceDisplay: 'Rp10.000 - Rp50.000',
        description: 'Pembuatan landing page profesional untuk bisnis, produk, event, atau personal branding.',
        features: ['Responsive design', 'SEO friendly', 'Fast loading', '1 halaman', 'Kontak form'],
        duration: '1-3 hari'
    },
    {
        id: 'web-company',
        category: '💻 Jasa Website',
        name: 'Website Company Profile',
        price: 50000,
        priceDisplay: 'Rp50.000 - Rp200.000',
        description: 'Website company profile lengkap dengan multiple halaman dan fitur profesional.',
        features: ['Multi page', 'Responsive', 'Admin panel', 'SEO', 'Maintenance 1 bulan'],
        duration: '3-7 hari'
    },
    {
        id: 'web-toko',
        category: '💻 Jasa Website',
        name: 'Website Toko Online',
        price: 100000,
        priceDisplay: 'Rp100.000 - Rp500.000',
        description: 'Website toko online dengan sistem pembayaran dan manajemen produk.',
        features: ['Katalog produk', 'Payment gateway', 'Admin panel', 'Order management', 'Mobile friendly'],
        duration: '7-14 hari'
    }
];

function loadData() {
    try {
        if (fs.existsSync(CONFIG.DATA_FILE)) {
            const raw = fs.readFileSync(CONFIG.DATA_FILE, 'utf-8');
            shopData = JSON.parse(raw);
        }
    } catch (err) {
        console.error('Error loading shop data:', err);
    }
}

function saveData() {
    try {
        const dir = path.dirname(CONFIG.DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(shopData, null, 2));
    } catch (err) {
        console.error('Error saving shop data:', err);
    }
}

function generateOrderId() {
    const date = new Date();
    const y = date.getFullYear().toString().slice(-2);
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ORD${y}${m}${d}${h}${min}${rand}`;
}

function getShopStatus() {
    loadData();
    return shopData.status === 'on';
}

function toggleShop(status, by = 'Owner') {
    loadData();
    
    if (status === 'on' || status === 'off') {
        shopData.status = status;
        saveData();
        return { success: true, status: status };
    }
    
    return { success: false, error: 'Status tidak valid. Gunakan: on / off' };
}

function getCatalog() {
    return CATALOG;
}

function getProductById(id) {
    return CATALOG.find(p => p.id === id) || null;
}

function getProductsByCategory(category) {
    return CATALOG.filter(p => p.category === category);
}

function getCategories() {
    const cats = new Set();
    CATALOG.forEach(p => cats.add(p.category));
    return Array.from(cats);
}

function createOrder(productId, customerName, customerNumber, note = '') {
    loadData();
    
    const product = getProductById(productId);
    if (!product) return { success: false, error: 'Produk tidak ditemukan' };
    
    const order = {
        id: generateOrderId(),
        productId: productId,
        productName: product.name,
        productPrice: product.priceDisplay,
        category: product.category,
        customerName: customerName,
        customerNumber: customerNumber,
        note: note,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    shopData.orders.unshift(order);
    shopData.stats.totalOrders++;
    shopData.stats.pendingOrders = shopData.orders.filter(o => o.status === 'pending').length;
    shopData.stats.lastOrder = new Date().toISOString();
    
    if (shopData.orders.length > 100) {
        shopData.orders = shopData.orders.slice(0, 100);
    }
    
    saveData();
    
    return { success: true, order };
}

function getOrders(filter = 'all') {
    loadData();
    
    switch(filter) {
        case 'pending':
            return shopData.orders.filter(o => o.status === 'pending');
        case 'completed':
            return shopData.orders.filter(o => o.status === 'completed');
        case 'cancelled':
            return shopData.orders.filter(o => o.status === 'cancelled');
        default:
            return shopData.orders;
    }
}

function updateOrderStatus(orderId, status) {
    loadData();
    
    const order = shopData.orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Order tidak ditemukan' };
    
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    if (status === 'completed') shopData.stats.completedOrders++;
    shopData.stats.pendingOrders = shopData.orders.filter(o => o.status === 'pending').length;
    
    saveData();
    return { success: true, order };
}

function getShopStats() {
    loadData();
    return shopData.stats;
}

function formatCatalog(category = null) {
    const products = category ? getProductsByCategory(category) : CATALOG;
    const categories = category ? [category] : getCategories();
    
    let text = `🛍️ *FESTIVESHOP ID*\n`;
    text += `_Your Trusted Digital Creative Partner_\n\n`;
    text += `📋 *STATUS:* ${shopData.status === 'on' ? '🟢 BUKA' : '🔴 TUTUP'}\n\n`;
    
    categories.forEach(cat => {
        text += `📂 *${cat}*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        
        getProductsByCategory(cat).forEach(p => {
            text += `🆔 \`${p.id}\`\n`;
            text += `📌 ${p.name}\n`;
            text += `💰 ${p.priceDisplay}\n`;
            text += `⏱️ ${p.duration}\n\n`;
        });
    });
    
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💡 *Cara Order:*\n`;
    text += `/buy <id_produk> | <catatan>\n`;
    text += `Contoh: /buy edit-foto | Foto wisuda\n\n`;
    text += `🔍 /catalog <kategori> - Filter\n`;
    text += `📊 /stats - Statistik order\n`;
    text += `❓ /help - Bantuan`;
    
    return text;
}

function formatProductDetail(product) {
    let text = `🛍️ *${product.name}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📂 Kategori: ${product.category}\n`;
    text += `💰 Harga: ${product.priceDisplay}\n`;
    text += `⏱️ Estimasi: ${product.duration}\n\n`;
    text += `📝 *Deskripsi:*\n${product.description}\n\n`;
    text += `✨ *Fitur:*\n`;
    product.features.forEach(f => {
        text += `  ✅ ${f}\n`;
    });
    text += `\n💡 Order sekarang:\n`;
    text += `/buy ${product.id} | catatan`;
    
    return text;
}

function formatOrderDetail(order) {
    const statusEmoji = order.status === 'pending' ? '⏳' : 
                       order.status === 'completed' ? '✅' : '❌';
    
    let text = `📦 *ORDER DETAIL*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🆔 Order ID: ${order.id}\n`;
    text += `📅 Tanggal: ${new Date(order.createdAt).toLocaleString('id-ID')}\n`;
    text += `📌 Status: ${statusEmoji} ${order.status.toUpperCase()}\n\n`;
    text += `🛍️ Produk: ${order.productName}\n`;
    text += `📂 Kategori: ${order.category}\n`;
    text += `💰 Harga: ${order.productPrice}\n`;
    text += `👤 Customer: ${order.customerName}\n`;
    text += `📱 Kontak: ${order.customerNumber}\n`;
    
    if (order.note) {
        text += `📝 Catatan: ${order.note}\n`;
    }
    
    return text;
}

function formatOrderList(orders, title = '📦 DAFTAR ORDER') {
    if (orders.length === 0) {
        return '📦 *Belum ada order.*';
    }
    
    let text = `${title}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    orders.forEach((o, i) => {
        const emoji = o.status === 'pending' ? '⏳' : o.status === 'completed' ? '✅' : '❌';
        text += `${i + 1}. ${emoji} ${o.id}\n`;
        text += `   🛍️ ${o.productName}\n`;
        text += `   👤 ${o.customerName}\n`;
        text += `   📅 ${new Date(o.createdAt).toLocaleDateString('id-ID')}\n\n`;
    });
    
    return text;
}

module.exports = {
    getShopStatus,
    toggleShop,
    getCatalog,
    getProductById,
    getProductsByCategory,
    getCategories,
    createOrder,
    getOrders,
    updateOrderStatus,
    getShopStats,
    formatCatalog,
    formatProductDetail,
    formatOrderDetail,
    formatOrderList,
    CONFIG,
    CATALOG
};
