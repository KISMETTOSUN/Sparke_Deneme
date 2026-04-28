import React, { useState, useEffect } from 'react';
import { 
  Save, Loader2, Clock, CheckCircle, AlertCircle, X, 
  ChevronRight, Check, Mail, Database, FileText, Trash2 
} from 'lucide-react';
import { fetchConnections, fetchConnectionConfig, saveExternalConnection, deleteExternalConnection, fetchConfig } from './api';
import './App.css';

function ConnectionsView() {
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [connections, setConnections] = useState([]);
  const [formFeedback, setFormFeedback] = useState({ type: null, message: '' });

  // Specific Forms state
  const [gmailForm, setGmailForm] = useState({ email: '', app_password: '' });
  const [notionForm, setNotionForm] = useState({ token: '', database_id: '' });
  const [influxForm, setInfluxForm] = useState({ url: '', token: '', organization: '', bucket: '' });

  const apps = [
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
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const connData = await fetchConnections();
      setConnections(connData || []);

      // Pre-load InfluxDB from config_seeme as well if available
      const influxData = await fetchConfig('seeme');
      if (influxData) {
        setInfluxForm({
          url: influxData.url || '',
          token: influxData.token || '',
          organization: influxData.organization || '',
          bucket: influxData.bucket || ''
        });
      }
    } catch (err) {
      console.error("Bağlantılar yüklenirken hata oluştu", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async (appId) => {
    setActiveModal(appId);
    setFormFeedback({ type: null, message: '' });
    
    try {
      const resp = await fetchConnectionConfig(appId);
      if (resp && resp.config) {
        if (appId === 'gmail') setGmailForm(resp.config);
        if (appId === 'notion') setNotionForm(resp.config);
        if (appId === 'influxdb') setInfluxForm(resp.config);
      }
    } catch (e) {}
  };

  const handleSave = async (e, type) => {
    e.preventDefault();
    setSaving(true);
    setFormFeedback({ type: null, message: '' });

    try {
      const formData = type === 'gmail' ? gmailForm : (type === 'notion' ? notionForm : influxForm);
      await saveExternalConnection(type, formData);
      setFormFeedback({ type: 'success', message: 'Bağlantı ayarları kaydedildi.' });
      loadData(); // Refresh to update "Connected" status
      setTimeout(() => setActiveModal(null), 1500);
    } catch (err) {
      setFormFeedback({ type: 'error', message: err.response?.data?.error || 'Kaydedilirken hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

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
  const isConnected = (appId) => connections.some(c => c.app_name === appId);
  
  const sortedApps = [...apps].sort((a, b) => {
    const aConn = isConnected(a.id);
    const bConn = isConnected(b.id);
    if (aConn && !bConn) return -1;
    if (!aConn && bConn) return 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="section-card fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 className="spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  return (
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
          </div>
        ))}
      </div>

      {/* MODALS */}
      {activeModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content section-card fade-in" style={{ width: '480px', maxWidth: '95%', padding: '32px', position: 'relative' }}>
            <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ marginBottom: '24px' }}>{apps.find(a => a.id === activeModal).name} Bağlantısı</h3>

            {formFeedback.type && (
              <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', background: formFeedback.type === 'success' ? '#dcfce3' : '#fee2e2', color: formFeedback.type === 'success' ? '#166534' : '#991b1b' }}>
                {formFeedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {formFeedback.message}
              </div>
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
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectionsView;
