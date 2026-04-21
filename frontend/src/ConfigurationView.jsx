import React, { useState } from 'react';
import { Settings, Server, Database } from 'lucide-react';
import './App.css';

function ConfigurationView() {
  const [activeTab, setActiveTab] = useState('uipath');

  return (
    <div className="configuration-container">
      <div className="tab-menu">
        <button 
          className={`tab-button ${activeTab === 'uipath' ? 'active' : ''}`}
          onClick={() => setActiveTab('uipath')}
        >
          <Server size={18} /> UiPath Konfigürasyonu
        </button>
        <button 
          className={`tab-button ${activeTab === 'seeme' ? 'active' : ''}`}
          onClick={() => setActiveTab('seeme')}
        >
          <Database size={18} /> SeeMe Konfigürasyonu
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'uipath' && (
          <div className="section-card fade-in">
            <h2>UiPath Konfigürasyonu</h2>
            <p className="text-muted">Orchestrator ve Robot bağlantı ayarlarınızı buradan yönetebilirsiniz.</p>
            
            <form className="form-layout" autoComplete="off" onSubmit={e => e.preventDefault()}>
              <div className="form-group">
                <label>Orchestrator URL</label>
                <input type="text" className="form-control" placeholder="https://cloud.uipath.com/..." autoComplete="new-string" />
              </div>
              <div className="form-group">
                <label>Tenant Adı</label>
                <input type="text" className="form-control" placeholder="DefaultTenant" autoComplete="new-string" />
              </div>
              <div className="form-group">
                <label>Client ID</label>
                <input type="text" className="form-control" placeholder="Client kimliğinizi girin" autoComplete="new-string" />
              </div>
              <div className="form-group">
                <label>Kullanıcı Anahtarı (User Key)</label>
                <input type="password" className="form-control" placeholder="••••••••" autoComplete="new-password" />
              </div>
              <button className="btn btn-primary" style={{marginTop: '16px'}}>Ayarları Kaydet</button>
            </form>
          </div>
        )}

        {activeTab === 'seeme' && (
          <div className="section-card fade-in">
            <h2>SeeMe Konfigürasyonu</h2>
            <p className="text-muted">Dış sistemlere aktarılacak SeeMe verilerinin konfigürasyonu.</p>
            
            <form className="form-layout" autoComplete="off" onSubmit={e => e.preventDefault()}>
              <div className="form-group">
                <label>SeeMe API Adresi</label>
                <input type="text" className="form-control" placeholder="https://api.seeme.com/..." autoComplete="new-string" />
              </div>
              <div className="form-group">
                <label>Erişim Token'ı</label>
                <input type="password" className="form-control" placeholder="Bearer..." autoComplete="new-password" />
              </div>
              <button className="btn btn-primary" style={{marginTop: '16px'}}>Ayarları Kaydet</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfigurationView;
