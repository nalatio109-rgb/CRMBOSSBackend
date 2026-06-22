require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');
const Product = require('./models/Product');

async function scrape() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_db');
  console.log('Connected to DB');

  let updatedCount = 0;
  
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
        const nameRaw = $(el).find('img').attr('alt') || $(el).text().trim();
        const nameClean = nameRaw.split('-').join(' ').trim();
        let title = nameClean.charAt(0).toUpperCase() + nameClean.slice(1);
        
        const anchorText = $(el).find('a').not('a:has(img)').first().text().trim();
        if (anchorText) title = anchorText;
        else {
           const href = $(el).find('a').attr('href') || '';
           const slug = href.split('/').filter(Boolean).pop() || '';
           if (slug) title = slug.replace(/-/g, ' ').toUpperCase();
        }
        
        if (!title || title.length < 3) continue;
        
        // Extract Image URL
        const imageUrl = $(el).find('img').attr('src') || '';
        
        if (imageUrl) {
          // Update the product if it exists
          const result = await Product.updateOne(
            { name: { $regex: new RegExp(title, 'i') } },
            { $set: { imageUrl: imageUrl } }
          );
          if (result.modifiedCount > 0) {
            updatedCount++;
            console.log(`Updated Image: ${title}`);
          }
        }
      }
    } catch (err) {
      console.error(`Error on page ${page}:`, err.message);
    }
  }
  
  console.log(`Finished! Updated ${updatedCount} products with images.`);
  process.exit(0);
}

scrape();
