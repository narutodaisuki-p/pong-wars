const express = require('express');
const User = require('../models/User');
const router = express.Router();
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');
const AppError = require('../utils/Error');

// キャラクター設定の定義
const CHARACTER_SETTINGS = {
  default: {
    paddleColor: '#3B82F6',
    paddleWidth: 100,
    paddleHeight: 10,
    paddleSpeed: 1,
    specialAbility: 'none'
  },
  speed: {
    paddleColor: '#EF4444',
    paddleWidth: 80,
    paddleHeight: 8,
    paddleSpeed: 1.2,
    specialAbility: 'ballSpeed'
  },
  power: {
    paddleColor: '#10B981',
    paddleWidth: 120,
    paddleHeight: 12,
    paddleSpeed: 0.9,
    specialAbility: 'paddleShrink'
  },
  balanced: {
    paddleColor: '#8B5CF6',
    paddleWidth: 100,
    paddleHeight: 10,
    paddleSpeed: 1.1,
    specialAbility: 'ballCurve'
  }
};

router.get("/:userid/trophies", catchAsync(async (req, res) => {
   const {userid} = req.params;
   const user = await User.findById(userid);
   if (!user) {     
    throw new AppError('User not found', 404);
   }
   res.json({ trophies: user.trophies || [] });
}));

// キャラクター設定を取得
router.get('/:userid/character', catchAsync(async (req, res) => {
  const { userid } = req.params;
  const user = await User.findById(userid);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const characterType = user.character || 'default';
  const settings = CHARACTER_SETTINGS[characterType];

  res.json({
    character: characterType,
    settings: settings
  });
}));


// ユーザーのキャラクターを更新
router.put('/:userid/character', catchAsync(async (req, res) => {
    const { userid } = req.params;
    const { character } = req.body;
  
    if (!CHARACTER_SETTINGS[character]) {
      return res.status(400).json({ error: 'Invalid character type' });
    }

    const user = await User.findById(userid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
  
    user.character = character;
    await user.save();
  
    res.json({ 
      message: 'Character updated successfully', 
      character,
      settings: CHARACTER_SETTINGS[character]
    });
}));

// フレンドリストを取得
router.get('/:userid/friends', catchAsync(async (req, res) => {
  const { userid } = req.params;
  
  const user = await User.findById(userid).populate('friends', 'username avatar');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ friends: user.friends });
}));

// フレンドリクエストを送信
router.post('/:userid/friend-requests', catchAsync(async (req, res) => {
  const { userid } = req.params;
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  const user = await User.findById(userid);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const targetUser = await User.findOne({ username });
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found' });
  }
  
  // 自分自身にリクエストを送れないようにする
  if (user._id.equals(targetUser._id)) {
    return res.status(400).json({ message: '自分自身にリクエストを送ることはできません' });
  }
  
  // すでにフレンドかどうかチェック
  if (user.friends.some(friend => friend.equals(targetUser._id))) {
    return res.status(400).json({ message: 'すでにフレンドです' });
  }
  
  // 既存のリクエストをチェック
  const existingRequest = targetUser.friendRequests.find(
    request => request.fromUser && request.fromUser.equals(user._id) && request.status === 'pending'
  );
  
  if (existingRequest) {
    return res.status(400).json({ message: 'すでにリクエストを送信済みです' });
  }
  
  // 相手側に受信リクエストを追加
  targetUser.friendRequests.push({
    fromUser: user._id,
    status: 'pending',
    createdAt: new Date()
  });
  await targetUser.save();
  
  // ユーザー側に送信リクエストを追加
  const sentRequest = {
    toUser: targetUser._id,
    status: 'pending',
    createdAt: new Date()
  };
  
  user.sentRequests.push(sentRequest);
  await user.save();
  
  // レスポンス用にリクエスト情報を整形
  const requestInfo = {
    _id: sentRequest._id,
    toUser: {
      _id: targetUser._id,
      username: targetUser.username
    },
    status: 'pending',
    createdAt: sentRequest.createdAt
  };
  
  res.status(201).json({ message: 'フレンドリクエストを送信しました', request: requestInfo });
}));

// 受信したフレンドリクエストを取得
router.get('/:userid/friend-requests', catchAsync(async (req, res) => {
  const { userid } = req.params;
  
  const user = await User.findById(userid)
    .populate('friendRequests.fromUser', 'username avatar');
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // status: 'pending'のリクエストのみフィルタリング
  const pendingRequests = user.friendRequests
    .filter(request => request.status === 'pending')
    .map(request => ({
      _id: request._id,
      fromUser: request.fromUser,
      status: request.status,
      createdAt: request.createdAt
    }));
  
  res.json({ requests: pendingRequests });
}));

// 送信済みフレンドリクエストを取得
router.get('/:userid/sent-requests', catchAsync(async (req, res) => {
  const { userid } = req.params;
  
  const user = await User.findById(userid)
    .populate('sentRequests.toUser', 'username avatar');
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // status: 'pending'のリクエストのみフィルタリング
  const pendingRequests = user.requests
    .filter(request => request.status === 'pending')
    .map(request => ({
      _id: request._id,
      toUser: request.toUser,
      status: request.status,
      createdAt: request.createdAt
    }));
  
  res.json({ requests: pendingRequests });
}));

