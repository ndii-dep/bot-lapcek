const { getPaymentMethods, addBuyer, updateBuyer, getBuyerById, getBuyerByNumber, getTopBuyers } = require('./dbManager');
const { formatPaymentMethods, formatOrderInvoice, createThanksCanvas } = require('./payment');

const CATALOG = [
    {
        id: 'edit-foto',
        category: '🎨 Jasa Edit',
        name: 'Edit Foto Profesional',
        price: 10000,
        priceDisplay: 'Rp10.000 - Rp50.000',
        description: 'Edit foto profesional: retouch, color grading, manipulasi, restorasi.',
        features: ['Color grading', 'Retouch wajah', 'Background removal', 'Foto produk'],
        duration: '1-24 jam',
        image: 'https://files.catbox.moe/9c9sax.png'
    },
    {
        id: 'poster',
        category: '🎨 Jasa Edit',
        name: 'Desain Poster',
        price: 15000,
        priceDisplay: 'Rp15.000 - Rp75.000',
        description: 'Desain poster event, promosi, film, musik, dan lainnya.',
        features: ['Poster event', 'Poster promosi', 'Poster film/musik', 'Multiple revisi'],
        duration: '1-48 jam',
        image: 'https://files.catbox.moe/9c9sax.png'
    },
    {
        id: 'feed-instagram',
        category: '🎨 Jasa Edit',
        name: 'Feed/Grid Instagram',
        price: 20000,
        priceDisplay: 'Rp20.000 - Rp100.000',
        description: 'Desain feed Instagram aesthetic 3/6/9 grid.',
        features: ['3/6/9 grid', 'Template matching', 'Color palette', 'Branding'],
        duration: '1-3 hari',
        image: 'https://files.catbox.moe/9c9sax.png'
    },
    {
        id: 'edit-video',
        category: '🎨 Jasa Edit',
        name: 'Edit Video',
        price: 25000,
        priceDisplay: 'Rp25.000 - Rp150.000',
        description: 'Edit video cinematic, color grading, transition, text animation.',
        features: ['Color grading', 'Transition', 'Text animation', 'Subtitle'],
        duration: '1-3 hari',
        image: 'https://files.catbox.moe/9c9sax.png'
    },
    {
        id: 'panel-1gb',
        category: '🖥️ Panel Pterodactyl',
        name: 'Panel 1GB RAM',
        price: 2000,
        priceDisplay: 'Rp2.000/bulan',
        description: 'Panel Pterodactyl RAM 1GB. Cocok untuk bot WA/Discord.',
        features: ['RAM 1GB', 'CPU 50%', 'Storage 5GB', 'Support 24/7'],
        duration: '1 bulan',
        image: 'https://files.catbox.moe/9c9sax.png'
    },
    {
        id: 'panel-2gb',
        category: '🖥️ Panel Pterodactyl',
        name: 'Panel 2GB RAM',
        price: 4000,
        priceDisplay: 'Rp4.000/bulan',
        description: 'Panel Pterodactyl RAM 2GB untuk bot complex.',
        features: ['RAM 2GB', 'CPU 75%', 'Storage 10GB', 'Support 24/7'],
        duration: '1 bulan',
        image: 'https://files.catbox.moe/9c9sax.png'
    },
    {
        id: 'panel-unli',
        category: '🖥️ Panel Pterodactyl',
        name: 'Panel Unlimited',
        price: 25000,
        priceDisplay: 'Rp25.000/bulan',
        description: 'Panel Pterodactyl resource unlimited.',
        features: ['RAM Unlimited', 'CPU Unlimited', 'Storage Unlimited', 'Support VIP'],
        duration: '1 bulan',
        image: 'https://files.catbox.moe/9c9sax.png'
    },
    {
        id: 'web-landing',
        category: '💻 Jasa Website',
        name: 'Landing Page',
        price: 10000,
        priceDisplay: 'Rp10.000 - Rp50.000',
        description: 'Landing page profesional untuk bisnis/produk.',
        features: ['Responsive', 'SEO friendly', 'Fast loading', 'Kontak form'],
        duration: '1-3 hari',
        image: 'https://files.catbox.moe/9c9sax.png'
    }
];

function getCatalog() { return CATALOG; }
function getProductById(id) { return CATALOG.find(p => p.id === id) || null; }
function getCategories() { return [...new Set(CATALOG.map(p => p.category))]; }

module.exports = {
    getCatalog, getProductById, getCategories,
    addBuyer, updateBuyer, getBuyerById, getBuyerByNumber, getTopBuyers,
    formatPaymentMethods, formatOrderInvoice, createThanksCanvas,
    getPaymentMethods
};
