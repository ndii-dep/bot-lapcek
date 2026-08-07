async function buildCarousel(products) {
    const carouselCards = [];
    
    for (const product of products) {
        const card = {
            title: product.name,
            description: `💰 ${product.priceDisplay}\n⏱️ ${product.duration}\n\n${product.description.slice(0, 100)}...`,
            media: product.image || 'https://files.catbox.moe/default-product.jpg',
            buttons: [
                { buttonId: `/buy ${product.id}`, buttonText: { displayText: '🛒 Order' }, type: 1 },
                { buttonId: `/detail ${product.id}`, buttonText: { displayText: '📋 Detail' }, type: 1 }
            ]
        };
        carouselCards.push(card);
    }
    
    return carouselCards;
}

function formatCarouselText(products, page = 0, perPage = 5) {
    const start = page * perPage;
    const end = start + perPage;
    const pageProducts = products.slice(start, end);
    
    let text = `🛍️ *FESTIVESHOP ID CATALOG*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📄 Halaman ${page + 1}/${Math.ceil(products.length / perPage)}\n\n`;
    
    pageProducts.forEach(p => {
        text += `🆔 \`${p.id}\`\n`;
        text += `📌 *${p.name}*\n`;
        text += `💰 ${p.priceDisplay}\n`;
        text += `⏱️ ${p.duration}\n`;
        text += `📝 ${p.description.slice(0, 60)}...\n\n`;
    });
    
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💡 /buy <id> | /detail <id> | /catalog ${page + 2}`;
    
    return text;
}

module.exports = { buildCarousel, formatCarouselText };
