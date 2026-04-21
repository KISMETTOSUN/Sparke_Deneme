import React, { useState } from 'react';
import { Zap, Lock, User, Loader2 } from 'lucide-react';
import { login } from './api';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <Zap className="logo-icon" size={32} />
            <span>Sparke</span>
          </div>
          <h2>Hoş Geldiniz</h2>
          <p>Sisteme giriş yapmak için bilgilerinizi girin</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Kullanıcı Adı</label>
            <div className="input-icon">
              <User size={18} />
              <input 
                type="text" 
                placeholder="Kullanıcı adınızı girin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="new-username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Parola</label>
            <div className="input-icon">
              <Lock size={18} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? <Loader2 className="spin" size={20} /> : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
