function handleCountdown(gameState, gameId, player1Id, player2Id, io) {
    gameState[gameId].countdown -= 1 / 60;
    const countdownInteger = Math.ceil(gameState[gameId].countdown);
  
    io.to(player1Id).emit("countdown", { count: countdownInteger });
    io.to(player2Id).emit("countdown", { count: countdownInteger });
  
    if (countdownInteger <= 0) {
      gameState[gameId].isCountingDown = false;
      io.to(player1Id).emit("countdownFinished");
      io.to(player2Id).emit("countdownFinished");
    }
  }
  module.exports = handleCountdown;