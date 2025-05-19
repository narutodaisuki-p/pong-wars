const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const waitingPlayers = []; // マッチング待機中のプレイヤーを管理
require('dotenv').config({});
const app = express();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const mongoose = require('mongoose');
const User = require('./models/User.js');
const authRoutes = require('./routes/logoin.js');
const auth = require('./middleware/auth.js');
const settingsRoutes = require('./routes/settings.js');
const handleCountdown = require('./gameLogic/handleCountdown.js');
const updateBallPosition = require('./gameLogic/updateBallPosition.js');


mongoose.connect(process.env.MONGO_URI, {
}, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDBに接続しました');
  })
  .catch((err) => {
    console.error('MongoDB接続エラー:', err);
  });

app.use('/auth', authRoutes);
app.use('/users',  settingsRoutes);


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://192.168.2.127:3000', // ReactのURL
    methods: ['GET', 'POST']
  }
});
let gameState = {};
let gameIntervals = {}; // 各ゲームの setInterval を管理
let gameChats = {}; // 各ゲームのチャット履歴を管理
const rematchRequests = {}; // 各ゲームのリマッチ要求状況を管理
const winScore = 50;
function whichWin(score, winScore, gameId, player1Id, player2Id) {
  if (score >= winScore) {
    // ゲームの間隔を停止
    clearInterval(gameIntervals[gameId]);
    
    // ゲームの終了を両方のプレイヤーに通知
    io.to(player1Id).emit("finish", { 
      winner: score === gameState[gameId].scores[player1Id] ? player1Id : player2Id,
      scores: gameState[gameId].scores
    });
    io.to(player2Id).emit("finish", {
      winner: score === gameState[gameId].scores[player1Id] ? player1Id : player2Id,
      scores: gameState[gameId].scores
    });
    // チャット履歴を初期化
    gameChats[gameId] = [];
    return true;
  }
  return false;
}

