const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, default: 'note' }, // call, email, note
  content: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', activitySchema);
