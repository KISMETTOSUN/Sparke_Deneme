import React, { useState, useEffect } from 'react';
import {
  Save, Loader2, CheckCircle, AlertCircle, X,
  ChevronRight, Check, Mail, Database, FileText,
  Shield, Key, User, Globe, Server, Cloud, Send
} from 'lucide-react';
import { fetchConnections, saveExternalConnection, fetchConnectionConfig } from './api';
import './App.css';

function ConnectionsView() {
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState([]);
  const [formFeedback, setFormFeedback] = useState({ type: null, message: '' });

  // Dynamic form state
  const [formData, setFormData] = useState({});

  const apps = [
    {
      id: 'gmail', name: 'Gmail', icon: <Mail size={24} />, fields: [
        { id: 'email', label: 'Gmail Adresi', type: 'email', placeholder: 'adiniz@gmail.com', icon: <User size={18} /> },
        { id: 'app_password', label: 'Uygulama Şifresi (Gerekli)', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx', icon: <Key size={18} /> }
      ]
    },
    {
      id: 'telegram', name: 'Telegram Bot', icon: <Send size={24} />, fields: [
        { id: 'bot_token', label: 'Bot Token (BotFather\'dan alın)', type: 'password', placeholder: '123456789:AAF...', icon: <Key size={18} /> }
      ]
    },
    {
      id: 'influxdb', name: 'InfluxDB', icon: <Database size={24} />, fields: [
        { id: 'url', label: 'Sunucu URL', type: 'text', placeholder: 'https://...', icon: <Globe size={18} /> },
        { id: 'token', label: 'API Token', type: 'password', placeholder: 'token...', icon: <Shield size={18} /> },
        { id: 'organization', label: 'Organization', type: 'text', placeholder: 'Org Name', icon: <Server size={18} /> },
        { id: 'bucket', label: 'Bucket', type: 'text', placeholder: 'Bucket Name', icon: <FileText size={18} /> }
      ]
    },
    {
      id: 'notion', name: 'Notion', icon: <FileText size={24} />, fields: [
        { id: 'token', label: 'Integration Token', type: 'password', placeholder: 'secret_...', icon: <Key size={18} /> },
        { id: 'database_id', label: 'Database ID', type: 'text', placeholder: 'Database identifier', icon: <Database size={18} /> }
      ]
    },
    {
      id: 'weatherstack', name: 'Hava Durumu', icon: <Cloud size={24} />, fields: [
        { id: 'site_name', label: 'Site İsmi', type: 'text', placeholder: 'weatherstack', icon: <Globe size={18} /> },
        { id: 'username', label: 'Kullanıcı Adı', type: 'text', placeholder: 'adiniz', icon: <User size={18} /> },
        { id: 'password', label: 'Şifre', type: 'password', placeholder: 'xxxx', icon: <Key size={18} /> },
        { id: 'api_url', label: 'API Adresi', type: 'text', placeholder: 'https://api.weatherstack.com/...', icon: <Server size={18} /> }
      ]
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
      setFormFeedback({ type: 'error', message: 'Kaydedilirken hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  const isConnected = (appId) => connections.some(c => c.app_name === appId);

  if (loading) {
    return (
      <div className="section-card fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 className="spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="connections-view fade-in">
      <div className="dashboard-sections" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
        {/* Left Side: App Selection */}
        <div className="section-card">
          <div className="section-header">
            <h2>Uygulama Seçimi</h2>
            <p>Bağlantı ayarlarını düzenlemek istediğiniz servisi seçin.</p>
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
            ))}
          </div>
        </div>

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
                      required={field.id !== 'database_id'}
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

      <style dangerouslySetInnerHTML={{
        __html: `
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
