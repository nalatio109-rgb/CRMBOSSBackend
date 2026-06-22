require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const noImg = await Product.find({ $or: [{ imageUrl: { $exists: false } }, { imageUrl: null }] });
  console.log(`Missing images: ${noImg.length}`);
  noImg.forEach(p => console.log(p.name));
  process.exit(0);
});
