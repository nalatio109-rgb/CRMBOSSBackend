require('dotenv').config();
const mongoose = require('mongoose');
const Deal = require('./models/Deal');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const deal = new Deal({
      title: 'Remote Test',
      customer: 'Remote Cust',
      value: '2000',
      paidAmount: null
    });
    await deal.save();
    console.log('Saved successfully');
  } catch (err) {
    console.error('Error saving:', err);
  }
  process.exit(0);
});
