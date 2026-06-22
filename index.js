const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Customer = require('./models/Customer');
const Deal = require('./models/Deal');
const Activity = require('./models/Activity');
const User = require('./models/User');
const Notification = require('./models/Notification');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Warranty = require('./models/Warranty');
const auth = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_db';
const JWT_SECRET = process.env.JWT_SECRET || 'latio_secret_key_123';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// --- AUTH ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ message: 'Thông tin đăng nhập không đúng' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- NOTIFICATIONS ---
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifs = await Notification.find().sort({ createdAt: -1 }).limit(10);
    res.json(notifs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/notifications/read-all', auth, async (req, res) => {
  await Notification.updateMany({ isRead: false }, { isRead: true });
  res.json({ message: 'Updated' });
});

// --- CUSTOMERS ---
app.get('/api/customers', auth, async (req, res) => {
  res.json(await Customer.find().sort({ createdAt: -1 }));
});

app.post('/api/customers', auth, async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    // Create notification
    await new Notification({ title: 'Khách hàng mới', message: `Khách hàng ${customer.name} vừa được thêm vào hệ thống.`, type: 'info' }).save();
    res.status(201).json(customer);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.delete('/api/customers/:id', auth, async (req, res) => {
  await Customer.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// --- DEALS ---
app.get('/api/deals', auth, async (req, res) => {
  res.json(await Deal.find().populate('product'));
});

app.put('/api/deals/:id', auth, async (req, res) => {
  const updated = await Deal.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (req.body.stage === 'Closed') {
    await new Notification({ title: 'Chốt hợp đồng!', message: `Deal "${updated.title}" đã được chốt thành công.`, type: 'success' }).save();
  }
  res.json(updated);
});

// --- ACTIVITIES ---
app.get('/api/activities/:customerId', auth, async (req, res) => {
  res.json(await Activity.find({ customerId: req.params.customerId }).sort({ date: -1 }));
});

app.post('/api/activities', auth, async (req, res) => {
  res.status(201).json(await new Activity(req.body).save());
});

// --- PRODUCTS ---
app.get('/api/products', auth, async (req, res) => {
  res.json(await Product.find().sort({ createdAt: -1 }));
});

app.post('/api/products', auth, async (req, res) => {
  try {
    const product = new Product(req.body);
    res.status(201).json(await product.save());
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.put('/api/products/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.delete('/api/products/:id', auth, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// --- ORDERS ---
app.get('/api/orders', auth, async (req, res) => {
  res.json(await Order.find().populate('customerId dealId items.productId').sort({ createdAt: -1 }));
});

app.post('/api/deals', auth, async (req, res) => {
  try {
    const deal = new Deal(req.body);
    res.status(201).json(await deal.save());
  } catch (err) { 
    console.error("Deal Save Error:", err);
    res.status(400).json({ message: err.message }); 
  }
});

app.post('/api/orders', auth, async (req, res) => {
  try {
    const order = new Order(req.body);
    res.status(201).json(await order.save());
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// --- WARRANTIES ---
app.get('/api/warranties', auth, async (req, res) => {
  res.json(await Warranty.find().populate('customerId dealId').sort({ createdAt: -1 }));
});

app.post('/api/warranties', auth, async (req, res) => {
  try {
    const warranty = new Warranty(req.body);
    res.status(201).json(await warranty.save());
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.put('/api/warranties/:id', auth, async (req, res) => {
  try {
    const warranty = await Warranty.findById(req.params.id);
    if (!warranty) return res.status(404).json({ message: 'Warranty not found' });
    Object.assign(warranty, req.body);
    res.json(await warranty.save());
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
