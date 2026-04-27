const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { encrypt, decrypt } = require('./encryption');
const { getUiPathToken, getUiPathODataUrl } = require('./uipath_utils');
const imaps = require('imap-simple');
const { InfluxDB } = require('@influxdata/influxdb-client');

const influxStates = new Map(); // Store previous counter values


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

// --- Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Geliştirme/Bypass modu: Eğer token yoksa ana admin olarak kabul et
    if (!token) {
        req.user = { id: 1, username: 'admin' };
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Hata olsa bile kolaylık için admin'e izin ver
            req.user = { id: 1, username: 'admin' };
            return next();
        }
        req.user = user;
        next();
    });
};

// --- Auth Endpoints ---

// Register (for setup)
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const encryptedPassword = encrypt(password);

    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, encryptedPassword], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'User registered', id: result.insertId });
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(400).json({ error: 'User not found' });

        const user = results[0];
        try {
            const decryptedPassword = decrypt(user.password);
            if (decryptedPassword !== password) {
                return res.status(403).json({ error: 'Invalid password' });
            }

            const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, user: { id: user.id, username: user.username } });
        } catch (e) {
            res.status(500).json({ error: 'Decryption failed' });
        }
    });
});

// --- Protected Endpoints ---

// GET my robots
app.get('/api/robots', authenticateToken, (req, res) => {
    db.query('SELECT * FROM robots WHERE user_id = ? OR user_id IS NULL', [req.user.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// GET my activity logs
app.get('/api/activity', authenticateToken, (req, res) => {
    db.query('SELECT * FROM activity_logs WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC LIMIT 10', [req.user.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// POST trigger robot
app.post('/api/trigger/:id', authenticateToken, (req, res) => {
    const robotId = req.params.id;

    db.query('SELECT name FROM robots WHERE id = ?', [robotId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Robot not found' });

        const robotName = results[0].name;

        db.query('UPDATE robots SET status = "running" WHERE id = ?', [robotId], (err) => {
            if (err) return res.status(500).json(err);

            const timestamp = new Date().toLocaleTimeString();
            db.query('INSERT INTO activity_logs (robot_id, robot_name, timestamp, duration, status, user_id) VALUES (?, ?, ?, ?, ?, ?)',
                [robotId, robotName, timestamp, '...', 'Running', req.user.id], (err) => {
                    if (err) return res.status(500).json(err);
                    res.json({ message: 'Robot triggered', robotId, robotName });
                }
            );
        });
    });
});

// --- Config Endpoints ---

// GET config (UiPath & SeeMe)
app.get('/api/config/:type', authenticateToken, (req, res) => {
    const table = req.params.type === 'uipath' ? 'config_uipath' : 'config_seeme';
    const secretField = req.params.type === 'uipath' ? 'client_secret' : 'token';

    db.query(`SELECT * FROM ${table} WHERE user_id = ?`, [req.user.id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.json(null);

        const config = results[0];
        if (config[secretField]) {
            try { config[secretField] = decrypt(config[secretField]); } catch (e) { }
        }
        res.json(config);
    });
});

// POST config (UiPath)
app.post('/api/config/uipath', authenticateToken, async (req, res) => {
    const { url, tenant, client_id, client_secret, deployment_type, orch_tenant_id } = req.body;

    // --- UiPath Validation ---
    try {
        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        let identityUrl = '';

        if (deployment_type === 'cloud') {
            identityUrl = 'https://cloud.uipath.com/identity_/connect/token';
        } else {
            // User explicitly chose On-Premise
            identityUrl = `${cleanUrl}/identity/connect/token`;
        }

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', client_id);
        params.append('client_secret', client_secret);

        const response = await fetch(identityUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (!response.ok) {
            const errObj = await response.json().catch(() => ({}));
            const lastError = errObj.error || response.statusText;
            return res.status(400).json({ error: `UiPath Doğrulama Başarısız (${deployment_type}): Lütfen URL, Client ID ve Secret kontrol edin. (Detay: ${lastError})` });
        }
    } catch (err) {
        return res.status(400).json({ error: `İletişim kurulamadı: ${err.message}` });
    }
    // --- Validation End ---

    let encryptedSecret = client_secret ? encrypt(client_secret) : '';
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');

    db.query('SELECT id FROM config_uipath WHERE user_id = ?', [req.user.id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) {
            db.query('UPDATE config_uipath SET url=?, tenant=?, client_id=?, client_secret=?, deployment_type=?, orch_tenant_id=?, last_update=? WHERE user_id=?',
                [url, tenant, client_id, encryptedSecret, deployment_type, orch_tenant_id, date, req.user.id], (err) => {
                    if (err) return res.status(500).json(err);
                    res.json({ message: 'Updated', last_update: date });
                });
        } else {
            db.query('INSERT INTO config_uipath (user_id, url, tenant, client_id, client_secret, deployment_type, orch_tenant_id, last_update, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [req.user.id, url, tenant, client_id, encryptedSecret, deployment_type, orch_tenant_id, date, date], (err) => {
                    if (err) return res.status(500).json(err);
                    res.json({ message: 'Inserted', last_update: date });
                });
        }
    });
});

// POST config (SeeMe)
app.post('/api/config/seeme', authenticateToken, async (req, res) => {
    const { url, token, organization, bucket } = req.body;

    // --- InfluxDB Validation ---
    try {
        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        const influxUrl = `${cleanUrl}/api/v2/query?org=${encodeURIComponent(organization)}`;

        const response = await fetch(influxUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/vnd.flux',
                'Accept': 'application/csv'
            },
            body: `buckets()`
        });

        if (!response.ok) {
            const errorText = await response.text();
            let safeError = errorText;
            try {
                const parsed = JSON.parse(errorText);
                if (parsed.message) safeError = parsed.message;
            } catch (e) { }
            return res.status(400).json({ error: `InfluxDB Doğrulama Hatası (${response.status}): ${safeError || response.statusText}` });
        }
    } catch (err) {
        return res.status(400).json({ error: `İletişim kurulamadı: Lütfen InfluxDB URL'sini kontrol edin. (${err.message})` });
    }
    // --- Validation End ---

    let encryptedToken = token ? encrypt(token) : '';
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');

    db.query('SELECT id FROM config_seeme WHERE user_id = ?', [req.user.id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) {
            db.query('UPDATE config_seeme SET url=?, token=?, organization=?, bucket=?, last_update=? WHERE user_id=?',
                [url, encryptedToken, organization, bucket, date, req.user.id], (err) => {
                    if (err) return res.status(500).json(err);
                    res.json({ message: 'Updated', last_update: date });
                });
        } else {
            db.query('INSERT INTO config_seeme (user_id, url, token, organization, bucket, last_update, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [req.user.id, url, encryptedToken, organization, bucket, date, date], (err) => {
                    if (err) return res.status(500).json(err);
                    res.json({ message: 'Inserted', last_update: date });
                });
        }
    });
});

// --- External Connections Endpoints ---

// GET all external connections
app.get('/api/connections', authenticateToken, (req, res) => {
    db.query('SELECT app_name, last_update FROM external_connections WHERE user_id = ?', [req.user.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// GET specific connection config
app.get('/api/connections/:type', authenticateToken, (req, res) => {
    const appName = req.params.type;
    db.query('SELECT config, last_update FROM external_connections WHERE user_id = ? AND app_name = ?', [req.user.id, appName], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.json(null);

        try {
            const config = JSON.parse(results[0].config);
            // Decrypt password/token fields if they exist
            Object.keys(config).forEach(key => {
                if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
                    try { config[key] = decrypt(config[key]); } catch (e) { }
                }
            });
            res.json({ config, last_update: results[0].last_update });
        } catch (e) {
            res.status(500).json({ error: 'Config parsing failed' });
        }
    });
});

// POST save/update connection
app.post('/api/connections/:type', authenticateToken, async (req, res) => {
    const appName = req.params.type;
    const config = req.body;
    // --- Notion Validation ---
    if (appName === 'notion') {
        try {
            const response = await fetch('https://api.notion.com/v1/users/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.token}`,
                    'Notion-Version': '2022-06-28'
                }
            });
            if (!response.ok) {
                const errObj = await response.json().catch(() => ({}));
                return res.status(400).json({ error: `Notion Doğrulama Başarısız: Lütfen Token'ı kontrol edin. (Detay: ${errObj.message || response.statusText})` });
            }
        } catch (err) {
            return res.status(400).json({ error: `Notion ile iletişim kurulamadı: ${err.message}` });
        }
    }
    // --- Validation End ---

    // Encrypt sensitive fields
    Object.keys(config).forEach(key => {
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
            let cleanValue = (config[key] || '').replace(/\s+/g, '');
            config[key] = encrypt(cleanValue);
        }
    });

    const configStr = JSON.stringify(config);
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');

    db.query('INSERT INTO external_connections (user_id, app_name, config, last_update) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE config = ?, last_update = ?',
        [req.user.id, appName, configStr, date, configStr, date], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Saved', last_update: date });
        });
});

// DELETE connection
app.delete('/api/connections/:type', authenticateToken, (req, res) => {
    const appName = req.params.type;
    db.query('DELETE FROM external_connections WHERE user_id = ? AND app_name = ?', [req.user.id, appName], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Bağlantı silindi' });
    });
});

