const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Draft', enum: ['Draft', 'Sent', 'Paid', 'Cancelled'] },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
