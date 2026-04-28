import React, { useState, useEffect } from 'react';
import { 
<<<<<<< HEAD
  Save, Loader2, Clock, CheckCircle, AlertCircle, X, 
  ChevronRight, Check, Mail, Database, FileText, Trash2 
} from 'lucide-react';
import { fetchConnections, fetchConnectionConfig, saveExternalConnection, deleteExternalConnection, fetchConfig } from './api';
=======
  Save, Loader2, CheckCircle, AlertCircle, X, 
  ChevronRight, Check, Mail, Database, FileText,
  Shield, Key, User, Globe, Server
} from 'lucide-react';
import { fetchConnections, saveExternalConnection, fetchConnectionConfig } from './api';
>>>>>>> da49def (Fix triggers and add event configurations)
import './App.css';

function ConnectionsView() {
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [connections, setConnections] = useState([]);
  const [formFeedback, setFormFeedback] = useState({ type: null, message: '' });

  // Dynamic form state
  const [formData, setFormData] = useState({});

  const apps = [
<<<<<<< HEAD
    { 
      id: 'gmail', 
      name: 'Gmail', 
      description: 'E-posta servisleri üzerinden bildirim ve veri akışı sağlar.', 
      logo: (color = "white") => (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 18H4V8L12 13L20 8V18ZM12 11L4 6H20L12 11Z" fill={color}/>
        </svg>
      ),
      bgColor: '#EA4335',
      textColor: 'white'
    },
    { 
      id: 'influxdb', 
      name: 'InfluxDB', 
      description: 'Zaman serisi veritabanı entegrasyonu.', 
      logo: (color = "white") => (
        <svg width="48" height="48" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M128 12L228.462 70V186L128 244L27.5385 186V70L128 12Z" fill="rgba(255,255,255,0.2)"/>
          <path d="M128 42L199.013 83V173L128 214L56.9872 173V83L128 42Z" fill="white"/>
          <path d="M128 65L178.66 94.25V161.75L128 191L77.3397 161.75V94.25L128 65Z" fill="rgba(255,255,255,0.5)"/>
        </svg>
      ),
      bgColor: '#22ADD8',
      textColor: 'white'
    },
    { 
      id: 'notion', 
      name: 'Notion', 
      description: 'Notlar, veritabanları ve iş akışı yönetimi entegrasyonu.', 
      logo: (color = "white") => (
        <svg width="48" height="48" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M256 24.2353V231.765C256 245.149 245.149 256 231.765 256H24.2353C10.8509 256 0 245.149 0 231.765V24.2353C0 10.8509 10.8509 0 24.2353 0H231.765C245.149 0 256 10.8509 256 24.2353Z" fill="white"/>
          <path d="M198.374 207.283H176.626L166.726 195.309L89.5445 194.269V64.0624H103.447L181.543 149.957L190.473 162.24H192.454L192.454 48.7174H214.202V187.218L214.202 195.309H198.374V207.283ZM41.7978 187.218V64.0624H52.7051L85.4022 66.115H85.4022L85.4022 110.158V187.218H74.5029L41.7978 187.218ZM41.7978 195.309H85.4022V207.283H41.7978V195.309Z" fill="black"/>
        </svg>
      ),
      bgColor: '#000000',
      textColor: 'white'
    }
=======
    { id: 'gmail', name: 'Gmail', icon: <Mail size={24} />, fields: [
      { id: 'email', label: 'Gmail Adresi', type: 'email', placeholder: 'adiniz@gmail.com', icon: <User size={18}/> },
      { id: 'app_password', label: 'Uygulama Şifresi (Gerekli)', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx', icon: <Key size={18}/> }
    ]},
    { id: 'influxdb', name: 'InfluxDB', icon: <Database size={24} />, fields: [
      { id: 'url', label: 'Sunucu URL', type: 'text', placeholder: 'https://...', icon: <Globe size={18}/> },
      { id: 'token', label: 'API Token', type: 'password', placeholder: 'token...', icon: <Shield size={18}/> },
      { id: 'organization', label: 'Organization', type: 'text', placeholder: 'Org Name', icon: <Server size={18}/> },
      { id: 'bucket', label: 'Bucket', type: 'text', placeholder: 'Bucket Name', icon: <FileText size={18}/> }
    ]},
    { id: 'notion', name: 'Notion', icon: <FileText size={24} />, fields: [
      { id: 'token', label: 'Integration Token', type: 'password', placeholder: 'secret_...', icon: <Key size={18}/> },
      { id: 'database_id', label: 'Database ID', type: 'text', placeholder: 'Database identifier', icon: <Database size={18}/> }
    ]}
>>>>>>> da49def (Fix triggers and add event configurations)
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const connData = await fetchConnections();
      setConnections(connData || []);
    } catch (err) {
      console.error("Bağlantılar yüklenirken hata oluştu", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAppSelect = async (app) => {
    setSelectedApp(app);
    setFormFeedback({ type: null, message: '' });
    
    // Initialize form with existing config if available
    try {
      const resp = await fetchConnectionConfig(app.id);
      if (resp && resp.config) {
        setFormData(resp.config);
      } else {
        // Reset form for new selection
        const initialForm = {};
        app.fields.forEach(f => initialForm[f.id] = '');
        setFormData(initialForm);
      }
    } catch (e) {
      const initialForm = {};
      app.fields.forEach(f => initialForm[f.id] = '');
      setFormData(initialForm);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    setSaving(true);
    setFormFeedback({ type: null, message: '' });

    try {
      await saveExternalConnection(selectedApp.id, formData);
      setFormFeedback({ type: 'success', message: `${selectedApp.name} bağlantı ayarları kaydedildi.` });
      loadData();
    } catch (err) {
      setFormFeedback({ type: 'error', message: err.response?.data?.error || 'Kaydedilirken hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

<<<<<<< HEAD
  const handleDelete = async (type) => {
    if (!window.confirm('Bağlantıyı silmek istediğinize emin misiniz?')) return;
    setDeleting(true);
    setFormFeedback({ type: null, message: '' });

    try {
      await deleteExternalConnection(type);
      setFormFeedback({ type: 'success', message: 'Bağlantı silindi.' });
      loadData();
      
      if (type === 'gmail') setGmailForm({ email: '', app_password: '' });
      if (type === 'notion') setNotionForm({ token: '', database_id: '' });
      if (type === 'influxdb') setInfluxForm({ url: '', token: '', organization: '', bucket: '' });
      
      setTimeout(() => setActiveModal(null), 1500);
    } catch (err) {
      setFormFeedback({ type: 'error', message: 'Silinirken hata oluştu.' });
    } finally {
      setDeleting(false);
    }
  };

  // Sorting logic: Connected apps first
=======
>>>>>>> da49def (Fix triggers and add event configurations)
  const isConnected = (appId) => connections.some(c => c.app_name === appId);

  if (loading) {
    return (
      <div className="section-card fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 className="spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="integration-hub fade-in" style={{ padding: '40px 0' }}>
      <header>
        <h1 className="ifttt-header">Keşfet</h1>
        <p className="ifttt-subheader">Sparke'ı favori servislerinize bağlayarak gücünü artırın. Bağlı servisleriniz otomatik olarak en üstte listelenir.</p>
      </header>

      <div className="ifttt-grid">
        {sortedApps.map(app => (
          <div 
            key={app.id} 
            className="ifttt-card" 
            onClick={() => handleOpenModal(app.id)} 
            style={{ backgroundColor: app.bgColor, color: app.textColor }}
          >
            {isConnected(app.id) && (
              <div className="ifttt-badge">
                <Check size={14}/> Bağlı
              </div>
            )}
            
            <div className="ifttt-card-logo">
              {app.logo(app.textColor)}
            </div>
            
            <h3 className="ifttt-card-title">{app.name}</h3>
            <p className="ifttt-card-desc">{app.description}</p>
=======
    <div className="connections-view fade-in">
      <div className="dashboard-sections" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
        
        {/* Left Side: App Selection */}
        <div className="section-card">
          <div className="section-header">
            <h2>Uygulama Seçimi</h2>
            <p>Bağlantı ayarlarını düzenlemek istediğiniz servisi seçin.</p>
>>>>>>> da49def (Fix triggers and add event configurations)
          </div>
          <div className="list-container">
            {apps.map(app => (
              <div 
                key={app.id} 
                className={`list-item ${selectedApp?.id === app.id ? 'active-item' : ''}`}
                onClick={() => handleAppSelect(app)}
                style={{ cursor: 'pointer', border: selectedApp?.id === app.id ? '1px solid var(--primary)' : '1px solid transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    padding: '10px', 
                    borderRadius: '10px', 
                    background: selectedApp?.id === app.id ? 'var(--primary)' : 'var(--border)',
                    color: selectedApp?.id === app.id ? 'white' : 'var(--text-main)'
                  }}>
                    {app.icon}
                  </div>
                  <div className="item-info">
                    <h3>{app.name}</h3>
                    <p>{isConnected(app.id) ? 'Bağlantı Aktif' : 'Yapılandırılmamış'}</p>
                  </div>
                </div>
                {isConnected(app.id) && <CheckCircle size={18} color="var(--success)" />}
              </div>
<<<<<<< HEAD
            )}

            <form onSubmit={(e) => handleSave(e, activeModal)}>
              {activeModal === 'gmail' && (
                <>
                  <div className="form-group"><label>Gmail Adresi</label><input type="email" className="form-control" value={gmailForm.email} onChange={e => setGmailForm({...gmailForm, email: e.target.value})} placeholder="ornek@gmail.com" required /></div>
                  <div className="form-group"><label>App Password</label><input type="password" className="form-control" value={gmailForm.app_password} onChange={e => setGmailForm({...gmailForm, app_password: e.target.value})} placeholder="••••••••••••••••" required /></div>
                </>
              )}
              {activeModal === 'notion' && (
                <>
                  <div className="form-group"><label>Internal Integration Token</label><input type="password" className="form-control" value={notionForm.token} onChange={e => setNotionForm({...notionForm, token: e.target.value})} placeholder="secret_..." required /></div>
                  <div className="form-group"><label>Database ID (İsteğe Bağlı)</label><input type="text" className="form-control" value={notionForm.database_id} onChange={e => setNotionForm({...notionForm, database_id: e.target.value})} placeholder="Veritabanı Kimliği" /></div>
                </>
              )}
              {activeModal === 'influxdb' && (
                <>
                   <div className="form-group"><label>Sunucu URL</label><input type="text" className="form-control" value={influxForm.url} onChange={e => setInfluxForm({...influxForm, url: e.target.value})} placeholder="https://..." required /></div>
                   <div className="form-group"><label>API Token</label><input type="password" className="form-control" value={influxForm.token} onChange={e => setInfluxForm({...influxForm, token: e.target.value})} required /></div>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group"><label>Organization</label><input type="text" className="form-control" value={influxForm.organization} onChange={e => setInfluxForm({...influxForm, organization: e.target.value})} /></div>
                    <div className="form-group"><label>Bucket</label><input type="text" className="form-control" value={influxForm.bucket} onChange={e => setInfluxForm({...influxForm, bucket: e.target.value})} /></div>
                   </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <div>
                  {isConnected(activeModal) && (
                    <button type="button" className="btn" onClick={() => handleDelete(activeModal)} disabled={deleting || saving} style={{ background: '#fee2e2', color: '#991b1b' }}>
                      {deleting ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />} Sil
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn" onClick={() => setActiveModal(null)} style={{ background: 'transparent' }}>İptal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
                    {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} Bağlan
                  </button>
                </div>
              </div>
            </form>
=======
            ))}
>>>>>>> da49def (Fix triggers and add event configurations)
          </div>
        </div>

        {/* Right Side: Configuration Form */}
        <div className="section-card">
          {!selectedApp ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Globe size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p>Ayarları görüntülemek için soldan bir uygulama seçin.</p>
            </div>
          ) : (
            <div className="fade-in">
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2>{selectedApp.name} Ayarları</h2>
                  <p>Bağlantı için gerekli kimlik bilgilerini ve API detaylarını tanımlayın.</p>
                </div>
                <div className={`badge ${isConnected(selectedApp.id) ? 'success' : 'warning'}`} style={{ 
                  padding: '6px 12px', 
                  borderRadius: '20px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  background: isConnected(selectedApp.id) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: isConnected(selectedApp.id) ? 'var(--success)' : 'var(--running)'
                }}>
                  {isConnected(selectedApp.id) ? 'BAĞLI' : 'BEKLEMEDE'}
                </div>
              </div>

              {formFeedback.type && (
                <div style={{ 
                  padding: '12px 16px', 
                  marginBottom: '24px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  background: formFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: formFeedback.type === 'success' ? '#10b981' : '#ef4444',
                  fontSize: '0.9rem'
                }}>
                  {formFeedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  {formFeedback.message}
                </div>
              )}

              <form onSubmit={handleSave} className="form-layout" style={{ maxWidth: '100%' }}>
                {selectedApp.fields.map(field => (
                  <div key={field.id} className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {field.icon} {field.label}
                    </label>
                    <input 
                      type={field.type} 
                      className="form-control"
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.id !== 'database_id'} // Notion'da database_id opsiyonel olabilir demiştik
                    />
                  </div>
                ))}

                <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 24px', flex: 1, justifyContent: 'center' }}>
                    {saving ? <Loader2 className="spin" size={18} /> : <><Save size={18} /> Ayarları Kaydet</>}
                  </button>
                  <button type="button" className="btn" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }} onClick={() => handleAppSelect(selectedApp)}>
                    Sıfırla
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .list-item.active-item {
          background: rgba(237, 94, 118, 0.05);
        }
        .badge.success { color: var(--success); }
        .badge.warning { color: var(--running); }
      `}} />
    </div>
  );
}

export default ConnectionsView;
