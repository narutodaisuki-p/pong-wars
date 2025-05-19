import React, { useRef, useEffect, useState } from 'react';

function GameArea({ gameState, player, opponent }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // ウィンドウサイズの変更を監視
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      
      // コンテナの幅に基づいて計算
      const containerWidth = containerRef.current.clientWidth;
      const maxWidth = 1200; // 最大幅
      const minWidth = 800;  // 最小幅
      
      // アスペクト比 4:3 を維持
      const width = Math.min(Math.max(containerWidth, minWidth), maxWidth);
      const height = width * 0.75;
      
      setDimensions({ width, height });
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions(); // 初期サイズを設定

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!gameState) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const H = canvas.height;
    const W = canvas.width;

    // 自分が上の場合、座標を反転させる関数
    const flipY = (bool,y) => {
      if (bool) {
        return H - y;
      }
      return y;
    }

    // ── 1) クリア＆背景＆中央線 ──
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, W, H);
    ctx.beginPath();
    ctx.setLineDash([5, 15]);
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    const selfP = gameState.players[player];
    const oppP = gameState.players[opponent];
    
    const boolY = selfP.y < oppP.y;
    const transformY = (y) => {
      if (boolY) {
        return flipY(boolY, y);
      }
      return y;
    }

    // ── 2) ボールを描画 ──
    if (gameState.ball) {
      const b = gameState.ball;
      ctx.beginPath();
      const ballY = transformY(b.y);
      ctx.arc(b.x * (W / 800), ballY * (H / 600), b.radius * (W / 800), 0, Math.PI * 2);
      ctx.fillStyle = b.color || 'red';
      ctx.fill();
      ctx.closePath();
    }

    // ── 3) 自分（下側）のパドル ──
    if (selfP) {
      ctx.fillStyle = 'blue';
      const selfPaddleY = transformY(selfP.y);
      ctx.fillRect(
        selfP.x * (W / 800),
        selfPaddleY * (H / 600),
        selfP.width * (W / 800),
        selfP.height * (H / 600)
      );
    }

    // ── 4) 相手（上側）のパドル ──
    if (oppP) {
      ctx.fillStyle = 'green';
      const oppPaddleY = transformY(oppP.y);
      ctx.fillRect(
        oppP.x * (W / 800),
        oppPaddleY * (H / 600),
        oppP.width * (W / 800),
        oppP.height * (H / 600)
      );
    }
    
  }, [gameState, player, opponent, dimensions]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        id="game-canvas"
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'block'
        }}
      />
      <div className="text-center mt-2">操作方法: マウスを左右に動かしてパドルを操作</div>
    </div>
  );
}

export default GameArea;