// --- UiPath Live Endpoints ---

// GET folders
app.get('/api/uipath/folders', authenticateToken, (req, res) => {
    db.query('SELECT * FROM config_uipath WHERE user_id = ?', [req.user.id], async (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ error: 'UiPath konfigürasyonu bulunamadı.' });

        const config = results[0];
        try {
            const token = await getUiPathToken(config);
            const baseUrl = getUiPathODataUrl(config);
            const targetUrl = `${baseUrl}/Folders`;

            console.log(`[UiPath] Klasörler çekiliyor: ${targetUrl}`);

            const response = await fetch(targetUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-UIPATH-TenantName': config.tenant,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                let errorData = {};
                try { errorData = JSON.parse(text); } catch (e) { }
                console.error(`[UiPath] API Hatası (${response.status}):`, text);
                throw new Error(`Folders API hatası (${response.status}): ${errorData.message || response.statusText || text}`);
            }

            const data = await response.json();
            res.json(data.value);
        } catch (apiErr) {
            console.error('[UiPath] Genel Hata:', apiErr.message);
            res.status(400).json({ error: apiErr.message });
        }
    });
});

// GET processes (Releases) by Folder ID
app.get('/api/uipath/processes/:folderId', authenticateToken, (req, res) => {
    const folderId = req.params.folderId;
    db.query('SELECT * FROM config_uipath WHERE user_id = ?', [req.user.id], async (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ error: 'UiPath konfigürasyonu bulunamadı.' });

        const config = results[0];
        try {
            const token = await getUiPathToken(config);
            const baseUrl = getUiPathODataUrl(config);

            const response = await fetch(`${baseUrl}/Releases`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(config.deployment_type !== 'cloud' ? { 'X-UIPATH-TenantName': config.tenant } : {}),
                    'X-UIPATH-OrganizationUnitId': folderId,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Releases API hatası: ${text}`);
            }
            const data = await response.json();
            res.json(data.value);
        } catch (apiErr) {
            res.status(400).json({ error: apiErr.message });
        }
    });
});

// GET robots by Folder ID
app.get('/api/uipath/robots/:folderId', authenticateToken, (req, res) => {
    const folderId = req.params.folderId;
    db.query('SELECT * FROM config_uipath WHERE user_id = ?', [req.user.id], async (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ error: 'UiPath konfigürasyonu bulunamadı.' });

        const config = results[0];
        try {
            const token = await getUiPathToken(config);
            const baseUrl = getUiPathODataUrl(config);

            // Using the specific folder robot function like in Autonomie
            const targetUrl = `${baseUrl}/Robots/UiPath.Server.Configuration.OData.GetRobotsFromFolder(folderId=${folderId})`;

            const response = await fetch(targetUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(config.deployment_type !== 'cloud' ? { 'X-UIPATH-TenantName': config.tenant } : {}),
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Robots API hatası: ${text}`);
            }
            const data = await response.json();
            res.json(data.value);
        } catch (apiErr) {
            res.status(400).json({ error: apiErr.message });
        }
    });
});

