const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  
  avatar: {
    type: String
  },
  friends: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  sentRequests: [{
    toUser: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginStreak: {
    type: Number,
    default: 0
  },
  lastLoginBonus: {
    type: Date
  },
  gameStats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    totalGames: { type: Number, default: 0 }
  },
  trophies: [{type: Number}],
  character: {type: String, default: 'default'},
  characterImage: {type: String, default: 'default'},
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// パスワードをハッシュ化するメソッド
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// パスワードを検証するメソッド
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// JWTを生成するメソッド
UserSchema.methods.generateAuthToken = function () {
  const expiresIn = process.env.JWT_EXPIRES_IN || '300h';
  const token = jwt.sign(
    { 
      id: this._id,
      exp: Math.floor(Date.now() / 1000) + (parseInt(expiresIn) * 3600) // 時間を秒に変換
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256'
    }
  );
  return token;
};

// トークンの有効期限を確認するメソッド
UserSchema.methods.isTokenValid = function (token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.exp > Math.floor(Date.now() / 1000);
  } catch (err) {
    return false;
  }
};

module.exports = mongoose.model('User', UserSchema);