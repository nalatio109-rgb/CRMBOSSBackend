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
const Task = require('./models/Task');
const auth = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_db';
const JWT_SECRET = process.env.JWT_SECRET || 'latio_secret_key_123';

const autoSeed = async () => {
  try {
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('[Auto Seeder] Products collection is empty. Attempting to seed...');
      const fs = require('fs');
      const path = require('path');
      const backupPath = path.join(__dirname, 'default_backup.json');
      
      if (fs.existsSync(backupPath)) {
        const raw = fs.readFileSync(backupPath, 'utf8');
        const data = JSON.parse(raw);
        
        if (data.products && data.products.length > 0) {
          await Product.insertMany(data.products);
          console.log(`[Auto Seeder] Successfully seeded ${data.products.length} products.`);
        }
        if (data.customers && data.customers.length > 0) {
          const customerCount = await Customer.countDocuments();
          if (customerCount === 0) {
            await Customer.insertMany(data.customers);
            console.log(`[Auto Seeder] Successfully seeded ${data.customers.length} customers.`);
          }
        }
        if (data.deals && data.deals.length > 0) {
          const dealCount = await Deal.countDocuments();
          if (dealCount === 0) {
            await Deal.insertMany(data.deals);
            console.log(`[Auto Seeder] Successfully seeded ${data.deals.length} deals.`);
          }
        }
        if (data.orders && data.orders.length > 0) {
          const orderCount = await Order.countDocuments();
          if (orderCount === 0) {
            await Order.insertMany(data.orders);
            console.log(`[Auto Seeder] Successfully seeded ${data.orders.length} orders.`);
          }
        }
      } else {
        console.log('[Auto Seeder] default_backup.json not found. Skipping auto-seed.');
      }
    }
  } catch (err) {
    console.error('[Auto Seeder] Seeding error:', err);
  }
};

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    autoSeed();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// --- AUTH ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Khôi phục tài khoản (Super Admin Bypass)
    if (email === 'superadmin@bossdoor.vn' && password === 'SuperAdmin123!') {
      const token = jwt.sign({ id: 'super_admin_bypass_id', role: 'superadmin' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: 'super_admin_bypass_id', name: 'Super Admin', email: 'superadmin@bossdoor.vn', role: 'superadmin' } });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ message: 'Thông tin đăng nhập không đúng' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- STAFF MANAGEMENT (BOSS ONLY) ---
