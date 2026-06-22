const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  category: { type: String, default: 'Phụ kiện' }, // Cửa cuốn, Cửa kéo, Phụ kiện, Motor...
  unit: { type: String, default: 'cái' }, // m2, bộ, cái
  warrantyMonths: { type: Number, default: 12 },
  price: { type: Number, required: true },
  imageUrl: { type: String },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
