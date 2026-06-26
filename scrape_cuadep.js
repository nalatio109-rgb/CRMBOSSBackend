require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const Product = require('./models/Product');

async function scrapePage(pageNumber) {
  const url = pageNumber === 1 
    ? 'https://cuadepdanang.com/cua-hang/' 
    : `https://cuadepdanang.com/cua-hang/page/${pageNumber}/`;
  
  console.log(`Đang tải trang ${pageNumber}: ${url}`);
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);
  const products = [];

  $('li.product').each((i, el) => {
    const title = $(el).find('.woocommerce-loop-product__title').text().trim() || $(el).find('h2').text().trim();
    
    // Parse price
    const priceTextRaw = $(el).find('.price').text().trim();
    let price = 0;
    if (priceTextRaw) {
      const parts = priceTextRaw.split('₫').map(p => p.replace(/[^\d]/g, '').trim()).filter(Boolean);
      if (parts.length > 0) {
        price = parseInt(parts[parts.length - 1], 10) || 0;
      }
    }
    
    // Parse image
    const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
    
    // Parse link
    const link = $(el).find('a').attr('href') || '';
    
    // Parse category
    let category = 'Phụ kiện';
    const lowerTitle = title.toLowerCase();
    const lowerLink = link.toLowerCase();
    
    if (lowerTitle.includes('cửa cuốn') || lowerLink.includes('cua-cuon')) {
      category = 'Cửa cuốn';
    } else if (lowerTitle.includes('cửa kéo') || lowerLink.includes('cua-keo') || lowerTitle.includes('cửa xếp')) {
      category = 'Cửa kéo';
    } else if (lowerTitle.includes('cổng') || lowerLink.includes('cong-tu-dong') || lowerTitle.includes('mái hiên')) {
      category = 'Cổng tự động';
    }
    
    products.push({
      name: title,
      price: price,
      imageUrl: img,
      link: link,
      category: category
    });
  });

  return products;
}

async function scrape() {
  const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_db';
  console.log(`Kết nối cơ sở dữ liệu...`);
  await mongoose.connect(dbUri);
  console.log('✅ Đã kết nối MongoDB thành công.');

  let allProducts = [];
  for (let page = 1; page <= 3; page++) {
    try {
      const pageProducts = await scrapePage(page);
      console.log(`Trang ${page} tìm thấy ${pageProducts.length} sản phẩm.`);
      allProducts = allProducts.concat(pageProducts);
    } catch (err) {
      console.error(`❌ Lỗi tải trang ${page}:`, err.message);
    }
  }

  console.log(`\n--- BẮT ĐẦU NHẬP DỮ LIỆU (${allProducts.length} sản phẩm) ---`);
  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of allProducts) {
    if (!item.name || item.name.length < 3) {
      skippedCount++;
      continue;
    }

    try {
      // Check if product exists by name (case-insensitive exact match)
      const escapedName = item.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const exists = await Product.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });

      if (exists) {
        // Update product price & imageUrl if not set or zero
        let needsUpdate = false;
        const updateFields = {};

        if (exists.price === 0 && item.price > 0) {
          updateFields.price = item.price;
          needsUpdate = true;
        }
        if (!exists.imageUrl && item.imageUrl) {
          updateFields.imageUrl = item.imageUrl;
          needsUpdate = true;
        }
        if (exists.category === 'Phụ kiện' && item.category !== 'Phụ kiện') {
          updateFields.category = item.category;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await Product.updateOne({ _id: exists._id }, { $set: updateFields });
          updatedCount++;
          console.log(`🔄 Cập nhật: "${item.name}" -> Price: ${updateFields.price || exists.price}, Category: ${updateFields.category || exists.category}`);
        } else {
          skippedCount++;
          // console.log(`⏭️ Bỏ qua (Đã tồn tại): "${item.name}"`);
        }
      } else {
        // Generate a unique code
        let code;
        let isUnique = false;
        while (!isUnique) {
          code = `PROD-${Math.floor(Math.random() * 90000) + 10000}`;
          const duplicate = await Product.findOne({ code });
          if (!duplicate) {
            isUnique = true;
          }
        }

        await Product.create({
          code,
          name: item.name,
          category: item.category,
          price: item.price,
          imageUrl: item.imageUrl,
          unit: 'cái',
          warrantyMonths: 12,
          description: `Sản phẩm nhập khẩu chính hãng từ Cửa Đẹp Đà Nẵng: ${item.link}`
        });

        importedCount++;
        console.log(`✅ Thêm mới: "${item.name}" (${code}) - ${item.price.toLocaleString('vi-VN')} đ - Danh mục: ${item.category}`);
      }
    } catch (dbErr) {
      console.error(`❌ Lỗi khi xử lý sản phẩm "${item.name}":`, dbErr.message);
    }
  }

  console.log(`\n--- KẾT THÚC CÀO DỮ LIỆU ---`);
  console.log(`Tổng số sản phẩm quét được: ${allProducts.length}`);
  console.log(`Thêm mới thành công   : ${importedCount}`);
  console.log(`Cập nhật thành công   : ${updatedCount}`);
  console.log(`Bỏ qua/Không thay đổi : ${skippedCount}`);

  mongoose.connection.close();
  console.log('🔌 Đã đóng kết nối MongoDB.');
  process.exit(0);
}

scrape();
