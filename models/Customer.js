const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  status: { type: String, default: 'Lead' },
  value: { type: String, default: '$0' },
  priority: { type: String, default: 'Normal' }, // High, Normal, Low
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customer', customerSchema);
