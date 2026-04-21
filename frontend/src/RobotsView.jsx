import React, { useState, useEffect } from 'react';
import { Folder, Play, ArrowLeft, Loader2, Bot, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchFolders, fetchProcesses } from './api';
import './App.css';

function RobotsView() {
  const [folders, setFolders] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProcesses(folder.Id);
      setProcesses(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Süreçler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedFolder(null);
    setProcesses([]);
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
            {selectedFolder ? `${selectedFolder.DisplayName} Süreçleri` : 'UiPath Klasörleri'}
          </h2>
          <p className="text-muted">
            {selectedFolder ? 'Bu klasöre tanımlanmış otomasyon süreçleri' : 'Orchestrator üzerindeki aktif klasörleriniz'}
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

      {loading && selectedFolder && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Loader2 className="spin" size={32} color="var(--primary)" />
          <p style={{ marginTop: '12px' }}>Süreçler yükleniyor...</p>
        </div>
      )}

      {!loading && !selectedFolder && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {folders.map(folder => (
            <div key={folder.Id} className="stat-card" style={{ cursor: 'pointer', transition: 'var(--transition)' }} onClick={() => handleFolderClick(folder)}>
              <div className="stat-header">
                <span>{folder.FullyQualifiedName}</span>
                <Folder size={18} color="var(--primary)" />
              </div>
              <div className="stat-value" style={{ fontSize: '1.2rem', marginTop: '12px' }}>{folder.DisplayName}</div>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '8px' }}>
                Tür: {folder.Type}
              </p>
            </div>
          ))}
          {folders.length === 0 && !error && (
            <div className="section-card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
              <p>Klasör bulunamadı.</p>
            </div>
          )}
        </div>
      )}

      {!loading && selectedFolder && (
        <div className="section-card">
          <div className="list-container">
            {processes.map(process => (
              <div key={process.Id} className="list-item" style={{ transition: 'var(--transition)' }}>
                <div className="item-info">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bot size={16} color="var(--primary)" /> {process.ProcessKey}
                  </h3>
                  <p>Versiyon: {process.Version} • ID: {process.Id}</p>
                  {process.Description && <p className="text-muted" style={{fontSize: '0.8rem'}}>{process.Description}</p>}
                </div>
                <button className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Play size={14} /> Çalıştır
                </button>
              </div>
            ))}
            {processes.length === 0 && !error && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p className="text-muted">Bu klasörde yayınlanmış süreç bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RobotsView;