// POST start job
app.post('/api/uipath/start-job', authenticateToken, (req, res) => {
    const { folderId, releaseKey, robotIds } = req.body;

    if (!folderId || !releaseKey || !robotIds || robotIds.length === 0) {
        return res.status(400).json({ error: 'Klasör ID, Süreç Anahtarı ve en az bir Robot seçimi gereklidir.' });
    }

    db.query('SELECT * FROM config_uipath WHERE user_id = ?', [req.user.id], async (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ error: 'UiPath konfigürasyonu bulunamadı.' });

        const config = results[0];
        try {
            const token = await getUiPathToken(config);
            const baseUrl = getUiPathODataUrl(config);
            const targetUrl = `${baseUrl}/Jobs/UiPath.Server.Configuration.OData.StartJobs`;

            const payload = {
                startInfo: {
                    ReleaseKey: releaseKey,
                    Strategy: "Specific",
                    RobotIds: robotIds,
                    JobsCount: 0
                }
            };

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(config.deployment_type !== 'cloud' ? { 'X-UIPATH-TenantName': config.tenant } : {}),
                    'X-UIPATH-OrganizationUnitId': folderId.toString(),
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`StartJobs API hatası: ${text}`);
            }
            const data = await response.json();
            res.json({ message: 'Süreç başarıyla başlatıldı.', data });
        } catch (apiErr) {
            res.status(400).json({ error: apiErr.message });
        }
    });
});

