import React, { useState, useEffect } from 'react';
import { 
  Save, Loader2, Clock, CheckCircle, AlertCircle, X, 
  ChevronRight, Check, Mail, Database, FileText 
} from 'lucide-react';
import { fetchConnections, fetchConnectionConfig, saveExternalConnection, fetchConfig } from './api';
import './App.css';

// SVG Logos
const GmailLogo = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 18H4V8L12 13L20 8V18ZM12 11L4 6H20L12 11Z" fill="#EA4335"/>
  </svg>
);

const NotionLogo = () => (
  <svg width="40" height="40" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M256 24.2353V231.765C256 245.149 245.149 256 231.765 256H24.2353C10.8509 256 0 245.149 0 231.765V24.2353C0 10.8509 10.8509 0 24.2353 0H231.765C245.149 0 256 10.8509 256 24.2353Z" fill="white"/>
    <path d="M198.374 207.283H176.626L166.726 195.309L89.5445 194.269V64.0624H103.447L181.543 149.957L190.473 162.24H192.454L192.454 48.7174H214.202V187.218L214.202 195.309H198.374V207.283ZM41.7978 187.218V64.0624H52.7051L85.4022 66.115H85.4022L85.4022 110.158V187.218H74.5029L41.7978 187.218ZM41.7978 195.309H85.4022V207.283H41.7978V195.309Z" fill="black"/>
  </svg>
);

const InfluxLogo = () => (
  <svg width="40" height="40" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M128 12L228.462 70V186L128 244L27.5385 186V70L128 12Z" fill="#1C182A"/>
    <path d="M128 42L199.013 83V173L128 214L56.9872 173V83L128 42Z" fill="#22ADD8"/>
    <path d="M128 65L178.66 94.25V161.75L128 191L77.3397 161.75V94.25L128 65Z" fill="#9358F7"/>
  </svg>
);

function ConnectionsView() {
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState([]);
  const [formFeedback, setFormFeedback] = useState({ type: null, message: '' });

  // Specific Forms state
  const [gmailForm, setGmailForm] = useState({ email: '', app_password: '' });
  const [notionForm, setNotionForm] = useState({ token: '', database_id: '' });
  const [influxForm, setInfluxForm] = useState({ url: '', token: '', organization: '', bucket: '' });

  const apps = [
    { id: 'gmail', name: 'Gmail', description: 'E-posta servisleri üzerinden bildirim ve veri akışı sağlar.', logo: <GmailLogo /> },
    { id: 'influxdb', name: 'InfluxDB', description: 'Zaman serisi veritabanı entegrasyonu.', logo: <InfluxLogo /> },
    { id: 'notion', name: 'Notion', description: 'Notlar, veritabanları ve iş akışı yönetimi entegrasyonu.', logo: <NotionLogo /> }
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
      setFormFeedback({ type: 'error', message: 'Kaydedilirken hata oluştu.' });
    } finally {
      setSaving(false);
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
    <div className="integration-hub fade-in">
      <header style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '8px' }}>Bağlantılar Merkezi</h2>
        <p className="text-muted">Dış sistem entegrasyonlarını buradan yönetin ve bağlı servislerinizi en üstte görün.</p>
      </header>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {sortedApps.map(app => (
          <div key={app.id} className="stat-card interaction-card" onClick={() => handleOpenModal(app.id)} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ background: '#222', padding: '12px', borderRadius: '12px' }}>
                  {app.logo}
                </div>
                {isConnected(app.id) && (
                  <div className="badge success-status" style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}>
                    <Check size={12}/> Bağlı
                  </div>
                )}
              </div>
              
              <div style={{ flexGrow: 1 }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{app.name}</h3>
                <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{app.description}</p>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '500', fontSize: '0.9rem', marginTop: '12px' }}>
                 Yapılandır <ChevronRight size={16} />
              </div>
            </div>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn" onClick={() => setActiveModal(null)} style={{ background: 'transparent' }}>İptal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} Bağlan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectionsView;
