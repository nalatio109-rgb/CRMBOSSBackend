const mongoose = require('mongoose');
const Deal = require('./models/Deal');

mongoose.connect('mongodb://localhost:27017/crm_db').then(async () => {
  const deals = await Deal.find({});
  console.log('Total deals:', deals.length);
  console.log(deals.slice(-5));
  process.exit(0);
});
