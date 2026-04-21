import React, { useState, useEffect } from 'react';
import { Settings, Server, Database, Save, Loader2, Clock, CheckCircle, AlertCircle, Globe, Layout } from 'lucide-react';
import { fetchConfig, saveConfig } from './api';
import './App.css';

function ConfigurationView() {
  const [activeTab, setActiveTab] = useState('uipath');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdate, setLastUpdate] = useState({ uipath: null, seeme: null });
  
  const [formFeedback, setFormFeedback] = useState({ type: null, message: '' });

  const [uipathForm, setUipathForm] = useState({
    url: '', tenant: '', client_id: '', client_secret: '', deployment_type: 'cloud'
  });

  const [seemeForm, setSeemeForm] = useState({
    url: '', token: '', organization: '', bucket: ''
  });

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const uipathData = await fetchConfig('uipath');
      if (uipathData) {
        setUipathForm({
          url: uipathData.url || '',
          tenant: uipathData.tenant || '',
          client_id: uipathData.client_id || '',
          client_secret: uipathData.client_secret || '',
          deployment_type: uipathData.deployment_type || 'cloud'
        });
        setLastUpdate(prev => ({ ...prev, uipath: uipathData.last_update }));
      }

      const seemeData = await fetchConfig('seeme');
      if (seemeData) {
        setSeemeForm({
          url: seemeData.url || '',
          token: seemeData.token || '',
          organization: seemeData.organization || '',
          bucket: seemeData.bucket || ''
        });
        setLastUpdate(prev => ({ ...prev, seeme: seemeData.last_update }));
      }
    } catch (err) {
      console.error("Konfigürasyonlar yüklenirken hata oluştu", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormFeedback({ type: null, message: '' });
    
    try {
      if (activeTab === 'uipath') {
        const response = await saveConfig('uipath', uipathForm);
        setLastUpdate(prev => ({ ...prev, uipath: response.last_update }));
        setFormFeedback({ type: 'success', message: 'UiPath konfigürasyonu başarıyla doğrulandı ve kaydedildi.' });
      } else {
        const response = await saveConfig('seeme', seemeForm);
        setLastUpdate(prev => ({ ...prev, seeme: response.last_update }));
        setFormFeedback({ type: 'success', message: 'SeeMe InfluxDB bağlantısı başarıyla doğrulandı ve kaydedildi.' });
      }
    } catch (err) {
      setFormFeedback({ 
        type: 'error', 
        message: err.response?.data?.error || 'Ayarlar kaydedilirken bilinmeyen bir ağ hatası oluştu.' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="section-card fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 className="spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="configuration-container">
      <div className="tab-menu">
        <button 
          className={`tab-button ${activeTab === 'uipath' ? 'active' : ''}`}
          onClick={() => { setActiveTab('uipath'); setFormFeedback({type: null, message: ''}); }}
        >
          <Server size={18} /> UiPath Konfigürasyonu
        </button>
        <button 
          className={`tab-button ${activeTab === 'seeme' ? 'active' : ''}`}
          onClick={() => { setActiveTab('seeme'); setFormFeedback({type: null, message: ''}); }}
        >
          <Database size={18} /> SeeMe Konfigürasyonu
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'uipath' && (
          <div className="section-card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>UiPath Konfigürasyonu</h2>
              {lastUpdate.uipath && (
                <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <Clock size={14} /> Son Güncelleme: {new Date(lastUpdate.uipath).toLocaleString('tr-TR')}
                </span>
              )}
            </div>
            <p className="text-muted">Orchestrator ve Robot bağlantı ayarlarınızı buradan yönetebilirsiniz.</p>
            
            {formFeedback.type === 'error' && (
              <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertCircle size={18} /> {formFeedback.message}
              </div>
            )}
            {formFeedback.type === 'success' && (
              <div style={{ background: '#dcfce3', color: '#166534', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} /> {formFeedback.message}
              </div>
            )}

            <form className="form-layout" autoComplete="off" onSubmit={handleSave}>
              <div className="form-group">
                <label>Dağıtım Türü</label>
                <div style={{ display: 'flex', gap: '20px', marginTop: '8px', marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                    <input 
                      type="radio" 
                      name="deployment_type" 
                      checked={uipathForm.deployment_type === 'cloud'} 
                      onChange={() => setUipathForm({...uipathForm, deployment_type: 'cloud'})} 
                    />
                    Cloud
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                    <input 
                      type="radio" 
                      name="deployment_type" 
                      checked={uipathForm.deployment_type === 'onprem'} 
                      onChange={() => setUipathForm({...uipathForm, deployment_type: 'onprem'})} 
                    />
                    On-Premise (Local)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Orchestrator URL</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={uipathForm.deployment_type === 'cloud' ? "https://cloud.uipath.com/organizasyon" : "https://uipath.sirketiniz.com"} 
                  autoComplete="new-string" 
                  value={uipathForm.url}
                  onChange={e => setUipathForm({...uipathForm, url: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Tenant Adı</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="DefaultTenant" 
                  autoComplete="new-string"
                  value={uipathForm.tenant}
                  onChange={e => setUipathForm({...uipathForm, tenant: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Client ID</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Client kimliğinizi girin" 
                  autoComplete="new-string"
                  value={uipathForm.client_id}
                  onChange={e => setUipathForm({...uipathForm, client_id: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Client Secret</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••" 
                  autoComplete="new-password"
                  value={uipathForm.client_secret}
                  onChange={e => setUipathForm({...uipathForm, client_secret: e.target.value})}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center'}} disabled={saving}>
                {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} 
                {saving ? 'Bağlantı Sınanıyor...' : 'Doğrula ve Kaydet'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'seeme' && (
          <div className="section-card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>SeeMe Konfigürasyonu</h2>
              {lastUpdate.seeme && (
                <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <Clock size={14} /> Son Güncelleme: {new Date(lastUpdate.seeme).toLocaleString('tr-TR')}
                </span>
              )}
            </div>
            <p className="text-muted">Dış sistemlere aktarılacak SeeMe verilerinin konfigürasyonu.</p>
            
            {formFeedback.type === 'error' && (
              <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertCircle size={18} /> {formFeedback.message}
              </div>
            )}
            {formFeedback.type === 'success' && (
              <div style={{ background: '#dcfce3', color: '#166534', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} /> {formFeedback.message}
              </div>
            )}

            <form className="form-layout" autoComplete="off" onSubmit={handleSave}>
              <div className="form-group">
                <label>URL</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="https://..." 
                  autoComplete="new-string"
                  value={seemeForm.url}
                  onChange={e => setSeemeForm({...seemeForm, url: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Token</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Token bilginizi girin" 
                  autoComplete="new-password"
                  value={seemeForm.token}
                  onChange={e => setSeemeForm({...seemeForm, token: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Organization</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Organizasyon adı" 
                  autoComplete="new-string"
                  value={seemeForm.organization}
                  onChange={e => setSeemeForm({...seemeForm, organization: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Bucket</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Bucket adı" 
                  autoComplete="new-string"
                  value={seemeForm.bucket}
                  onChange={e => setSeemeForm({...seemeForm, bucket: e.target.value})}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center'}} disabled={saving}>
                {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} 
                {saving ? 'Bağlantı Sınanıyor...' : 'Doğrula ve Kaydet'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfigurationView;