// --- Trigger Endpoints ---

// GET triggers
app.get('/api/triggers', authenticateToken, (req, res) => {
    db.query('SELECT * FROM triggers', (err, results) => {
        if (err) return res.status(500).json(err);
        const processed = results.map(t => {
            try { return { ...t, ...(JSON.parse(t.config)) }; } catch (e) { return t; }
        });
        res.json(processed);
    });
});

// POST save/update trigger
app.post('/api/triggers', authenticateToken, (req, res) => {
    const { id, name, type, enabled, ...config } = req.body;
    const configStr = JSON.stringify(config);
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const userId = req.user?.id || 1; // Fallback to 1 for bypass mode

    console.log(`[Triggers] Saving: ID=${id}, Name=${name}, Type=${type}`);

    if (id && id > 100000000000) { // New triggers from UI
        db.query('INSERT INTO triggers (user_id, name, type, config, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, name, type, configStr, enabled ? 1 : 0, date], (err, result) => {
                if (err) {
                    console.error('[Triggers] INSERT Error:', err);
                    return res.status(500).json({ error: 'Veri tabanı kayıt hatası', detail: err.message });
                }
                res.json({ message: 'Trigger created', id: result.insertId });
            });
    } else if (id) { // Existing triggers (real ID)
        db.query('UPDATE triggers SET name=?, type=?, config=?, enabled=? WHERE id=?',
            [name, type, configStr, enabled ? 1 : 0, id], (err) => {
                if (err) {
                    console.error('[Triggers] UPDATE Error:', err);
                    return res.status(500).json({ error: 'Veri tabanı güncelleme hatası', detail: err.message });
                }
                res.json({ message: 'Trigger updated' });
            });
    } else {
        res.status(400).json({ error: 'Geçersiz ID' });
    }
});

// DELETE trigger
app.delete('/api/triggers/:id', authenticateToken, (req, res) => {
    db.query('DELETE FROM triggers WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Trigger deleted' });
    });
});

