const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  title: { type: String, required: true },
  customer: { type: String, required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  siteAddress: { type: String },
  dimensions: { type: String }, // e.g., 3x4m
  assignee: { type: String }, // e.g., Đội thi công A
  value: { type: String, required: true },
  paidAmount: { type: Number, default: 0 },
  expectedRevenue: { type: Number, default: 0 },
  probability: { type: Number, default: 10 },
  closingDate: { type: Date },
  stage: { type: String, default: 'Báo giá' }, // Báo giá, Thi công, Hoàn thành
  priority: { type: String, default: 'Normal' },
  isArchived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Deal', dealSchema);
