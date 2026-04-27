import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Bot, PlayCircle, Calendar,
  Bell, Menu, X, Activity, Play,
  CheckCircle, XCircle, Loader2, LogOut,
  Settings, Link, Zap, Plus,
  Folder, ArrowRight, Trash2, Edit3,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import {
  fetchRobots, fetchActivity, triggerRobot, fetchFolders,
  fetchProcesses, fetchRobotsForFolder, startUiPathJob,
  fetchTriggers, saveTrigger, deleteTrigger, fetchTriggerLogs
} from './api';
import Login from './Login';
import ConfigurationView from './ConfigurationView';
import RobotsView from './RobotsView';
import ConnectionsView from './ConnectionsView';
import './App.css';

function App() {
  const [user, setUser] = useState({ username: 'admin' });
  const [robots, setRobots] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [triggering, setTriggering] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeTriggerTab, setActiveTriggerTab] = useState('event');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTriggerData, setNewTriggerData] = useState({
    name: '', folderId: '', processKey: '', processName: '', robotId: '', robotName: '', method: 'GET',
    connectorId: '', event: '', interval: '5'
  });
  const [triggers, setTriggers] = useState([]);
  const [editingTriggerId, setEditingTriggerId] = useState(null);
  const [triggerLogs, setTriggerLogs] = useState([]);
  const [availableFolders, setAvailableFolders] = useState([]);
  const [availableRobots, setAvailableRobots] = useState([]);
  const [availableProcesses, setAvailableProcesses] = useState([]);
  const [loadingFormItems, setLoadingFormItems] = useState(false);

  useEffect(() => {
    // Tam Bypass: Admin olarak her zaman oturum açılmış kabul et
    setInitialized(true);
    setUser({ id: 1, username: 'admin' });

    // Verileri yükle
    loadData();
    loadTriggers();
    loadLogs();

    const interval = setInterval(() => {
      loadData();
      loadLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const data = await fetchTriggerLogs();
      setTriggerLogs(data || []);
    } catch (e) { }
  };

  const loadTriggers = async () => {
    try {
      const data = await fetchTriggers();
      setTriggers(data || []);
    } catch (e) { }
  };

  useEffect(() => {
    if (currentView === 'event-trigger') {
      loadFolders();
    }
  }, [currentView]);

  const loadFolders = async () => {
    try {
      const data = await fetchFolders();
      setAvailableFolders(data || []);
    } catch (err) {
      console.error('Error loading folders:', err);
    }
  };

  const handleFolderChange = async (folderId) => {
    setNewTriggerData(prev => ({ ...prev, folderId, robot: '', process: '' }));
    setLoadingFormItems(true);
    try {
      const [robotsData, processesData] = await Promise.all([
        fetchRobotsForFolder(folderId),
        fetchProcesses(folderId)
      ]);
      setAvailableRobots(robotsData || []);
      setAvailableProcesses(processesData || []);
    } catch (err) {
      console.error('Error loading folder items:', err);
    } finally {
      setLoadingFormItems(false);
    }
  };

  const handleSaveTrigger = async () => {
    if (!newTriggerData.name) return alert('Lütfen bir isim girin.');

    try {
      if (editingTriggerId) {
        const trigger = { ...newTriggerData, id: editingTriggerId, type: activeTriggerTab, enabled: true };
        await saveTrigger(trigger);
      } else {
        const trigger = {
          ...newTriggerData,
          id: Date.now(), // Temp ID, server will give real one
          type: activeTriggerTab,
          enabled: true
        };
        await saveTrigger(trigger);
      }
      loadTriggers();
      setShowAddForm(false);
      setNewTriggerData({
        name: '', folderId: '', processKey: '', processName: '', robotId: '', robotName: '', method: 'GET',
        connectorId: '', event: '', interval: '5'
      });
      setEditingTriggerId(null);
    } catch (err) {
      alert('Kaydedilemedi: ' + err.message);
    }
  };

  const handleEditTrigger = (trigger) => {
    setNewTriggerData({
      name: trigger.name,
      folderId: trigger.folderId,
      processKey: trigger.processKey,
      processName: trigger.processName,
      robotId: trigger.robotId,
      robotName: trigger.robotName,
      method: trigger.method || 'GET',
      connectorId: trigger.connectorId || '',
      event: trigger.event || '',
      interval: trigger.interval || '5'
    });
    setEditingTriggerId(trigger.id);
    setShowAddForm(true);
    if (trigger.folderId) {
      handleFolderChange(trigger.folderId);
    }
  };

  const toggleTriggerStatus = async (trigger) => {
    try {
      await saveTrigger({ ...trigger, enabled: !trigger.enabled });
      loadTriggers();
    } catch (e) { }
  };

  const [testingTriggerId, setTestingTriggerId] = useState(null);

  const handleTestTrigger = async (trigger) => {
    setTestingTriggerId(trigger.id);
    try {
      if (trigger.type === 'api' || trigger.type === 'event') {
        if (!trigger.folderId || !trigger.processKey || !trigger.robotId) {
          alert('Bu trigger için UiPath bilgileri eksik (Klasör, Robot veya Süreç). Lütfen düzenleyin.');
          return;
        }
        await startUiPathJob(trigger.folderId, trigger.processKey, [parseInt(trigger.robotId)]);
        alert(`${trigger.name} başarıyla test edildi. Robot başlatıldı!`);
      }
    } catch (err) {
      alert('Test başarısız: ' + (err.response?.data?.error || err.message));
    } finally {
      setTestingTriggerId(null);
    }
  };

  const loadData = async () => {
    try {
      const robotsData = await fetchRobots();
      const activityData = await fetchActivity();
      setRobots(robotsData);
      setActivity(activityData);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleLogout = () => {
    // Logout devre dışı - Her zaman admin
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

  // Auth kontrollerini tamamen devre dışı bırakıyoruz
  if (!initialized) return <div style={{ background: 'var(--bg-main)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Yükleniyor...</div>;

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
          <li className={currentView === 'dashboard' ? 'active' : ''}>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('dashboard'); }}>
              <LayoutDashboard size={20} /><span>Kontrol Paneli</span>
            </a>
          </li>
          <li className={currentView === 'configuration' ? 'active' : ''}>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('configuration'); }}>
              <Settings size={20} /><span>Konfigürasyon</span>
            </a>
          </li>
          <li className={currentView === 'robots' ? 'active' : ''}>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('robots'); }}>
              <Bot size={20} /><span>Robotlar</span>
            </a>
          </li>
          <li className={currentView === 'connections' ? 'active' : ''}>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('connections'); }}>
              <Link size={20} /><span>Bağlantılar</span>
            </a>
          </li>
          <li className={currentView === 'event-trigger' ? 'active' : ''}>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('event-trigger'); }}>
              <Zap size={20} /><span>Event Trigger</span>
            </a>
          </li>
        </ul>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">{user.username.substring(0, 2).toUpperCase()}</div>
            <div className="user-info">
              <p className="user-name">{user.username}</p>
              <p className="user-role">Operatör</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-wrapper">
        <header className="top-header">
          <div className="header-left">
            <div className="title-group">
              <h1>
                {currentView === 'dashboard' && 'Kontrol Paneli'}
                {currentView === 'configuration' && 'Konfigürasyon'}
                {currentView === 'robots' && 'Robotlar'}
                {currentView === 'connections' && 'Bağlantılar'}
                {currentView === 'event-trigger' && 'Event Trigger'}
              </h1>
              <p>Hoş geldin, {user.username}!</p>
            </div>
          </div>
          <div className="header-right">
            <button className="icon-btn">
              <Bell size={20} />
              <span className="badge"></span>
            </button>
            <div className="header-avatar">{user.username.substring(0, 2).toUpperCase()}</div>
          </div>
        </header>

        <main className="content-area">
          {currentView === 'dashboard' && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-header">
                    <span>Toplam Robot</span> <Activity size={18} />
                  </div>
                  <div className="stat-value">{stats.total}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-header">
                    <span>Çalışan</span> <Play size={18} />
                  </div>
                  <div className="stat-value">{stats.running}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-header">
                    <span>Başarılı (24s)</span> <CheckCircle size={18} />
                  </div>
                  <div className="stat-value highlight">{stats.success}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-header">
                    <span>Başarısız (24s)</span> <XCircle size={18} />
                  </div>
                  <div className="stat-value">{stats.failed}</div>
                </div>
              </div>

              <div className="dashboard-sections">
                <div className="section-card">
                  <div className="section-header">
                    <h2>Hızlı Tetikleme</h2>
                    <p>Sık kullanılan robotlar</p>
                  </div>
                  <div className="list-container">
                    {robots.map(robot => (
                      <div key={robot.id} className="list-item">
                        <div className="item-info">
                          <h3>{robot.name} {robot.user_id ? '👤' : ''}</h3>
                          <p>Son çalışma: {robot.last_run || 'Hiç'}</p>
                        </div>
                        <button
                          className="btn btn-primary"
                          disabled={triggering === robot.id || robot.status === 'running'}
                          onClick={() => handleTrigger(robot.id)}
                        >
                          {triggering === robot.id ? (
                            <><Loader2 className="spin" size={14} /> Başlatılıyor...</>
                          ) : (
                            <><Play size={14} /> Tetikle</>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="section-card">
                  <div className="section-header">
                    <h2>Son Aktiviteler</h2>
                    <p>Tüm filodaki son hareketler</p>
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
            </>
          )}

          {currentView === 'configuration' && <ConfigurationView />}

          {currentView === 'robots' && <RobotsView />}

          {currentView === 'connections' && <ConnectionsView />}

          {currentView === 'event-trigger' && (
            <div className="section-card fade-in">
              <div className="tab-menu" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    className={`tab-button ${activeTriggerTab === 'event' ? 'active' : ''}`}
                    onClick={() => { setActiveTriggerTab('event'); setShowAddForm(false); }}
                  >
                    <Activity size={18} /> Event Trigger
                  </button>
                  <button
                    className={`tab-button ${activeTriggerTab === 'api' ? 'active' : ''}`}
                    onClick={() => { setActiveTriggerTab('api'); setShowAddForm(false); }}
                  >
                    <Zap size={18} /> API Trigger
                  </button>
                </div>
                {!showAddForm && (
                  <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                    <Plus size={16} /> Yeni {activeTriggerTab === 'event' ? 'Event' : 'API'} Trigger Ekle
                  </button>
                )}
              </div>

              <div className="trigger-content fade-in">
                {showAddForm ? (
                  <div className="section-card" style={{ border: '1px solid var(--primary)', background: 'rgba(237, 94, 118, 0.02)' }}>
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <h2>{editingTriggerId ? 'Triggerı Düzenle' : `Yeni ${activeTriggerTab === 'api' ? 'API' : 'Event'} Trigger Oluştur`}</h2>
                        <p>Lütfen trigger detaylarını doldurun.</p>
                      </div>
                      <button className="icon-btn" onClick={() => { setShowAddForm(false); setEditingTriggerId(null); setAvailableRobots([]); setAvailableProcesses([]); }}><X size={20} /></button>
                    </div>

                    <div className="form-layout" style={{ maxWidth: '100%' }}>
                      <div className="form-group">
                        <label>Trigger İsmi</label>
                        <input
                          type="text" className="form-control" placeholder="Örn: Gmail Invoice Trigger"
                          value={newTriggerData.name} onChange={e => setNewTriggerData({ ...newTriggerData, name: e.target.value })}
                        />
                      </div>

                      {activeTriggerTab === 'event' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="form-group">
                            <label>Connector</label>
                            <select className="form-control" value={newTriggerData.connectorId} onChange={e => setNewTriggerData({ ...newTriggerData, connectorId: e.target.value })}>
                              <option value="">Seçiniz...</option>
                              <option value="gmail">Gmail</option>
                              <option value="influxdb">InfluxDB</option>
                              <option value="notion">Notion</option>
                              <option value="weatherstack">Hava Durumu (WeatherStack)</option>
                              <option value="filewatcher">Yerel Klasör Dinleme</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Olay (Event)</label>
                            <select className="form-control" value={newTriggerData.event} onChange={e => setNewTriggerData({ ...newTriggerData, event: e.target.value })} disabled={!newTriggerData.connectorId}>
                              <option value="">Seçiniz...</option>
                              {newTriggerData.connectorId === 'gmail' && <option value="new_email">Yeni Mail Gelince</option>}
                              {newTriggerData.connectorId === 'influxdb' && <option value="data_threshold">Veri Eşik Değeri Aşınca</option>}
                              {newTriggerData.connectorId === 'notion' && <option value="new_page">Yeni Sayfa Eklenince</option>}
                              {newTriggerData.connectorId === 'weatherstack' && <option value="weather_change">Hava Durumu Değişince</option>}
                              {newTriggerData.connectorId === 'filewatcher' && <option value="new_file">Yeni Dosya Eklendiğinde</option>}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Kontrol Sıklığı (Dakika)</label>
                            <select className="form-control" value={newTriggerData.interval} onChange={e => setNewTriggerData({ ...newTriggerData, interval: e.target.value })}>
                              <option value="1">1 Dakika</option>
                              <option value="3">3 Dakika</option>
                              <option value="5">5 Dakika</option>
                              <option value="10">10 Dakika</option>
                              <option value="30">30 Dakika</option>
                              <option value="60">60 Dakika</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {activeTriggerTab === 'event' && newTriggerData.connectorId === 'weatherstack' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '16px' }}>
                          <div className="form-group">
                            <label>Şehir (Örn: Istanbul)</label>
                            <input
                              type="text" className="form-control" placeholder="Istanbul"
                              value={newTriggerData.city || ''} onChange={e => setNewTriggerData({ ...newTriggerData, city: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>Koşul</label>
                            <select className="form-control" value={newTriggerData.condition || ''} onChange={e => setNewTriggerData({ ...newTriggerData, condition: e.target.value })}>
                              <option value="">Seçiniz...</option>
                              <option value=">">Büyükse (&gt;)</option>
                              <option value="<">Küçükse (&lt;)</option>
                              <option value="==">Eşitse (=)</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Hedef Sıcaklık (°C)</label>
                            <input
                              type="number" className="form-control" placeholder="Örn: 30"
                              value={newTriggerData.target_temp || ''} onChange={e => setNewTriggerData({ ...newTriggerData, target_temp: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {activeTriggerTab === 'event' && newTriggerData.connectorId === 'influxdb' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                          <div className="form-group">
                            <label>Measurement (Örn: kapi_sensor)</label>
                            <input
                              type="text" className="form-control" placeholder="Measurement Name"
                              value={newTriggerData.measurement || ''} onChange={e => setNewTriggerData({ ...newTriggerData, measurement: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>Field (Örn: sayac)</label>
                            <input
                              type="text" className="form-control" placeholder="Field Name"
                              value={newTriggerData.field || ''} onChange={e => setNewTriggerData({ ...newTriggerData, field: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {activeTriggerTab === 'event' && newTriggerData.connectorId === 'filewatcher' && (
                        <div style={{ marginTop: '16px' }}>
                          <div className="form-group">
                            <label>Dinlenecek Klasör Yolu (Örn: C:\Kullanicilar\Masaustu\Faturalar)</label>
                            <input
                              type="text" className="form-control" placeholder="Mutlak klasör yolu giriniz..."
                              value={newTriggerData.folder_path || ''} onChange={e => setNewTriggerData({ ...newTriggerData, folder_path: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      <div className="form-group" style={{ marginTop: '16px' }}>
                        <label>Klasör (Folder)</label>
                        <select
                          className="form-control"
                          value={newTriggerData.folderId}
                          onChange={e => handleFolderChange(e.target.value)}
                        >
                          <option value="">Klasör Seçin...</option>
                          {availableFolders.map(f => (
                            <option key={f.Id} value={f.Id}>{f.DisplayName}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                          <label>Robot {loadingFormItems && <Loader2 className="spin" size={14} />}</label>
                          <select
                            className="form-control"
                            value={newTriggerData.robotId}
                            onChange={e => {
                              const r = availableRobots.find(x => x.Id.toString() === e.target.value);
                              setNewTriggerData({ ...newTriggerData, robotId: e.target.value, robotName: r ? r.Name : '' });
                            }}
                            disabled={!newTriggerData.folderId || loadingFormItems}
                          >
                            <option value="">Robot Seçin...</option>
                            {availableRobots.map(r => (
                              <option key={r.Id} value={r.Id}>{r.Name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Süreç (Process) {loadingFormItems && <Loader2 className="spin" size={14} />}</label>
                          <select
                            className="form-control"
                            value={newTriggerData.processKey}
                            onChange={e => {
                              const p = availableProcesses.find(x => x.Key === e.target.value);
                              setNewTriggerData({ ...newTriggerData, processKey: e.target.value, processName: p ? p.ProcessKey : '' });
                            }}
                            disabled={!newTriggerData.folderId || loadingFormItems}
                          >
                            <option value="">Süreç Seçin...</option>
                            {availableProcesses.map(p => (
                              <option key={p.Id} value={p.Key}>{p.ProcessKey}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {activeTriggerTab === 'api' && (
                        <div className="form-group">
                          <label>Method</label>
                          <select
                            className="form-control"
                            value={newTriggerData.method}
                            onChange={e => setNewTriggerData({ ...newTriggerData, method: e.target.value })}
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>
                      )}

                      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button className="btn" onClick={() => setShowAddForm(false)}>İptal</button>
                        <button className="btn btn-primary" onClick={handleSaveTrigger}>
                          <CheckCircle size={16} /> Trigger'ı Kaydet
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="trigger-list">
                      {triggers.filter(t => t.type === activeTriggerTab).map(trigger => (
                        <div key={trigger.id} className="list-item fade-in" style={{ marginBottom: '12px', opacity: trigger.enabled ? 1 : 0.6, background: trigger.enabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                            <div style={{ padding: '10px', borderRadius: '10px', background: trigger.enabled ? 'rgba(237, 94, 118, 0.1)' : 'rgba(255,255,255,0.05)', color: trigger.enabled ? 'var(--primary)' : 'var(--text-dim)' }}>
                              {trigger.type === 'api' ? <Zap size={20} /> : <Activity size={20} />}
                            </div>
                            <div className="item-info">
                              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {trigger.name}
                                {!trigger.enabled && <span style={{ fontSize: '0.65rem', background: 'var(--text-dim)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>PASİF</span>}
                              </h3>
                              <p style={{ fontSize: '0.8rem' }}>
                                {trigger.type === 'api' && `${trigger.method} • ${trigger.robotName} • ${trigger.processName}`}
                                {trigger.type === 'event' && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong>{trigger.connectorId?.toUpperCase()}</strong> ({trigger.event}) • <strong>{trigger.interval} dk</strong>
                                    <ArrowRight size={10} />
                                    {trigger.robotName} • {trigger.processName}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button className="icon-btn" style={{ color: trigger.enabled ? '#4ade80' : '#888' }} title={trigger.enabled ? 'Aktif' : 'Pasif'} onClick={() => toggleTriggerStatus(trigger)}>
                              {trigger.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                            </button>
                            <button className="icon-btn" style={{ color: 'var(--primary)' }} title="Düzenle" onClick={() => handleEditTrigger(trigger)}>
                              <Edit3 size={18} />
                            </button>
                            {/* Silme yetkisi kullanıcının kalıcı talebi üzerine tamamen devredışı bırakıldı */}
                            <button
                              className="btn btn-primary"
                              style={{ padding: '8px 16px', opacity: trigger.enabled ? 1 : 0.5, cursor: trigger.enabled && !testingTriggerId ? 'pointer' : 'not-allowed' }}
                              disabled={!trigger.enabled || testingTriggerId === trigger.id}
                              onClick={() => handleTestTrigger(trigger)}
                            >
                              {testingTriggerId === trigger.id ? <Loader2 className="spin" size={14} /> : 'Test Et'} <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {triggers.filter(t => t.type === activeTriggerTab).length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: '20px' }}>
                          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Henüz bir {activeTriggerTab === 'api' ? 'API' : 'Event'} Trigger tanımlanmamış.</p>
                          {activeTriggerTab === 'api' ? <Zap size={48} color="var(--border)" /> : <Activity size={48} color="var(--border)" />}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
