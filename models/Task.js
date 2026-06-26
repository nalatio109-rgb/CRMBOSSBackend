const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  time: { type: String, required: true },
  done: { type: Boolean, default: false },
  type: { type: String, default: 'task' }, // 'task' or 'sms_campaign'
  message: { type: String, default: '' },
  sentCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);