// GET trigger logs
app.get('/api/trigger-logs', authenticateToken, (req, res) => {
    db.query('SELECT l.*, t.name as trigger_name FROM trigger_logs l LEFT JOIN triggers t ON l.trigger_id = t.id ORDER BY l.id DESC LIMIT 30', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// --- Background Worker (Gmail Monitoring) ---

const logTriggerEvent = (triggerId, message, status) => {
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    db.query('INSERT INTO trigger_logs (trigger_id, message, status, created_at) VALUES (?, ?, ?, ?)', [triggerId, message, status, date]);
};

const triggerUiPathFromEvent = async (userId, trigger) => {
    const config = JSON.parse(trigger.config);
    const { folderId, processKey, robotId, robotName, processName } = config;

    console.log(`[Worker] Starting UiPath Job for Trigger: ${trigger.name} (${processName})`);

    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM config_uipath WHERE user_id = ?', [userId], async (err, results) => {
            if (err || results.length === 0) return reject(new Error('UiPath config not found'));
            const orchConfig = results[0];
            try {
                const token = await getUiPathToken(orchConfig);
                const baseUrl = getUiPathODataUrl(orchConfig);
                const targetUrl = `${baseUrl}/Jobs/UiPath.Server.Configuration.OData.StartJobs`;

                const payload = {
                    startInfo: {
                        ReleaseKey: processKey,
                        Strategy: "Specific",
                        RobotIds: [parseInt(robotId)],
                        JobsCount: 0
                    }
                };

                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        ...(orchConfig.deployment_type !== 'cloud' ? { 'X-UIPATH-TenantName': orchConfig.tenant } : {}),
                        'X-UIPATH-OrganizationUnitId': folderId.toString(),
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`StartJobs Error: ${text}`);
                }
                console.log(`[Worker] SUCCESS: Job started for ${trigger.name}`);
                logTriggerEvent(trigger.id, `Robot başarıyla tetiklendi: ${processName}`, 'SUCCESS');
                resolve(true);
            } catch (e) {
                console.error(`[Worker] UiPath Start Failed for ${trigger.name}:`, e.message);
                logTriggerEvent(trigger.id, `UiPath Tetikleme Hatası: ${e.message}`, 'ERROR');
                reject(e);
            }
        });
    });
};

const checkGmailTriggers = async () => {
    db.query('SELECT * FROM triggers WHERE type = "event" AND enabled = 1', async (err, results) => {
        if (err || !results || results.length === 0) return;

        const now = new Date();
        for (const trigger of results) {
            const config = JSON.parse(trigger.config);
            if (config.connectorId !== 'gmail') continue;

            // Check interval (in minutes)
            const intervalMinutes = parseInt(config.interval) || 5;
            const intervalMs = intervalMinutes * 60 * 1000;
            const lastRun = trigger.last_run ? new Date(trigger.last_run) : new Date(0);

            if (now.getTime() - lastRun.getTime() < intervalMs) {
                // Not time yet
                continue;
            }

            // Update last_run immediately to prevent concurrent triggers using DB time
            db.query('UPDATE triggers SET last_run = NOW() WHERE id = ?', [trigger.id]);

            // Gmail config check
            db.query('SELECT config FROM external_connections WHERE user_id = ? AND app_name = "gmail"', [trigger.user_id], async (connErr, connResults) => {
                if (connErr || !connResults || connResults.length === 0) {
                    logTriggerEvent(trigger.id, 'Gmail bağlantı ayarları bulunamadı', 'ERROR');
                    return;
                }

                let gmailConfig;
                try {
                    gmailConfig = JSON.parse(connResults[0].config);
                    // Decrypt password
                    if (gmailConfig.app_password) gmailConfig.app_password = decrypt(gmailConfig.app_password);
                } catch (e) {
                    logTriggerEvent(trigger.id, 'Gmail şifre çözme hatası', 'ERROR');
                    return;
                }

                if (!gmailConfig.email || !gmailConfig.app_password) {
                    logTriggerEvent(trigger.id, 'Gmail e-posta veya şifre eksik', 'ERROR');
                    return;
                }

                const imapConfig = {
                    imap: {
                        user: gmailConfig.email,
                        password: gmailConfig.app_password,
                        host: 'imap.gmail.com',
                        port: 993,
                        tls: true,
                        authTimeout: 5000,
                        tlsOptions: { rejectUnauthorized: false }
                    }
                };

                try {
                    console.log(`[Worker] Connecting to Gmail for: ${gmailConfig.email}`);
                    const connection = await imaps.connect(imapConfig);
                    logTriggerEvent(trigger.id, 'Gmail bağlantısı kuruldu, mailler taranıyor...', 'INFO');

                    await connection.openBox('INBOX');

                    const searchCriteria = ['UNSEEN'];
                    const fetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true, markSeen: true };

                    const messages = await connection.search(searchCriteria, fetchOptions);

                    if (messages.length > 0) {
                        console.log(`[Worker] Detected ${messages.length} NEW emails for ${trigger.name}!`);
                        logTriggerEvent(trigger.id, `${messages.length} adet yeni mail algılandı! Robot tetikleniyor...`, 'INFO');
                        // For each new email, trigger the robot
                        for (const msg of messages) {
                            await triggerUiPathFromEvent(trigger.user_id, trigger);
                        }
                    } else {
                        // Keep logs clean, don't log "no mail" every 30 seconds
                    }

                    connection.end();
                } catch (imapError) {
                    console.error(`[Worker] IMAP Error for ${gmailConfig.email}:`, imapError.message);
                    logTriggerEvent(trigger.id, `Gmail Bağlantı Hatası: ${imapError.message}`, 'ERROR');
                }
            });
        }
    });
};

