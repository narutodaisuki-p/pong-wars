import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/Settings.css';

const Settings = () => {
  const { user, token } = useContext(AuthContext);
  const [trophies, setTrophies] = useState([]);
  const [character, setCharacter] = useState(user?.character || 'default');
  const [characterSettings, setCharacterSettings] = useState(null);
  const [friendUsername, setFriendUsername] = useState('');
  const [friends, setFriends] = useState(user?.friends || []);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('friends');
  const [errorMessage, setErrorMessage] = useState('');

  const characters = {
    default: {
      name: 'デフォルト',
      description: 'バランスの取れた標準的なパドル',
      icon: '🔵'
    },
    speed: {
      name: 'スピード',
      description: 'ボールを加速させる特殊能力を持つパドル',
      icon: '🔴'
    },
    power: {
      name: 'パワー',
      description: '相手のパドルを小さくする特殊能力を持つパドル',
      icon: '🟢'
    },
    balanced: {
      name: 'バランス',
      description: 'ボールの軌道を曲げる特殊能力を持つパドル',
      icon: '🟣'
    }
  };

  useEffect(() => {
    // トロフィー情報を取得
    fetch(`http://localhost:3001/users/${user._id}/trophies`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setTrophies(data.trophies))
      .catch((err) => {
        console.error(err);
        setMessage('トロフィーの取得に失敗しました');
      });

    // 現在のキャラクター設定を取得
    fetch(`http://localhost:3001/users/${user._id}/character`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setCharacter(data.character);
        setCharacterSettings(data.settings);
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setMessage('キャラクター設定の取得に失敗しました');
      });
      
    // フレンドリストを取得
    fetchFriends();
    
    // フレンドリクエストを取得
    fetchFriendRequests();
    
    // 送信済みリクエストを取得
    fetchSentRequests();
  }, [user, token]);

  // フレンドリストを取得
  const fetchFriends = async () => {
    try {
      const response = await fetch(`http://localhost:3001/users/${user._id}/friends`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setFriends(data.friends);
      } else {
        console.error('フレンドリストの取得に失敗しました');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // フレンドリクエストを取得
  const fetchFriendRequests = async () => {
    try {
      const response = await fetch(`http://localhost:3001/users/${user._id}/friend-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log(response);
      if (response.ok) {
        setFriendRequests(data.requests);
      } else {
        console.error('フレンドリクエストの取得に失敗しました');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 送信済みリクエストを取得
  const fetchSentRequests = async () => {
    try {
      const response = await fetch(`http://localhost:3001/users/${user._id}/sent-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSentRequests(data.requests);
      } else {
        console.error('送信済みリクエストの取得に失敗しました');
      }
    } catch (err) {
      setErrorMessage("送信済みリクエストの取得に失敗しました");
    }
  };

  // キャラクターを変更
  const handleCharacterChange = async (newCharacter) => {
    try {
      const response = await fetch(`http://localhost:3001/users/${user._id}/character`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ character: newCharacter }),
      });

      const data = await response.json();
      if (response.ok) {
        setCharacter(data.character);
        setCharacterSettings(data.settings);
        setMessage('キャラクターを更新しました');
      } else {
        setMessage('キャラクターの更新に失敗しました');
      }
    } catch (err) {
      console.error(err);
      setMessage('エラーが発生しました');
    }
  };

  // フレンドリクエストを送信
  const handleSendFriendRequest = async () => {
    if (!friendUsername.trim()) {
      setMessage('ユーザー名を入力してください');
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3001/users/${user._id}/friend-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: friendUsername }),
      });

      const data = await response.json();
      if (response.ok) {
        setSentRequests([...sentRequests, data.request]);
        setFriendUsername('');
        setMessage('フレンドリクエストを送信しました');
      } else {
        setMessage(data.message || 'フレンドリクエストの送信に失敗しました');
      }
    } catch (err) {
      console.error(err);
      setMessage('エラーが発生しました');
    }
  };

  // フレンドリクエストを承認
  const handleAcceptFriendRequest = async (requestId) => {
    try {
      const response = await fetch(`http://localhost:3001/users/${user._id}/friend-requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        // リクエストリストから削除
        setFriendRequests(friendRequests.filter(req => req._id !== requestId));
        // フレンドリストに追加
        setFriends([...friends, data.friend]);
        setMessage('フレンドリクエストを承認しました');
      } else {
        setMessage('フレンドリクエストの承認に失敗しました');
      }
    } catch (err) {
      console.error(err);
      setMessage('エラーが発生しました');
    }
  };

// フレンドリクエストを拒否
  const handleRejectFriendRequest = async (requestId) => {
    try {
      const response = await fetch(`http://localhost:3001/users/${user._id}/friend-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // リクエストリストから削除
        setFriendRequests(friendRequests.filter(req => req._id !== requestId));
        setMessage('フレンドリクエストを拒否しました');
      } else {
        setMessage('フレンドリクエストの拒否に失敗しました');
      }
    } catch (err) {
      console.error(err);
      setMessage('エラーが発生しました');
    }
  };

  // フレンドリクエストをキャンセル
  const handleCancelFriendRequest = async (requestId) => {
    try {
      const response = await fetch(`http://localhost:3001/users/${user._id}/sent-requests/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // 送信済みリクエストリストから削除
        setSentRequests(sentRequests.filter(req => req._id !== requestId));
        setMessage('フレンドリクエストをキャンセルしました');
      } else {
        setMessage('フレンドリクエストのキャンセルに失敗しました');
      }
    } catch (err) {
      console.error(err);
      setMessage('エラーが発生しました');
    }
  };

  // フレンドを削除
  const handleRemoveFriend = async (friendId) => {
    try {
      const response = await fetch(`http://localhost:3001/users/${user._id}/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // フレンドリストから削除
        setFriends(friends.filter(friend => friend._id !== friendId));
        setMessage('フレンドを削除しました');
      } else {
        setMessage('フレンドの削除に失敗しました');
      }
    } catch (err) {
      console.error(err);
      setMessage('エラーが発生しました');
    }
  };

  return (
    <div className="settings-container">
      <h1 className="settings-title">設定</h1>
      <div>スキン</div>
      <div>
        <img src={user.characterImage} alt="スキン" />
      </div>
      {message && (
        <div className="message-banner">
          {message}
        </div>
      )}

      <section className="settings-section">
        <h2>トロフィー</h2>
        <div className="trophies-container">
          <div className='trophyNumber'>{trophies.length}</div>
        </div>
      </section>

      <section className="settings-section">
        <h2>キャラクター選択</h2>
        <div className="character-grid">
          {Object.entries(characters).map(([key, value]) => (
            <div
              key={key}
              className={`character-card ${character === key ? 'selected' : ''}`}
              onClick={() => handleCharacterChange(key)}
            >
              <div className="character-icon">{value.icon}</div>
              <h3>{value.name}</h3>
              <p>{value.description}</p>
              {characterSettings && character === key && (
                <div className="character-stats">
                  <div>速さ: {characterSettings.paddleSpeed}</div>
                  <div>幅: {characterSettings.paddleWidth}px</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>フレンド管理</h2>
        <div className="friend-tabs">
          <button 
            className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}

          >
            フレンド ({friends.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            リクエスト ({friendRequests.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            送信済み ({sentRequests.length})
          </button>
        </div>

        {activeTab === 'friends' && (
          <div className="friends-content">
            <div className="friend-add-container">
              <input
                type="text"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                placeholder="フレンドのユーザー名を入力"
                className="friend-input"
              />
              <button onClick={handleSendFriendRequest} className="add-friend-button">
                リクエスト送信
              </button>
            </div>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            <div className="friends-list">
              <h3>フレンドリスト</h3>
              {friends.length > 0 ? (
                <ul>
                  {friends.map((friend) => (
                    <li key={friend._id} className="friend-item">
                      <div className="friend-info">
                        <span className="friend-icon">👤</span>
                        <span className="friend-name">{friend.username}</span>
                      </div>
                      <button 
                        className="friend-action-button remove"
                        onClick={() => handleRemoveFriend(friend._id)}
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>フレンドがいません</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="requests-content">
            <h3>受信したフレンドリクエスト</h3>
            {friendRequests.length > 0 ? (
              <ul>
                {friendRequests.map((request) => (
                  <li key={request._id} className="request-item">
                    <div className="friend-info">
                      <span className="friend-icon">👤</span>
                      <span className="friend-name">{request.fromUser.username}</span>
                    </div>
                    <div className="request-actions">
                      <button 
                        className="friend-action-button accept"
                        onClick={() => handleAcceptFriendRequest(request._id)}
                      >
                        承認
                      </button>
                      <button 
                        className="friend-action-button reject"
                        onClick={() => handleRejectFriendRequest(request._id)}
                      >
                        拒否
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>リクエストはありません</p>
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="sent-content">
            <h3>送信済みフレンドリクエスト</h3>
            {sentRequests.length > 0 ? (
              <ul>
                {sentRequests.map((request) => (
                  <li key={request._id} className="request-item">
                    <div className="friend-info">
                      <span className="friend-icon">👤</span>
                      <span className="friend-name">{request.toUser.username}</span>
                    </div>
                    <button 
                      className="friend-action-button cancel"
                      onClick={() => handleCancelFriendRequest(request._id)}
                    >
                      キャンセル
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>送信済みリクエストはありません</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default Settings;