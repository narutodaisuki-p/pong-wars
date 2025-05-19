const express = require('express');
const User = require('../models/User');
const router = express.Router();
const jwt = require('jsonwebtoken');

// トークン検証エンドポイント
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'トークンが必要です' });
    }

    // トークンを検証
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }
    // ユーザー情報を返す
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'トークンが無効です' });
  }
});

// ユーザー登録
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const user = new User({ username, password, email });
    await user.save();
    const token = user.generateAuthToken();
    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ログイン
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = user.generateAuthToken();
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ログアウト
router.post('/logout', async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    await User.findByIdAndUpdate(req.user._id, { $pull: { tokens: token } });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;