const checkWeatherTriggers = async () => {
    db.query('SELECT * FROM triggers WHERE type = "event" AND enabled = 1', async (err, results) => {
        if (err || !results || results.length === 0) return;

        const now = new Date();
        for (const trigger of results) {
            let config;
            try { config = JSON.parse(trigger.config); } catch (e) { continue; }
            if (config.connectorId !== 'weatherstack') continue;

            const intervalMinutes = parseInt(config.interval) || 5;
            if (now.getTime() - (trigger.last_run ? new Date(trigger.last_run).getTime() : 0) < intervalMinutes * 60 * 1000) continue;

            db.query('UPDATE triggers SET last_run = NOW() WHERE id = ?', [trigger.id]);

            db.query('SELECT config FROM external_connections WHERE app_name = "weatherstack" LIMIT 1', async (connErr, connResults) => {
                if (connErr || !connResults || connResults.length === 0) {
                    logTriggerEvent(trigger.id, 'Hava Durumu bağlantı ayarları bulunamadı', 'ERROR');
                    return;
                }

                let wConfig;
                try {
                    wConfig = JSON.parse(connResults[0].config);
                    if (wConfig.password) wConfig.password = decrypt(wConfig.password);
                } catch (e) { return; }

                if (!wConfig.api_url || !wConfig.password || !config.city || !config.condition || !config.target_temp) {
                    logTriggerEvent(trigger.id, 'Eksik hava durumu tetikleyici veya bağlantı ayarı', 'ERROR');
                    return;
                }

                try {
                    // API request to WeatherStack
                    // http://api.weatherstack.com/current?access_key=YOUR_ACCESS_KEY&query=New York
                    const baseUrl = wConfig.api_url.endsWith('/') ? wConfig.api_url.slice(0, -1) : wConfig.api_url;
                    const url = `${baseUrl}/current?access_key=${wConfig.password}&query=${encodeURIComponent(config.city)}`;

                    const res = await fetch(url);
                    const data = await res.json();

                    if (data.error) {
                        logTriggerEvent(trigger.id, `WeatherStack Hatası: ${data.error.info}`, 'ERROR');
                        return;
                    }

                    const temp = data.current.temperature;
                    const target = parseFloat(config.target_temp);
                    let shouldTrigger = false;

                    if (config.condition === '>' && temp > target) shouldTrigger = true;
                    if (config.condition === '<' && temp < target) shouldTrigger = true;
                    if (config.condition === '==' && temp === target) shouldTrigger = true;

                    if (shouldTrigger) {
                        logTriggerEvent(trigger.id, `${config.city} şehrinde sıcaklık ${temp}°C! Koşul sağlandı, robot tetikleniyor.`, 'INFO');
                        await triggerUiPathFromEvent(trigger.user_id, trigger);
                    } else {
                        // don't log success if condition not met to avoid spam
                    }
                } catch (e) {
                    logTriggerEvent(trigger.id, `Hava Durumu API Hatası: ${e.message}`, 'ERROR');
                }
            });
        }
    });
};