// フレンドリクエストを承認
router.post('/:userid/friend-requests/:requestId/accept', catchAsync(async (req, res) => {
  const { userid, requestId } = req.params;
  const user = await User.findById(userid);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // リクエストを検索
  const requestIndex = user.friendRequests.findIndex(
    request => request._id.toString() === requestId && request.status === 'pending'
  );
  
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Request not found or already processed' });
  }
  
  const request = user.friendRequests[requestIndex];
  const fromUserId = request.fromUser;
  
  // 送信者を検索
  const fromUser = await User.findById(fromUserId);
  if (!fromUser) {
    return res.status(404).json({ error: 'Requesting user not found' });
  }
  
  // リクエストステータスを更新
  user.friendRequests[requestIndex].status = 'accepted';
  
  // フレンドリストに相互に追加
  // このコードは、ユーザーのフレンドリストに既に送信者が含まれていないか確認し、含まれていない場合のみ追加します
  // user.friends.some() - 配列内の少なくとも1つの要素が条件を満たすかチェックするメソッド
  // friend.equals(fromUserId) - MongoDBのObjectIdを比較するための特殊メソッド
  // 条件が真でない場合（!で否定）、つまりフレンドリストに送信者がいない場合
  // user.friends.push(fromUserId) - フレンドリストに送信者のIDを追加
  if (!user.friends.some(friend => friend.equals(fromUserId))) {
    user.friends.push(fromUserId);
  }
  
  await user.save();
  
  // 送信者の送信リクエストのステータスも更新
  const sentRequestIndex = fromUser.requests.findIndex(
    request => request.toUser.equals(user._id) && request.status === 'pending'
  );
  
  if (sentRequestIndex !== -1) {
    fromUser.requests[sentRequestIndex].status = 'accepted';
  }
  
  // 送信者のフレンドリストにも追加
  if (!fromUser.friends.some(friend => friend.equals(user._id))) {
    fromUser.friends.push(user._id);
  }
  
  await fromUser.save();
  
  res.json({ 
    message: 'フレンドリクエストを承認しました', 
    friend: {
      _id: fromUser._id,
      username: fromUser.username,
      avatar: fromUser.avatar
    }
  });
}));

// フレンドリクエストを拒否
router.post('/:userid/friend-requests/:requestId/reject', catchAsync(async (req, res) => {
  const { userid, requestId } = req.params;
  
  const user = await User.findById(userid);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // リクエストを検索
  const requestIndex = user.friendRequests.findIndex(
    request => request._id.toString() === requestId && request.status === 'pending'
  );
  
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Request not found or already processed' });
  }
  
  const request = user.friendRequests[requestIndex];
  const fromUserId = request.fromUser;
  
  // リクエストステータスを更新
  user.friendRequests[requestIndex].status = 'rejected';
  await user.save();
  
  // 送信者の送信リクエストのステータスも更新
  const fromUser = await User.findById(fromUserId);
  if (fromUser) {
    const sentRequestIndex = fromUser.sentRequests.findIndex(
      request => request.toUser.equals(user._id) && request.status === 'pending'
    );
    
    if (sentRequestIndex !== -1) {
      fromUser.sentRequests[sentRequestIndex].status = 'rejected';
      await fromUser.save();
    }
  }
  
  res.json({ message: 'Friend request rejected' });
}));

// 送信済みフレンドリクエストをキャンセル
router.post('/:userid/sent-requests/:requestId/cancel', catchAsync(async (req, res) => {
  const { userid, requestId } = req.params;
  const user = await User.findById(userid);
  if (!user) {
    return res.status(404).json({ error: 'ユーザーが見つかりません' });
  }
  
  // 送信リクエストを検索
  const requestIndex = user.requests.findIndex(
    request => request._id.toString() === requestId && request.status === 'pending'
  );
  
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Request not found or already processed' });
  }
  
  const request = user.requests[requestIndex];
  const toUserId = request.toUser;
  
  // リクエストを削除
  user.requests.splice(requestIndex, 1);
  await user.save();
  
  // 相手側の受信リクエストも削除
  const toUser = await User.findById(toUserId);
  if (toUser) {
    const receivedRequestIndex = toUser.friendRequests.findIndex(
      request => request.fromUser.equals(user._id) && request.status === 'pending'
    );
    
    if (receivedRequestIndex !== -1) {
      // splice(開始インデックス, 削除する要素数, [追加する要素])
      // receivedRequestIndexの位置から1つの要素を削除
      toUser.friendRequests.splice(receivedRequestIndex, 1);
      await toUser.save();
    }
  }
  
  res.json({ message: 'Friend request cancelled' });
}));

// フレンドを削除
router.delete('/:userid/friends/:friendId', catchAsync(async (req, res) => {
  const { userid, friendId } = req.params;
  
  const user = await User.findById(userid);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // フレンドリストから削除
  const friendIndex = user.friends.findIndex(friend => friend.toString() === friendId);
  if (friendIndex === -1) {
    return res.status(404).json({ error: 'フレンドが見つかりません' });
  }
  
  user.friends.splice(friendIndex, 1);
  await user.save();
  
  // 相手のフレンドリストからも削除
  const friend = await User.findById(friendId);
  if (friend) {
    const userIndex = friend.friends.findIndex(f => f.equals(user._id));
    if (userIndex !== -1) {
      friend.friends.splice(userIndex, 1);
      await friend.save();
    }
  }
  
  res.json({ message: 'フレンドを削除しました' });
}));

// (以前のフレンド追加機能は残しておく)
router.post("/:userid/friends", catchAsync(async (req,res) => {
    const {userid} = req.params;
    const { username } = req.body;

    const user = await User.findById(userid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const friend = await User.findOne({ username });
    if (!friend) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    if (!user.friends.includes(friend._id)) {
      user.friends.push(friend._id);
      await user.save();
    }

    res.json({ 
      message: 'Friend added successfully', 
      friend: { 
        id: friend._id, 
        username: friend.username 
      } 
    });
}));

module.exports = router;