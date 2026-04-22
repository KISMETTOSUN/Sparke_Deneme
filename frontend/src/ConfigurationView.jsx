import React, { useState, useEffect } from 'react';
import { Save, Loader2, Clock, CheckCircle, AlertCircle, X, ChevronRight, Check } from 'lucide-react';
import { fetchConfig, saveConfig } from './api';
import './App.css';

// SVG Logos
const InfluxLogo = () => (
  <svg width="40" height="40" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M128 12L228.462 70V186L128 244L27.5385 186V70L128 12Z" fill="#1C182A"/>
    <path d="M128 42L199.013 83V173L128 214L56.9872 173V83L128 42Z" fill="#22ADD8"/>
    <path d="M128 65L178.66 94.25V161.75L128 191L77.3397 161.75V94.25L128 65Z" fill="#9358F7"/>
  </svg>
);

const UiPathLogo = () => (
  <svg width="40" height="40" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" rx="24" fill="#000000"/>
    <path d="M68 84C68 84 94 84 108 84C122 84 136 94 136 112C136 130 122 140 108 140H68V84Z" fill="#FA4616"/>
    <path d="M148 112C148 112 174 112 188 112C202 112 216 122 216 140C216 158 202 168 188 168H148V112Z" fill="#000000"/>
    <rect x="68" y="140" width="32" height="32" fill="#FA4616"/>
    <rect x="148" y="168" width="32" height="32" fill="#FA4616"/>
    <rect x="184" y="68" width="32" height="32" fill="#FA4616"/>
    <path d="M148 112V68H184V112H148Z" fill="#000000"/>
    <rect x="104" y="140" width="32" height="32" fill="#000000"/>
  </svg>
);

