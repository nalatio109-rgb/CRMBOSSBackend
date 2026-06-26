const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  birthday: { type: Date },
  status: { type: String, default: 'Lead' },
  value: { type: String, default: '$0' },
  priority: { type: String, default: 'Normal' }, // High, Normal, Low
  source: { type: String, default: 'Facebook' }, // Facebook, Zalo, TikTok, Google, Website, Hotline
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customer', customerSchema);