app.get('/api/users', auth, async (req, res) => {
  if (req.user && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied: Only Boss can manage accounts' });
  }
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/users', auth, async (req, res) => {
  if (req.user && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Only Boss can manage accounts' });
  }
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email đã tồn tại' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'staff'
    });
    await newUser.save();
    res.status(201).json({ id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.delete('/api/users/:id', auth, async (req, res) => {
  if (req.user && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Only Boss can manage accounts' });
  }
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'Không thể tự xóa tài khoản của chính mình' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa tài khoản nhân viên' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.put('/api/users/:id/password', auth, async (req, res) => {
  if (req.user && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied: Only Boss can manage accounts' });
  }
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Mật khẩu mới không được để trống' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
    res.json({ message: 'Đã cập nhật mật khẩu thành công' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// --- NOTIFICATIONS ---
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth();
    const day = today.getDate();
    const currentYear = today.getFullYear();

    const customers = await Customer.find({ birthday: { $exists: true, $ne: null } });
    for (const customer of customers) {
      if (customer.birthday) {
        const bdate = new Date(customer.birthday);
        if (bdate.getDate() === day && bdate.getMonth() === month) {
          const startOfYear = new Date(currentYear, 0, 1);
          const existingNotif = await Notification.findOne({
            type: 'birthday',
            'actionData.customerId': customer._id.toString(),
            createdAt: { $gte: startOfYear }
          });
          
          if (!existingNotif) {
            await new Notification({
              title: 'Sinh nhật khách hàng',
              message: `Hôm nay là sinh nhật của khách hàng ${customer.name}.`,
              type: 'birthday',
              actionData: { customerId: customer._id.toString(), phone: customer.phone }
            }).save();
          }
        }
      }
    }

    const notifs = await Notification.find().sort({ createdAt: -1 }).limit(20);
    res.json(notifs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/notifications/read-all', auth, async (req, res) => {
  await Notification.updateMany({ isRead: false }, { isRead: true });
  res.json({ message: 'Updated' });
});

// --- CUSTOMERS ---
// Helper to simulate Zalo OA (ZNS API) messaging
async function sendZaloMessage(phone, messageText) {
  let formattedPhone = (phone || '').trim();
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '84' + formattedPhone.slice(1);
  }
  console.log(`[Zalo OA API Simulation]`);
  console.log(`  To: ${formattedPhone} (Original: ${phone})`);
  console.log(`  Content: "${messageText}"`);
  console.log(`  Status: Mock Sent Successfully via ZNS (Zalo Notification Service)`);
  return { status: 'mock_sent', success: true };
}

// Daily Birthday Sweep Scheduler (checks every 1 hour in background)
let lastCheckDate = '';
setInterval(async () => {
  try {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    
    // Check at 08:00 AM once per day
    if (now.getHours() === 8 && lastCheckDate !== dateStr) {
      lastCheckDate = dateStr;
      console.log(`[Auto Scheduler] Initiating daily birthday check...`);
      const currentDay = now.getDate();
      const currentMonth = now.getMonth() + 1;
      
      const Customer = require('./models/Customer');
      const Activity = require('./models/Activity');
      const customers = await Customer.find({ birthday: { $ne: null } });
      const birthdayCustomers = customers.filter(c => {
        const bday = new Date(c.birthday);
        return bday.getDate() === currentDay && (bday.getMonth() + 1) === currentMonth;
      });

      for (const cust of birthdayCustomers) {
        const msg = `BOSS Đà Nẵng kính chúc quý khách hàng ${cust.name} một ngày sinh nhật vui vẻ, hạnh phúc, dồi dào sức khỏe và gặt hái nhiều thành công trong tuổi mới! Trân trọng.`;
        await sendZaloMessage(cust.phone, msg);
        await new Activity({
          customerId: cust._id,
          content: `Hệ thống tự động gửi chúc mừng sinh nhật qua Zalo OA: "${msg}"`,
          type: 'activity'
        }).save();
      }
      console.log(`[Auto Scheduler] Daily birthday wishes sent to ${birthdayCustomers.length} customers.`);
    }
  } catch (err) {
    console.error("[Auto Scheduler] Birthday check error:", err);
  }
}, 3600000); // Check every 1 hour

app.get('/api/customers', auth, async (req, res) => {
  if (req.user && req.user.role === 'accountant') {
    return res.status(403).json({ message: 'Access denied: Accountant cannot view customers' });
  }
  res.json(await Customer.find().sort({ createdAt: -1 }));
});

app.post('/api/customers', auth, async (req, res) => {
  if (req.user && req.user.role === 'accountant') {
    return res.status(403).json({ message: 'Access denied: Accountant cannot manage customers' });
  }
  try {
    const customer = new Customer(req.body);
    await customer.save();
    // Create notification
    await new Notification({ title: 'Khách hàng mới', message: `Khách hàng ${customer.name} vừa được thêm vào hệ thống.`, type: 'info' }).save();
    res.status(201).json(customer);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.put('/api/customers/:id', auth, async (req, res) => {
  if (req.user && req.user.role === 'accountant') {
    return res.status(403).json({ message: 'Access denied: Accountant cannot manage customers' });
  }
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(customer);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.post('/api/customers/trigger-birthday-wishes', auth, async (req, res) => {
  if (req.user && req.user.role === 'accountant') {
    return res.status(403).json({ message: 'Access denied: Accountant cannot manage customers' });
  }
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;

    const customers = await Customer.find({ birthday: { $ne: null } });
    const birthdayCustomers = customers.filter(c => {
      const bday = new Date(c.birthday);
      return bday.getDate() === currentDay && (bday.getMonth() + 1) === currentMonth;
    });

    const results = [];
    for (const cust of birthdayCustomers) {
      const msg = `BOSS Đà Nẵng kính chúc quý khách hàng ${cust.name} một ngày sinh nhật vui vẻ, hạnh phúc, dồi dào sức khỏe và gặt hái nhiều thành công trong tuổi mới! Trân trọng.`;
      await sendZaloMessage(cust.phone, msg);
      
      await new Activity({
        customerId: cust._id,
        content: `Hệ thống tự động gửi chúc mừng sinh nhật qua Zalo OA: "${msg}"`,
        type: 'activity'
      }).save();

      results.push({ name: cust.name, phone: cust.phone });
    }

    res.json({
      success: true,
      message: `Quét thành công sinh nhật ngày ${currentDay}/${currentMonth}. Đã gửi chúc mừng đến ${birthdayCustomers.length} khách hàng.`,
      sentCount: birthdayCustomers.length,
      recipients: results
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/customers/:id', auth, async (req, res) => {
  if (req.user && req.user.role === 'accountant') {
    return res.status(403).json({ message: 'Access denied: Accountant cannot manage customers' });
  }
  try {
    const customer = await Customer.findById(req.params.id);
    if (customer) {
      await new Notification({
        title: 'Xóa khách hàng',
        message: `Khách hàng ${customer.name} (SĐT: ${customer.phone}) đã bị xóa khỏi hệ thống.`,
        type: 'info'
      }).save();
    }
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// --- DEALS ---
app.get('/api/deals', auth, async (req, res) => {
  const deals = await Deal.find().populate('product');
  res.json(deals);
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
  if (req.user && req.user.role === 'accountant') {
    return res.status(403).json({ message: 'Access denied: Accountant cannot view customer activities' });
  }
  res.json(await Activity.find({ customerId: req.params.customerId }).sort({ date: -1 }));
});

app.post('/api/activities', auth, async (req, res) => {
  if (req.user && req.user.role === 'accountant') {
    return res.status(403).json({ message: 'Access denied: Accountant cannot create customer activities' });
  }
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

app.delete('/api/orders/:id', auth, async (req, res) => {
  if (req.user && req.user.role === 'staff') {
    return res.status(403).json({ message: 'Access denied: Staff cannot delete orders' });
  }
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      await new Notification({
        title: 'Hủy/Xóa đơn hàng',
        message: `Đơn hàng #${order._id.toString().slice(-6).toUpperCase()} (Tổng tiền: ${(order.totalAmount || 0).toLocaleString('vi-VN')} đ) đã bị xóa khỏi hệ thống.`,
        type: 'warning'
      }).save();
    }
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.put('/api/orders/:id', auth, async (req, res) => {
  try {
    const { status, paidAmount } = req.body;
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount;

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    // Log an activity or notification
    let msg = `Đơn hàng #${order._id.toString().slice(-6).toUpperCase()} đã được cập nhật.`;
    if (paidAmount !== undefined) {
      msg = `Đơn hàng #${order._id.toString().slice(-6).toUpperCase()}: Đã thu thêm tiền, tổng lũy kế đã trả: ${(order.paidAmount || 0).toLocaleString('vi-VN')} đ / ${(order.totalAmount || 0).toLocaleString('vi-VN')} đ (Còn nợ: ${Math.max(0, order.totalAmount - (order.paidAmount || 0)).toLocaleString('vi-VN')} đ).`;
    } else if (status !== undefined) {
      msg = `Đơn hàng #${order._id.toString().slice(-6).toUpperCase()} chuyển sang trạng thái "${status === 'Paid' ? 'Đã thanh toán' : status === 'Unpaid' ? 'Chờ thanh toán' : status === 'Cancelled' ? 'Đã hủy' : status}".`;
    }

    await new Notification({
      title: 'Cập nhật đơn hàng',
      message: msg,
      type: 'info'
    }).save();
    
    res.json(order);
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

// --- TASKS ---
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const task = new Task(req.body);
    res.status(201).json(await task.save());
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.post('/api/tasks/:id/execute', auth, async (req, res) => {
  try {
    const campaign = await Task.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    // Get all customer phone numbers
    const allCustomers = await Customer.find({}, 'name phone');
    const recipients = allCustomers.filter(c => c.phone);
    
    // Simulate sending messages (this is where real SMS Gateway / Zalo Cloud Connect API would be hooked up)
    console.log(`[SMS Campaign] Executing: "${campaign.title}"`);
    console.log(`[SMS Campaign] Content: "${campaign.message}"`);
    recipients.forEach(cust => {
      console.log(`  -> Mock Sent to ${cust.name} (${cust.phone})`);
    });
    
    campaign.done = true;
    campaign.sentCount = recipients.length;
    await campaign.save();

    // Create notification
    await new Notification({ 
      title: 'Chiến dịch SMS hoàn thành', 
      message: `Chiến dịch "${campaign.title}" đã gửi thành công tới ${recipients.length} khách hàng.`, 
      type: 'success' 
    }).save();

    res.json({
      success: true,
      message: 'Campaign executed successfully',
      sentCount: recipients.length,
      recipients: recipients.map(r => ({ name: r.name, phone: r.phone }))
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

app.post('/api/backup/restore', auth, async (req, res) => {
  if (req.user && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Only Boss can restore database' });
  }
  try {
    const { customers, deals, products, orders } = req.body;
    
    // Clear current database collections
    if (customers) await Customer.deleteMany({});
    if (deals) await Deal.deleteMany({});
    if (products) await Product.deleteMany({});
    if (orders) await Order.deleteMany({});
    
    // Insert new documents
    if (customers && customers.length > 0) await Customer.insertMany(customers);
    if (deals && deals.length > 0) await Deal.insertMany(deals);
    if (products && products.length > 0) await Product.insertMany(products);
    if (orders && orders.length > 0) await Order.insertMany(orders);
    
    // Create a notification about database restore
    await new Notification({
      title: 'Khôi phục dữ liệu',
      message: `Hệ thống vừa khôi phục cơ sở dữ liệu thành công từ file sao lưu.`,
      type: 'warning'
    }).save();
    
    res.json({ success: true, message: 'Khôi phục dữ liệu thành công!' });
  } catch (err) {
    console.error('Restore Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- HEALTH CHECK ---
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({
    status: 'ok',
    db: dbStatus,
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
