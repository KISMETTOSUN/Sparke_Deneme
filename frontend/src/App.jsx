import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Bot, PlayCircle, Calendar, 
  Zap, Bell, Menu, X, Activity, Play, 
  CheckCircle, XCircle, Loader2, LogOut 
} from 'lucide-react';
import { fetchRobots, fetchActivity, triggerRobot } from './api';
import Login from './Login';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [robots, setRobots] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [triggering, setTriggering] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadData = async () => {
    try {
      const robotsData = await fetchRobots();
      const activityData = await fetchActivity();
      setRobots(robotsData);
      setActivity(activityData);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
      console.error('Error loading data:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleTrigger = async (id) => {
    setTriggering(id);
    try {
      await triggerRobot(id);
      loadData();
      setTimeout(() => setTriggering(null), 2000);
    } catch (err) {
      console.error('Error triggering robot:', err);
      setTriggering(null);
    }
  };

  const stats = {
    total: robots.length,
    running: robots.filter(r => r.status === 'running').length,
    success: activity.filter(a => a.status === 'Success').length,
    failed: activity.filter(a => a.status === 'Failed').length
  };

  if (!initialized) return null;

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <nav className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Zap className="logo-icon" size={28} />
            <span>Sparke</span>
          </div>
        </div>
        <ul className="nav-links">
          <li className="active">
            <a href="#"><LayoutDashboard size={20} /><span>Dashboard</span></a>
          </li>
          <li><a href="#"><Bot size={20} /><span>Robots</span></a></li>
          <li><a href="#"><PlayCircle size={20} /><span>Runs</span></a></li>
          <li><a href="#"><Calendar size={20} /><span>Schedules</span></a></li>
        </ul>
        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>
             <LogOut size={18} /> <span>Sign Out</span>
          </button>
          <div className="user-profile">
            <div className="avatar">{user.username.substring(0,2).toUpperCase()}</div>
            <div className="user-info">
              <p className="user-name">{user.username}</p>
              <p className="user-role">Operator</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-wrapper">
        <header className="top-header">
          <div className="header-left">
            <div className="title-group">
              <h1>Dashboard</h1>
              <p>Welcome back, {user.username}!</p>
            </div>
          </div>
          <div className="header-right">
            <button className="icon-btn">
              <Bell size={20} />
              <span className="badge"></span>
            </button>
            <div className="header-avatar">{user.username.substring(0,2).toUpperCase()}</div>
          </div>
        </header>

        <main className="content-area">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <span>Total Robots</span> <Activity size={18} />
              </div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <span>Running</span> <Play size={18} />
              </div>
              <div className="stat-value">{stats.running}</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <span>Success (24h)</span> <CheckCircle size={18} />
              </div>
              <div className="stat-value highlight">{stats.success}</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <span>Failed (24h)</span> <XCircle size={18} />
              </div>
              <div className="stat-value">{stats.failed}</div>
            </div>
          </div>

          <div className="dashboard-sections">
            <div className="section-card">
              <div className="section-header">
                <h2>Quick Trigger</h2>
                <p>Frequently used robots</p>
              </div>
              <div className="list-container">
                {robots.map(robot => (
                  <div key={robot.id} className="list-item">
                    <div className="item-info">
                      <h3>{robot.name} {robot.user_id ? '👤' : ''}</h3>
                      <p>Last run: {robot.last_run || 'Never'}</p>
                    </div>
                    <button 
                      className="btn btn-primary"
                      disabled={triggering === robot.id || robot.status === 'running'}
                      onClick={() => handleTrigger(robot.id)}
                    >
                      {triggering === robot.id ? (
                        <><Loader2 className="spin" size={14} /> Starting...</>
                      ) : (
                        <><Play size={14} /> Trigger</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h2>Recent Activity</h2>
                <p>Latest runs across the fleet</p>
              </div>
              <div className="list-container">
                {activity.map(log => (
                  <div key={log.id} className="activity-item">
                    <div className={`activity-icon ${log.status.toLowerCase()}`}>
                      {log.status === 'Success' && <CheckCircle size={20} />}
                      {log.status === 'Failed' && <XCircle size={20} />}
                      {log.status === 'Running' && <Activity size={20} className="pulse" />}
                    </div>
                    <div className="activity-info">
                      <h3>{log.robot_name}</h3>
                      <p>{log.timestamp} • {log.duration}</p>
                    </div>
                    <span className={`status-badge ${log.status.toLowerCase()}`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