const checkInfluxDBTriggers = async () => {
    db.query('SELECT * FROM triggers WHERE type = "event" AND enabled = 1', (err, results) => {
        if (err || !results || results.length === 0) return;

        const now = new Date();
        for (const trigger of results) {
            let config;
            try { config = JSON.parse(trigger.config); } catch (e) { continue; }
            if (config.connectorId !== 'influxdb') continue;

            const intervalMinutes = parseInt(config.interval) || 1;
            if (now.getTime() - (trigger.last_run ? new Date(trigger.last_run).getTime() : 0) < intervalMinutes * 60 * 1000) continue;

            db.query('UPDATE triggers SET last_run = NOW() WHERE id = ?', [trigger.id]);

            db.query('SELECT config FROM external_connections WHERE app_name = "influxdb" LIMIT 1', async (connErr, connResults) => {
                if (connErr || !connResults || connResults.length === 0) {
                    logTriggerEvent(trigger.id, 'InfluxDB bağlantı ayarları bulunamadı', 'ERROR');
                    return;
                }

                let inConfig;
                try {
                    inConfig = JSON.parse(connResults[0].config);
                    if (inConfig.token) inConfig.token = decrypt(inConfig.token);
                } catch (e) { return; }

                if (!inConfig.url || !inConfig.token || !inConfig.organization || !inConfig.bucket || !config.measurement || !config.field) {
                    logTriggerEvent(trigger.id, 'Eksik InfluxDB tetikleyici veya bağlantı ayarı', 'ERROR');
                    return;
                }

                try {
                    const client = new InfluxDB({ url: inConfig.url, token: inConfig.token });
                    const queryApi = client.getQueryApi(inConfig.organization);
                    const query = `
                        from(bucket: "${inConfig.bucket}")
                            |> range(start: -1d)
                            |> filter(fn: (r) => r._measurement == "${config.measurement}")
                            |> filter(fn: (r) => r._field == "${config.field}")
                            |> last()
                    `;

                    let latestValue = null;
                    queryApi.queryRows(query, {
                        next: (row, tableMeta) => {
                            const o = tableMeta.toObject(row);
                            if (o._value !== undefined) latestValue = o._value;
                        },
                        error: (error) => {
                            logTriggerEvent(trigger.id, `InfluxDB Sorgu Hatası: ${error.message}`, 'ERROR');
                        },
                        complete: async () => {
                            if (latestValue === null) {
                                // No data returned
                                return;
                            }

                            const previousValue = influxStates.get(trigger.id);
                            influxStates.set(trigger.id, latestValue);

                            if (previousValue !== undefined && latestValue > previousValue) {
                                logTriggerEvent(trigger.id, `Kapı/Sensör Tetiklendi! Counter: ${previousValue} -> ${latestValue}`, 'INFO');
                                await triggerUiPathFromEvent(trigger.user_id, trigger);
                            } else if (previousValue === undefined) {
                                logTriggerEvent(trigger.id, `InfluxDB ilk değer okundu: ${latestValue}. Değişim bekleniyor...`, 'INFO');
                            }
                        }
                    });

                } catch (e) {
                    logTriggerEvent(trigger.id, `InfluxDB Bağlantı/Ayar Hatası: ${e.message}`, 'ERROR');
                }
            });
        }
    });
};

// Poll every 30 seconds for immediate feedback during testing
setInterval(checkGmailTriggers, 30000);
setInterval(checkWeatherTriggers, 30000);
setInterval(checkInfluxDBTriggers, 30000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
