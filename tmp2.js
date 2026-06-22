require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_db').then(async () => {
  const result = await User.updateOne({ email: 'admin@latio.io' }, { $set: { email: 'admin@bossdoor.vn', name: 'Boss Admin' } });
  console.log('Update result:', result);
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
