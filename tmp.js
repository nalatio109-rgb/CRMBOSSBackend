require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm').then(async () => {
  await User.updateOne({ email: 'admin@latio.io' }, { $set: { email: 'admin@bossdoor.vn' } });
  console.log('Updated user email in DB');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
