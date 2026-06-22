require('dotenv').config();
const mongoose = require('mongoose');
const Deal = require('./models/Deal');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const deals = await Deal.find({});
  console.log('Total deals:', deals.length);
  console.log(deals.map(d => d.title));
  process.exit(0);
});
