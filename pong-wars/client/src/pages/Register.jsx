import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'
const url = 'http://192.168.2.127:3001/auth/register';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });
      const data = await res.json();
      console.log(data);
      if (data.token) {
        login(data.token, data.user); // 登録後にログイン状態にする
        navigate('/game'); // ゲーム画面にリダイレクト
      } else {
        alert('登録失敗');
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
    <div className="register-container">
      <h1>ユーザー登録</h1>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="ユーザー名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">登録</button>
      </form>
    </div>
    </div>
  );
};

export default Register;