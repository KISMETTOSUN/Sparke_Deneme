import React, { useState, useEffect } from 'react';
import { Folder, Play, ArrowLeft, Loader2, Bot, AlertCircle, RefreshCw, Cpu, Monitor } from 'lucide-react';
import { fetchFolders, fetchProcesses, fetchRobotsForFolder } from './api';
import './App.css';

function RobotsView() {
  const [folders, setFolders] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [robots, setRobots] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFolders();
      setFolders(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Klasörler yüklenirken bir hata oluştu. Lütfen UiPath konfigürasyonunu kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = async (folder) => {
    setSelectedFolder(folder);
    setLoadingItems(true);
    setError(null);
    try {
      // Fetch both processes and robots in parallel
      const [processData, robotData] = await Promise.all([
        fetchProcesses(folder.Id),
        fetchRobotsForFolder(folder.Id)
      ]);
      setProcesses(processData);
      setRobots(robotData);
    } catch (err) {
      setError(err.response?.data?.error || 'Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleBack = () => {
    setSelectedFolder(null);
    setProcesses([]);
    setRobots([]);
    setError(null);
  };

  if (loading && folders.length === 0) {
    return (
      <div className="section-card fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 className="spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="robots-container fade-in">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {selectedFolder ? <Bot size={24} color="var(--primary)" /> : <Folder size={24} color="var(--primary)" />}
            {selectedFolder ? `${selectedFolder.DisplayName} Hiyerarşisi` : 'UiPath Klasörleri'}
          </h2>
          <p className="text-muted">
            {selectedFolder ? 'Klasöre atanmış robotlar ve aktif süreçler' : 'Orchestrator üzerindeki aktif klasörleriniz'}
          </p>
        </div>
        {selectedFolder && (
          <button className="btn tab-button" onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={18} /> Geri Dön
          </button>
        )}
      </header>

      {error && (
        <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <AlertCircle size={20} /> {error}
          <button onClick={selectedFolder ? () => handleFolderClick(selectedFolder) : loadFolders} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 'auto' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {loadingItems && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Loader2 className="spin" size={32} color="var(--primary)" />
          <p style={{ marginTop: '12px' }}>Veriler yükleniyor...</p>
        </div>
      )}

      {!loadingItems && !selectedFolder && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {folders.map(folder => (
            <div key={folder.Id} className="stat-card" style={{ cursor: 'pointer', transition: 'var(--transition)' }} onClick={() => handleFolderClick(folder)}>
              <div className="stat-header">
                <span className="text-muted" style={{fontSize: '0.75rem'}}>{folder.FullyQualifiedName}</span>
                <Folder size={18} color="var(--primary)" />
              </div>
              <div className="stat-value" style={{ fontSize: '1.2rem', marginTop: '12px' }}>{folder.DisplayName}</div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                 <span className="badge" style={{background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', fontSize: '0.7rem'}}>
                    Tip: {folder.Type}
                 </span>
              </div>
            </div>
          ))}
          {folders.length === 0 && !error && (
            <div className="section-card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
              <p>Klasör bulunamadı.</p>
            </div>
          )}
        </div>
      )}

      {!loadingItems && selectedFolder && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Robots Section */}
          <section>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <Monitor size={18} color="var(--primary)" /> Robotlar ({robots.length})
            </h3>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {robots.map(robot => (
                <div key={robot.Id} className="stat-card" style={{ padding: '16px' }}>
                  <div className="stat-header">
                    <span style={{ fontWeight: '600' }}>{robot.Name}</span>
                    <Cpu size={16} color={robot.HostingType === 'Cloud' ? 'var(--primary)' : '#aaa'} />
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    {robot.Type} • {robot.HostingType}
                  </p>
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: robot.State === 'Available' ? '#4ade80' : '#f87171' }}></div>
                    <span style={{ fontSize: '0.75rem' }}>{robot.State}</span>
                  </div>
                </div>
              ))}
              {robots.length === 0 && (
                <div className="stat-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-muted">Bu klasöre atanmış robot bulunamadı.</p>
                </div>
              )}
            </div>
          </section>

          {/* Processes Section */}
          <section>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <Bot size={18} color="var(--primary)" /> Süreçler ({processes.length})
            </h3>
            <div className="section-card" style={{ padding: '0' }}>
              <div className="list-container">
                {processes.map(process => (
                  <div key={process.Id} className="list-item" style={{ padding: '16px 20px' }}>
                    <div className="item-info">
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px 0' }}>
                         {process.ProcessKey}
                      </h4>
                      <p style={{ fontSize: '0.85rem' }}>Versiyon: {process.Version} • ID: {process.Id}</p>
                      {process.Description && <p className="text-muted" style={{fontSize: '0.8rem', marginTop: '4px'}}>{process.Description}</p>}
                    </div>
                    <button className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 16px' }}>
                      <Play size={14} /> Çalıştır
                    </button>
                  </div>
                ))}
                {processes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p className="text-muted">Bu klasörde yayınlanmış süreç bulunamadı.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  );
}

export default RobotsView;
