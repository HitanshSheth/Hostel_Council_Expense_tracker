const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');
const JWT_SECRET = require('crypto').randomBytes(32).toString('hex');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

mongoose.connect('mongodb://localhost:27017/expensetracker');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});

const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: Number,
  category: String,
  time: String,
  date: String,
  month: Number,
});

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  goal: String,
  target: Number,
  saved: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Goal = mongoose.model('Goal', goalSchema);

app.use(express.static('public'));

function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(400).json({ error: "Username already taken" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, username: user.username });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(400).json({ error: "Invalid username or password" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, username: user.username });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json({ username: user.username });
});

app.get('/api/expenses', requireAuth, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.userId }).sort({ _id: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/api/expenses', requireAuth, async (req, res) => {
  const expense = new Expense({ ...req.body, userId: req.userId });
  await expense.save();
  res.json(expense);
});

app.get('/api/goals', requireAuth, async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.userId });
        res.json(goals);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/goals', requireAuth, async (req, res) => {
    try {
        const { goal, target } = req.body;
        let existing = await Goal.findOne({ goal, userId: req.userId });
        if (existing) {
            existing.target = target;
            await existing.save();
            return res.json(existing);
        }
        const newGoal = new Goal({ goal, target, saved: 0, userId: req.userId });
        await newGoal.save();
        res.json(newGoal);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.patch('/api/goals/:id', requireAuth, async (req, res) => {
    try {
        const { amount } = req.body;
        const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
        if (!goal) return res.status(404).json({ error: "Goal not found" });
        goal.saved += Number(amount);
        await goal.save();
        res.json(goal);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

const profileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: String,
    email: String,
    phone: String,
    age: Number,
    gender: String,
    occupation: String,
    monthlyIncome: Number,
    address: String,
    bio: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Profile = mongoose.model('Profile', profileSchema);


app.get('/api/profile', requireAuth, async (req, res) => {
    try {
        let profile = await Profile.findOne({ userId: req.userId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.json(profile);
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/profile', requireAuth, async (req, res) => {
    try {
        const profileData = {
            ...req.body,
            userId: req.userId,
            updatedAt: new Date()
        };
        
        const profile = await Profile.findOneAndUpdate(
            { userId: req.userId },
            profileData,
            { 
                new: true,           
                upsert: true,        
                setDefaultsOnInsert: true 
            }
        );
        
        res.json(profile);
    } catch (err) {
        console.error('Error saving profile:', err);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/api/profile', requireAuth, async (req, res) => {
    try {
        await Profile.findOneAndDelete({ userId: req.userId });
        res.json({ message: "Profile deleted successfully" });
    } catch (err) {
        console.error('Error deleting profile:', err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/index2.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index2.html'));
});

app.listen(3000, () => console.log('Server running on port 3000'));