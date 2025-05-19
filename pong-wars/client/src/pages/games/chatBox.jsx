import React, { useEffect, useRef } from 'react';
import "./css/chat.css"

function ChatBox({ messages, newMessage, setNewMessage, handleSendMessage, playerId, errorMessage }) {
    const messagesEndRef = useRef(null);
  
    // messages が更新されるたびに一番下までスクロールする
    useEffect(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [messages]);
  
    // ISO文字列を「HH:MM」形式に整形
    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
  
    return (
      <div className="chat-box">
        {/* メッセージ一覧 */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <p className="chat-empty">メッセージはまだありません</p>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.sender === playerId;
              return (
                <div key={idx} className={isOwn ? 'chat-message own' : 'chat-message'}>
                  <div className="chat-message-header">
                    {isOwn ? 'あなた' : msg.playerName}
                  </div>
                  <div className="chat-message-body">
                    {msg.message}
                  </div>
                  <div className="chat-message-time">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              );
            })
          )}
          {/* スクロール先のダミー要素 */}
          <div ref={messagesEndRef} />
        </div>
  
        {/* 入力フォーム */}
        <form onSubmit={handleSendMessage} className="chat-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="chat-input"
          />
          <button type="submit" className="chat-send-button">
            送信
          </button>
        </form>
  
        {/* エラー表示 */}
        {errorMessage && (
          <div className="chat-error">
            {errorMessage}
          </div>
        )}
      </div>
    );
  }
  
export default ChatBox;