import { useEffect, useState, useRef, useContext, use } from "react";
import { io } from "socket.io-client";
import GameArea from "./games/GameArea";
import ScoreBoard from "./games/ScoreBoard";
import ChatBox from "./games/chatBox";
import "../index.css"
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";


function Game() {
    const {user} = useContext(AuthContext);
    const [gameId, setGameId] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [isMatching, setIsMatching] = useState(false);
    const [socket, setSocket] = useState(null);
    const [opponent, setOpponent] = useState(null);
    const [opponentName, setOpponentName] = useState("Unknown");
    const [gameEnded, setGameEnded] = useState(false);
    const [winner, setWinner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [opponentDisconnected, setOpponentDisconnected] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [player, setPlayer] = useState(null);
    const playerName = user.username;
    const [keyState, setKeyState] = useState({ left: false, right: false });
    const animationFrameRef = useRef();
    const lastUpdateRef = useRef(Date.now());
    const [moveSpeed, setMoveSpeed] = useState(300); // デフォルトの移動速度
    const [paddleWidth, setPaddleWidth] = useState(100); // デフォルトのパドル幅
    const [opponentCharacter, setOpponentCharacter] = useState(null);

    // キー入力の最適化のための変数
    const keyStateRef = useRef({ left: false, right: false });

    const handleMatch = () => {
        if (!socket) {
            const token = localStorage.getItem("token");
            const newSocket = io("http://192.168.2.127:3001");
            setSocket(newSocket);

            newSocket.on("matchFound", (data) => {
                console.log(`マッチング成立: ${data.opponent}`);
                setGameState(data.gameState);
                setIsMatching(false);
                setPlayer(data.owner);
                setOpponent(data.opponent);
                setOpponentName(data.opponentName);
                setOpponentCharacter(data.opponentCharacter);
                setGameId(data.gameId);
                setGameEnded(false);
                setWinner(null);
                setMessages([]);
                setOpponentDisconnected(false);
            });
            
            newSocket.on("gameUpdate", (updatedGameState) => {
                setGameState(updatedGameState);
            });
            
            newSocket.on("finish", (data) => {
                setGameEnded(true);
                setWinner(data.winner);
                // ゲーム終了後にチャット履歴を要求
                newSocket.emit("getChatHistory", { gameId });
            });
            
            newSocket.on("chatMessage", (message) => {
                setMessages(prevMessages => [...prevMessages, message]);
            });
            
            newSocket.on("chatHistory", (history) => {
                setMessages(history);
            });
            
            newSocket.on("playAgain", (data) => {
                const rid = data.gameId;
                newSocket.emit("playAgain", { gameId: rid });
                setErrorMessage("")
                setCountdown(3);
            });
             newSocket.on("gameRestarted", (updatedGameState) => {
                                setGameState(updatedGameState);
                                setGameEnded(false);
                                setWinner(null);
                                setErrorMessage("");
                            });
            newSocket.on("opponentDisconnected", () => {
                setOpponentDisconnected(true);
                setGameEnded(true);
            });
            
            newSocket.on("disconnect", () => {
                console.log("Disconnected from server");
                setSocket(null);
                setIsMatching(false);
                setGameState(null);
                setOpponent(null);
                setGameEnded(false);
            });
            newSocket.on("countdown", (data) => {
                setCountdown(data.count);
              });
              
            newSocket.on("countdownFinished", () => {
                setCountdown(null);
              });
            
            setIsMatching(true);
            newSocket.emit("findMatch", { 
                name: playerName, 
                user: user, 
                paddleWidth: paddleWidth // パドル幅を送信
            });
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        
        if (socket && gameId && player) {
       socket.emit("sendChatMessage", {
                gameId,
                message: newMessage,
                sender: player
         });
            setNewMessage("");
        } else {
            setErrorMessage("メッセージを送信できません。");
            setTimeout(() => setErrorMessage(""), 3000);
        }
    };

    const handlePlayAgain = () => {
        if (socket && gameId && gameEnded) {
            socket.emit("playAgainRequest", { gameId, player });
         setErrorMessage("リマッチをリクエストしました。相手を待っています…");
        }
    };

    useEffect(() => {
        // ユーザーのキャラクターに基づいて移動速度とパドル幅を設定
        switch(user.character) {
            case 'default':
                setMoveSpeed(300); // スピードを大幅に上げる
                setPaddleWidth(100);
                break;
            case 'speed':
                setMoveSpeed(450); // スピードを大幅に上げる
                setPaddleWidth(80); // 小さいパドル
                break;
            case 'power':
                setMoveSpeed(200); // スピードを大幅に上げる
                setPaddleWidth(140); // 大きいパドル
                break;
            case 'balanced':
                setMoveSpeed(350); // スピードを大幅に上げる
                setPaddleWidth(110); // バランス型パドル
                break;
            default: // 'default'
                setMoveSpeed(300);
                setPaddleWidth(100);
                break;
        }
    }, [user.character]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!socket || !player || !gameId || gameEnded) return;
            
            let changed = false;
            switch(event.key) {
                case "ArrowLeft":
                    if (!keyStateRef.current.left) {
                        keyStateRef.current.left = true;
                        changed = true;
                    }
                    break;
                case "ArrowRight":
                    if (!keyStateRef.current.right) {
                        keyStateRef.current.right = true;
                        changed = true;
                    }
                    break;
            }

            if (changed) {
                setKeyState({ ...keyStateRef.current });
            }
        };

        const handleKeyUp = (event) => {
            let changed = false;
            switch(event.key) {
                case "ArrowLeft":
                    if (keyStateRef.current.left) {
                        keyStateRef.current.left = false;
                        changed = true;
                    }
                    break;
                case "ArrowRight":
                    if (keyStateRef.current.right) {
                        keyStateRef.current.right = false;
                        changed = true;
                    }
                    break;
            }

            if (changed) {
                setKeyState({ ...keyStateRef.current });
            }
        };

        const updatePosition = () => {
            if (!socket || !player || !gameId || gameEnded || !gameState) {
                animationFrameRef.current = requestAnimationFrame(updatePosition);
                return;
            }

            if (!gameState[gameId] || !gameState[gameId].players || !gameState[gameId].players[player]) {
                console.log("ゲーム状態が不正です: ", {
                    gameIdExists: !!gameState[gameId],
                    playersExists: gameState[gameId] ? !!gameState[gameId].players : false,
                    playerExists: gameState[gameId] && gameState[gameId].players ? !!gameState[gameId].players[player] : false
                });
                animationFrameRef.current = requestAnimationFrame(updatePosition);
                return;
            }

            const now = Date.now();
            const deltaTime = now - lastUpdateRef.current;
            lastUpdateRef.current = now;

            // 移動速度計算（秒間の移動距離）
            // deltaTimeはミリ秒単位なので、1000で割って秒に変換
            const speedFactor = moveSpeed * (deltaTime / 1000);
            
            const currentX = gameState[gameId].players[player].x;
            const paddleWidth = gameState[gameId].players[player].width;
            let newX = currentX;

            if (keyState.left) {
                newX = Math.max(0, currentX - speedFactor);
            }
            if (keyState.right) {
                newX = Math.min(800 - paddleWidth, currentX + speedFactor);
            }

            // 0.1ピクセル以上の変化があれば位置を更新
            if (Math.abs(newX - currentX) > 0.1) {
                // ローカル状態更新
                const newState = JSON.parse(JSON.stringify(gameState));
                newState[gameId].players[player].x = newX;
                setGameState(newState);

                // サーバーに通知
                socket.emit("movePlayerTo", {
                    x: newX,
                    whoPlayer: player,
                    gameId,
                    direction: keyState.left ? "left" : "right"
                });
            }
            
            animationFrameRef.current = requestAnimationFrame(updatePosition);
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        animationFrameRef.current = requestAnimationFrame(updatePosition);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [socket, gameId, gameState, gameEnded, player, moveSpeed]);
    
    // keyStateが変更されたときに参照も更新
    useEffect(() => {
        keyStateRef.current = keyState;
    }, [keyState]);

    if (isMatching) {
        return (
            <div className="loading-container">
                <div className="loading-text">マッチング中...</div>
                <div className="spinner"></div>
            </div>
        )
    }

    if (!gameState) {
        return (
            <div className="loading-container" style={{backgroundColor: "gray" }}>
                <h2 className="title">Pong Game</h2>
                <p className="">ゲームを開始するにはマッチングしてください。</p>
                <button 
                    onClick={handleMatch}
                    className="button"
                >
                    マッチング
                </button>
                <Link to="/settings">設定</Link>
            </div>
        );
    }

    if (!player || !opponent) {
        return (
            <div className="">
                <div className="">プレイヤー情報をロード中...</div>
            </div>
        );
    }
    return (
        <div className="container">
            <h2 className="title">Pong Game</h2>
            
            {opponentDisconnected ? (
                <div className="error-message">
                    対戦相手が切断しました。
                </div>
            ) : (
                <div>
                    <p className="sera">対戦相手: {opponentName}</p>
                    {opponentCharacter && (
                        <p className="sera">
                            対戦相手のキャラクター: {
                                opponentCharacter === 'speed' ? 'スピード' :
                                opponentCharacter === 'power' ? 'パワー' :
                                opponentCharacter === 'balanced' ? 'バランス' : 'デフォルト'
                            }
                        </p>
                    )}
                </div>
            )}
            
            <ScoreBoard 
                scores={gameState[gameId]?.scores} 
                player={player} 
                opponent={opponent} 
            />
            
            {gameEnded ? (
                <div className="text-center">
                    <h3 className="loading-text">
                        {winner === player 
                            ? "あなたの勝ちです！" 
                            : winner === opponent 
                                ? "あなたの負けです！" 
                                : "ゲーム終了"}
                    </h3>
                    
                    {!opponentDisconnected && (
                        <button 
                            onClick={handlePlayAgain}
                            className="button"
                        >
                            もう一度プレイ
                        </button>
                    )}
                </div>
            ) : (
                <div className="game-area-container">
                {countdown != null && (
                    <div className="countdown-overlay">
                        <div className="countdown-number">{countdown}</div>
                    </div>
                )}
                <GameArea 
                    gameState={gameState[gameId]} 
                    player={player} 
                    opponent={opponent}
                />
                </div>
            )}
            
            <div className="chat-container">
                <h3 className="chat-title">チャット</h3>
                
                <ChatBox 
                    messages={messages} 
                    newMessage={newMessage} 
                    setNewMessage={setNewMessage}
                    handleSendMessage={handleSendMessage}
                    playerId={player}
                  errorMessage={errorMessage}
                />
            </div>
            
        </div>
    );
    
}

export default Game;