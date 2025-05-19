const User = require('../models/User');

    // ボールの最大速度を制限
    const maxSpeed = 25;


function updateBallPosition(gameState, gameId, player1Id, player2Id, io, whichWin, winScore) {
    const ball = gameState[gameId].ball;
    const player1Character = gameState[gameId].characters[player1Id];
    const player2Character = gameState[gameId].characters[player2Id];

    // キャラクター特有の効果を適用
    const applyCharacterEffects = (playerId, character) => {
        switch(character) {
            case 'default':
                // デフォルトタイプ: 標準的な挙動
                ball.speedX *= 1.0;
                ball.speedY *= 1.0;
                break;
            case 'speed':
                // スピードタイプ: パドルに当たった時、ボールが加速
                ball.speedX *= 1.5;
                ball.speedY *= 1.5;
                break;
            case 'power':
                // パワータイプ: パドルに当たった時、より強い反発
                ball.speedX *= 0.9;
                ball.speedY *= 1.3;
                break;
            case 'balanced':
                // バランスタイプ: 速さとパワーのバランスが良い
                ball.speedX *= 1.1;
                ball.speedY *= 1.1;
                break;
        }
    };

    // パドルの移動方向による斜め打ちの効果を適用
    const applyDirectionalEffect = (direction) => {
        if (direction === "left") {
            // 左方向への斜め打ち
            ball.speedX = Math.max(ball.speedX - 10, -maxSpeed);
        } else if (direction === "right") {
            // 右方向への斜め打ち
            ball.speedX = Math.min(ball.speedX + 10, maxSpeed);
        }
    };

    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // 壁での反射
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= 800) {
        ball.speedX *= -1;
    }

    // パドルでの反射とスピン処理
    if (ball.y + ball.radius >= gameState[gameId].players[player1Id].y &&
        ball.y <= gameState[gameId].players[player1Id].y + gameState[gameId].players[player1Id].height &&
        ball.x >= gameState[gameId].players[player1Id].x &&
        ball.x <= gameState[gameId].players[player1Id].x + gameState[gameId].players[player1Id].width) {
        
        ball.speedY *= -1;
        // パドルの中心からの距離に基づいてスピンを追加
        const paddleCenter = gameState[gameId].players[player1Id].x + (gameState[gameId].players[player1Id].width / 2);
        const hitPosition = ball.x - paddleCenter;
        const spinFactor = hitPosition / (gameState[gameId].players[player1Id].width / 2);
        ball.speedX += spinFactor * 10;
        
        // 移動方向による斜め打ちを適用
        if (gameState[gameId].players[player1Id].lastDirection) {
            applyDirectionalEffect(gameState[gameId].players[player1Id].lastDirection);
        }
        
        applyCharacterEffects(player1Id, player1Character);
    }
    
    if (ball.y - ball.radius <= gameState[gameId].players[player2Id].y + gameState[gameId].players[player2Id].height &&
        ball.y >= gameState[gameId].players[player2Id].y &&
        ball.x >= gameState[gameId].players[player2Id].x &&
        ball.x <= gameState[gameId].players[player2Id].x + gameState[gameId].players[player2Id].width) {
        
        ball.speedY *= -1;
        // パドルの中心からの距離に基づいてスピンを追加
        const paddleCenter = gameState[gameId].players[player2Id].x + (gameState[gameId].players[player2Id].width / 2);
        const hitPosition = ball.x - paddleCenter;
        const spinFactor = hitPosition / (gameState[gameId].players[player2Id].width / 2);
        ball.speedX += spinFactor * 10;

        // 移動方向による斜め打ちを適用
        if (gameState[gameId].players[player2Id].lastDirection) {
            applyDirectionalEffect(gameState[gameId].players[player2Id].lastDirection);
        }

        applyCharacterEffects(player2Id, player2Character);
    }

    // スコア処理
    if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= 600) {
        const scoringPlayer = ball.y - ball.radius <= 0 ? player1Id : player2Id;
        gameState[gameId].scores[scoringPlayer] += 1;

        if (whichWin(gameState[gameId].scores[scoringPlayer], winScore, gameId, player1Id, player2Id)) {

        User.findByIdAndUpdate(
            gameState[gameId].players[scoringPlayer].userId,
            { $inc: { trophy: 1 } }
        ).exec();

        const losingPlayer = scoringPlayer === player1Id ? player2Id : player1Id;
        User.findByIdAndUpdate(
            gameState[gameId].players[losingPlayer].userId,
            { $inc: { trophy: -1 } }
        ).exec();
            return true; // ゲーム終了
        // 勝者のトロフィーを増やし、敗者のトロフィーを減らす
        }

        // ボールをリセット
        ball.x = 400;
        ball.y = 300;
        ball.speedX = 0;
        // ボールの初期速度をマイナスとプラスを交互にする
        ball.speedY = Math.random() < 0.5 ? -5 : 5;
    }

    const currentSpeed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
    if (currentSpeed > maxSpeed) {
        const ratio = maxSpeed / currentSpeed;
        ball.speedX *= ratio;
        ball.speedY *= ratio;
    }

    return false; // ゲーム継続
}
module.exports = updateBallPosition;
