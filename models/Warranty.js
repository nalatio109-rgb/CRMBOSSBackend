const mongoose = require('mongoose');

const warrantySchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
  productName: { type: String, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  status: { type: String, default: 'Active', enum: ['Active', 'Expired'] },
  issuesLog: [{
    date: { type: Date, default: Date.now },
    issue: { type: String },
    resolution: { type: String }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Warranty', warrantySchema);