io.on("connection", (socket) => {
  console.log(`🟢 ユーザー接続: ${socket.id}`);

  socket.on("findMatch", (data) => {
    const {user, name, paddleWidth} = data;
    const character = user.character;

    // ユーザー情報をデータベースから取得

    console.log(`マッチングリクエスト: ${socket.id}`);
    waitingPlayers.push({ 
      id: socket.id, 
      name: name, 
      userId: user._id,
      character: character, // キャラクター情報を追加
      paddleWidth: paddleWidth // パドルの幅を追加
    });
    console.log(`待機中プレイヤー: ${waitingPlayers.map(player => player.name).join(", ")}`);

    // 2人以上が待機中の場合、マッチングを成立させる
    if (waitingPlayers.length >= 2) {
      let player1 = waitingPlayers.shift();
      let player2 = waitingPlayers.shift();
      console.log("それぞれ")
      console.log(player1, player2);
      // ゲーム ID を作成
      const gameId = `${player1.id}-${player2.id}`;
      gameState[gameId] = {
        ball: {
          x: 400,
          y: 300,
          radius: 10,
          speedX: 0,
          speedY: 5,
          color: "red"
        },
        players: {},
        scores: {
          [player1.id]: 0,
          [player2.id]: 0,
        },
        playerNames: {
          [player1.id]: player1.name,
          [player2.id]: player2.name
        },
        characters: {  // キャラクター情報を追加
          [player1.id]: player1.character,
          [player2.id]: player2.character
        },
        countdown: 3,
        isCountingDown: true
      };

      // チャット履歴を初期化
      gameChats[gameId] = [];
      
      console.log(`🎮 ゲーム開始: ${gameId}`);
      console.log(`プレイヤー1: ${player1} (${player1.id})`);


      // プレイヤーのマッピングを保存c
      gameState[gameId].players[player1.id] = { 
        x: 400, 
        y: 580, 
        width: player1.paddleWidth || 100, 
        height: 10 
      }; 
      gameState[gameId].players[player2.id] = { 
        x: 400, 
        y: 20 + 10, 
        width: player2.paddleWidth || 100, 
        height: 10 
      };

      // マッチング成立通知を送信
      console.log(`マッチング成立: ${player1.name} vs ${player2.name}`);
      
      io.to(player1.id).emit("matchFound", {
        opponent: player2.id, 
        opponentName: player2.name,
        opponentCharacter: player2.character,
        gameState, 
        whoPlayer: player1.id,
        owner: player1.id,
        gameId
      });
      
      io.to(player2.id).emit("matchFound", {
        opponent: player1.id, 
        opponentName: player1.name,
        opponentCharacter: player1.character,
        gameState, 
        whoPlayer: player2.id,
        owner : player2.id, 
        gameId
      });
      
      // プレイヤーの初期位置を設定
      startGame(gameId, player1.id, player2.id);
    }
  });
  socket.on("movePlayerTo", (data) => {
    const { gameId, whoPlayer, x, direction } = data;

    // ゲームが存在しない or プレイヤーがいないなら無視
    if (!gameState[gameId] || !gameState[gameId].players[whoPlayer]) {
        console.log("移動処理エラー:", {
            gameIdExists: !!gameState[gameId],
            playerExists: gameState[gameId] ? !!gameState[gameId].players[whoPlayer] : false
        });
        return;
    }

    const player = gameState[gameId].players[whoPlayer];
    
    // 範囲チェック（プレイヤーの幅を考慮）
    const maxX = 800 - player.width;
    const newX = Math.max(0, Math.min(x, maxX));
    
    // 大きな変化がある場合のみ更新と送信を行う（パフォーマンス向上）
    if (Math.abs(player.x - newX) > 1.0) {
        player.x = newX;
        
        // 移動方向を記録
        if (direction) {
            player.lastDirection = direction;
        }

        // 状態更新を両方に送信
        const [player1Id, player2Id] = gameId.split('-');
        io.to(player1Id).emit("gameUpdate", gameState);
        io.to(player2Id).emit("gameUpdate", gameState);
    } else {
        // 小さな変化の場合は位置だけ更新し、送信はしない
        player.x = newX;
    }
  });

  // チャットメッセージを処理
  socket.on("sendChatMessage", (data) => {
    const { gameId, message, sender } = data;
    if (!gameChats[gameId]) {
      gameChats[gameId] = [];
    }
    
    const playerName = gameState[gameId]?.playerNames[sender] || "Unknown";
    const newMessage = {
      sender,
      playerName,
      message,
      timestamp: new Date().toISOString()
    };
    
    gameChats[gameId].push(newMessage);
    
    // ゲームの両プレイヤーにメッセージを送信
    const [player1Id, player2Id] = gameId.split('-');
    
    io.to(player1Id).emit("chatMessage", newMessage);
    io.to(player2Id).emit("chatMessage", newMessage);
  });

  // チャット履歴をリクエスト
  socket.on("getChatHistory", (data) => {
    const { gameId } = data;
    if (gameChats[gameId]) {
      socket.emit("chatHistory", gameChats[gameId]);
    } else {
      socket.emit("chatHistory", []);
    }
  });

  socket.on("playAgainRequest", (data) => {
    const { gameId, player } = data;
    if (!rematchRequests[gameId]) rematchRequests[gameId] = {};
    rematchRequests[gameId][player] = true;
    const [p1, p2] = gameId.split("-");
    if (rematchRequests[gameId][p1] && rematchRequests[gameId][p2]) {
      io.to(p1).emit("playAgain",{gameId});
      io.to(p2).emit("playAgain",{gameId});
      delete rematchRequests[gameId];
    }
    
  })

  socket.on("playAgain", (data) => {
    const {gameId} = data;
    console.log("gameID",gameId)
    const [player1Id, player2Id] = gameId.split('-');
    // ゲーム状態をリセット
    if (gameState[gameId]) {
      gameState[gameId].ball = {
        x: 400,
        y: 300,
        radius: 10,
        speedX: 0,
        speedY: 5,
        color: "red"
      };
      gameState[gameId].scores[player1Id] = 0;
      gameState[gameId].scores[player2Id] = 0;

      // カウントダウンをリセット
      gameState[gameId].countdown = 3;
      gameState[gameId].isCountingDown = true;
      
      // ゲームを再開
      startGame(gameId, player1Id, player2Id);
      
      // 両プレイヤーに通知
      io.to(player1Id).emit("gameRestarted", gameState);
      io.to(player2Id).emit("gameRestarted", gameState);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 ユーザー切断: ${socket.id}`);
    // 待機中リストから削除
    const index = waitingPlayers.findIndex((player) => player.id === socket.id);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
    }

    // ゲームを停止し、相手に通知
    for (const gameId of Object.keys(gameIntervals)) {
      if (gameId.includes(socket.id)) {
        clearInterval(gameIntervals[gameId]);
        delete gameIntervals[gameId];


        console.log(`⏹️ ゲーム停止: ${gameId}`);
        
        // 相手プレイヤーのIDを取得して切断を通知
        const opponentId = gameId.split('-').find(id => id !== socket.id);
        if (opponentId) {
          io.to(opponentId).emit("opponentDisconnected");
        }
      }
      delete gameState[gameId];
       delete gameChats[gameId];
        delete rematchRequests[gameId];
    }
  });
});

function startGame(gameId, player1Id, player2Id) {
  console.log(`ゲーム開始: ${gameId} - ${player1Id} vs ${player2Id}`);

  if (gameIntervals[gameId]) {
    clearInterval(gameIntervals[gameId]);
  }

  gameState[gameId].isCountingDown = true;
  gameState[gameId].countdown = 3;

  gameIntervals[gameId] = setInterval(() => {
    if (!gameState[gameId]) return;

    if (gameState[gameId].isCountingDown) {
      handleCountdown(gameState, gameId, player1Id, player2Id, io);
      return;
    }

    const gameEnded = updateBallPosition(gameState, gameId, player1Id, player2Id, io, whichWin, winScore);
    if (gameEnded) {
      clearInterval(gameIntervals[gameId]);
    }

    io.to(player1Id).emit("gameUpdate", gameState);
    io.to(player2Id).emit("gameUpdate", gameState);
  }, 1000 / 60); 
}

app.use((err, req, res, next) => {
  
  const { statusCode = 500 } = err;
  if (!err.message) {
      err.message = '問題が起きました'
  }
  res.status(statusCode).json({
      status: "error",
      statusCode,
      message: err.message,
  });
});
server.listen(3001,"0.0.0.0", () => {
  console.log('🚀 サーバー起動 http://localhost:3001');

});
