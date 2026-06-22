require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');
const Product = require('./models/Product');

async function scrape() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_db');
  console.log('Connected to DB');

  let importedCount = 0;
  
  // We'll scrape up to 3 pages
  for (let page = 1; page <= 3; page++) {
    console.log(`Scraping page ${page}...`);
    const data = {
      action: 'loadmore',
      query: JSON.stringify({"post_type":"product","posts_per_page":20,"order":"DESC"}),
      page: page
    };
    
    try {
      const res = await axios.post('https://bossdoordanang.com.vn/wp-admin/admin-ajax.php', qs.stringify(data), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
      });
      
      const $ = cheerio.load(res.data);
      const items = $('.item');
      
      if (items.length === 0) break;
      
      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        // Parse Title
        const nameRaw = $(el).find('img').attr('alt') || $(el).text().trim();
        const nameClean = nameRaw.split('-').join(' ').trim();
        // Since the AJAX response HTML is limited in text, we extract from alt tag
        let title = nameClean.charAt(0).toUpperCase() + nameClean.slice(1);
        
        // Sometimes alt is uppercase or hyphenated. Let's find an <a> tag text
        const anchorText = $(el).find('a').not('a:has(img)').first().text().trim();
        if (anchorText) title = anchorText;
        else {
           // fallback to regexing the link
           const href = $(el).find('a').attr('href') || '';
           const slug = href.split('/').filter(Boolean).pop() || '';
           if (slug) {
             title = slug.replace(/-/g, ' ').toUpperCase();
           }
        }
        
        if (!title || title.length < 3) continue;
        
        // Default category based on name
        let category = 'Phụ kiện';
        if (title.toLowerCase().includes('cửa cuốn')) category = 'Cửa cuốn';
        if (title.toLowerCase().includes('cửa kéo')) category = 'Cửa kéo';
        if (title.toLowerCase().includes('cổng')) category = 'Cổng tự động';
        
        // Price default
        const price = 0;
        
        // Code default
        const code = `PROD-${Math.floor(Math.random()*90000)+10000}`;
        
        // Check if exists
        const exists = await Product.findOne({ name: { $regex: new RegExp(title, 'i') } });
        if (!exists) {
          await Product.create({ code, name: title, category, price, warrantyMonths: 12 });
          importedCount++;
          console.log(`Imported: ${title}`);
        }
      }
    } catch (err) {
      console.error(`Error on page ${page}:`, err.message);
    }
  }
  
  console.log(`Finished scraping! Imported ${importedCount} products.`);
  process.exit(0);
}

scrape();