function ConfigurationView() {
  const [activeModal, setActiveModal] = useState(null); // 'uipath' or 'influx'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdate, setLastUpdate] = useState({ uipath: null, seeme: null });
  
  const [formFeedback, setFormFeedback] = useState({ type: null, message: '' });

  const [uipathForm, setUipathForm] = useState({
    url: '', tenant: '', client_id: '', client_secret: '', deployment_type: 'cloud', orch_tenant_id: ''
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
          deployment_type: uipathData.deployment_type || 'cloud',
          orch_tenant_id: uipathData.orch_tenant_id || ''
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

  const handleSave = async (e, type) => {
    e.preventDefault();
    setSaving(true);
    setFormFeedback({ type: null, message: '' });
    
    try {
      if (type === 'uipath') {
        const response = await saveConfig('uipath', uipathForm);
        setLastUpdate(prev => ({ ...prev, uipath: response.last_update }));
        setFormFeedback({ type: 'success', message: 'UiPath konfigürasyonu başarıyla doğrulandı ve kaydedildi.' });
      } else {
        const response = await saveConfig('seeme', seemeForm);
        setLastUpdate(prev => ({ ...prev, seeme: response.last_update }));
        setFormFeedback({ type: 'success', message: 'InfluxDB bağlantısı başarıyla doğrulandı ve kaydedildi.' });
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

  const openAppModal = (appId) => {
    setActiveModal(appId);
    setFormFeedback({ type: null, message: '' });
  };

  if (loading) {
    return (
      <div className="section-card fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 className="spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  // Determine App Connection Statuses
  const isUiPathConnected = !!lastUpdate.uipath;
  const isInfluxConnected = !!lastUpdate.seeme;

  return (
    <div className="integration-hub fade-in">
      <header style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '8px' }}>Sistem Konfigürasyonu</h2>
        <p className="text-muted">Uygulamanın temel olarak ihtiyaç duyduğu çekirdek sistem ayarlarını buradan yapılandırın.</p>
      </header>

      {/* Grid of Intgration Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        
        {/* InfluxDB Integration Card */}
        <div className="stat-card interaction-card" onClick={() => openAppModal('influx')} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ background: '#222', padding: '12px', borderRadius: '12px' }}>
                <InfluxLogo />
              </div>
              <div className={`badge ${isInfluxConnected ? 'success-status' : 'pending-status'}`} style={{ display: 'flex', gap: '4px', alignItems: 'center', background: isInfluxConnected ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 255, 255, 0.1)', color: isInfluxConnected ? '#4ade80' : 'var(--text-dim)' }}>
                {isInfluxConnected ? <><Check size={12}/> Bağlı</> : 'Bağlı Değil'}
              </div>
            </div>
            
            <div style={{ flexGrow: 1 }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>SeeMe (InfluxDB)</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>Zaman serisi veritabanı entegrasyonu. (SeeMe verilerinin saklanması için)</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '500', fontSize: '0.9rem', marginTop: '12px' }}>
               Yapılandır <ChevronRight size={16} />
            </div>
          </div>
        </div>

        {/* UiPath Integration Card */}
        <div className="stat-card interaction-card" onClick={() => openAppModal('uipath')} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ background: '#222', padding: '12px', borderRadius: '12px' }}>
                <UiPathLogo />
              </div>
              <div className={`badge ${isUiPathConnected ? 'success-status' : 'pending-status'}`} style={{ display: 'flex', gap: '4px', alignItems: 'center', background: isUiPathConnected ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 255, 255, 0.1)', color: isUiPathConnected ? '#4ade80' : 'var(--text-dim)' }}>
                {isUiPathConnected ? <><Check size={12}/> Bağlı</> : 'Bağlı Değil'}
              </div>
            </div>
            
            <div style={{ flexGrow: 1 }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>UiPath Orchestrator</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>Robot ve süreç yönetimi için UiPath bağlantılarını sağlar. (Cloud veya On-Prem)</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '500', fontSize: '0.9rem', marginTop: '12px' }}>
               Yapılandır <ChevronRight size={16} />
            </div>
          </div>
        </div>

      </div>

      {/* --- MODALS --- */}
      {activeModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
          
          <div className="modal-content section-card fade-in" style={{ width: '480px', maxWidth: '95%', padding: '32px', position: 'relative', overflow: 'hidden' }}>
            
            {/* Close Button */}
            <button 
              onClick={() => setActiveModal(null)} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', zIndex: 10 }}
            >
              <X size={20} />
            </button>

            {/* UiPath Modal Content */}
            {activeModal === 'uipath' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: '#222', padding: '8px', borderRadius: '8px' }}><UiPathLogo /></div>
                  <div>
                    <h3 style={{ fontSize: '1.3rem' }}>UiPath Konfigürasyonu</h3>
                    {lastUpdate.uipath && (
                      <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', marginTop: '4px' }}>
                        <Clock size={12} /> Güncelleme: {new Date(lastUpdate.uipath).toLocaleString('tr-TR')}
                      </span>
                    )}
                  </div>
                </div>
                
                {formFeedback.type === 'error' && (
                  <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <AlertCircle size={18} /> {formFeedback.message}
                  </div>
                )}
                {formFeedback.type === 'success' && (
                  <div style={{ background: '#dcfce3', color: '#166534', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} /> {formFeedback.message}
                  </div>
                )}

                <form className="form-layout" autoComplete="off" onSubmit={(e) => handleSave(e, 'uipath')}>
                  <div className="form-group">
                    <label>Dağıtım Türü</label>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '8px', marginBottom: '8px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Tenant Adı (Logical Name)</label>
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
                      <label>Tenant ID (Numerik)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="123456" 
                        autoComplete="new-string"
                        value={uipathForm.orch_tenant_id}
                        onChange={e => setUipathForm({...uipathForm, orch_tenant_id: e.target.value})}
                      />
                    </div>
                  </div>
                  <p className="text-muted" style={{fontSize: '0.75rem', marginTop: '-12px', marginBottom: '16px'}}>
                    Orchestrator URL'deki numerik ID (Örn: .../orchestrator_/?tid=<b>123456</b>)
                  </p>
                  
                  <div className="form-group">
                    <label>Client ID</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Uygulama (Client) kimliğini girin" 
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
                  
                  <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '20px 0' }}></div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" className="btn" onClick={() => setActiveModal(null)} style={{ background: 'transparent' }}>Vazgeç</button>
                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} disabled={saving}>
                      {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} 
                      {saving ? 'Doğrulanıyor...' : 'Bağlan'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* InfluxDB Modal Content */}
            {activeModal === 'influx' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: '#222', padding: '8px', borderRadius: '8px' }}><InfluxLogo /></div>
                  <div>
                    <h3 style={{ fontSize: '1.3rem' }}>SeeMe (InfluxDB) Konfigürasyonu</h3>
                    {lastUpdate.seeme && (
                      <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', marginTop: '4px' }}>
                        <Clock size={12} /> Güncelleme: {new Date(lastUpdate.seeme).toLocaleString('tr-TR')}
                      </span>
                    )}
                  </div>
                </div>
                
                {formFeedback.type === 'error' && (
                  <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <AlertCircle size={18} /> {formFeedback.message}
                  </div>
                )}
                {formFeedback.type === 'success' && (
                  <div style={{ background: '#dcfce3', color: '#166534', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} /> {formFeedback.message}
                  </div>
                )}

                <form className="form-layout" autoComplete="off" onSubmit={(e) => handleSave(e, 'influx')}>
                  <div className="form-group">
                    <label>Sunucu URL</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="https://eu-central-1-1.aws.cloud2.influxdata.com" 
                      autoComplete="new-string"
                      value={seemeForm.url}
                      onChange={e => setSeemeForm({...seemeForm, url: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>API Token</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Okuma ve yazma yetkisi olan Token bilginizi girin" 
                      autoComplete="new-password"
                      value={seemeForm.token}
                      onChange={e => setSeemeForm({...seemeForm, token: e.target.value})}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Organization</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Org Adı" 
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
                        placeholder="Bucket Adı" 
                        autoComplete="new-string"
                        value={seemeForm.bucket}
                        onChange={e => setSeemeForm({...seemeForm, bucket: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '24px 0 20px 0' }}></div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" className="btn" onClick={() => setActiveModal(null)} style={{ background: 'transparent' }}>Vazgeç</button>
                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} disabled={saving}>
                      {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} 
                      {saving ? 'Doğrulanıyor...' : 'Bağlan'}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export default ConfigurationView;
