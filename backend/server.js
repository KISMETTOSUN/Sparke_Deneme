const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { encrypt, decrypt } = require('./encryption');
const { getUiPathToken, getUiPathODataUrl } = require('./uipath_utils');

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

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
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
            try { config[secretField] = decrypt(config[secretField]); } catch(e) {}
        }
        res.json(config);
    });
});

// POST config (UiPath)
app.post('/api/config/uipath', authenticateToken, async (req, res) => {
    const { url, tenant, client_id, client_secret, deployment_type } = req.body;
    
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
            db.query('UPDATE config_uipath SET url=?, tenant=?, client_id=?, client_secret=?, deployment_type=?, last_update=? WHERE user_id=?',
            [url, tenant, client_id, encryptedSecret, deployment_type, date, req.user.id], (err) => {
                if (err) return res.status(500).json(err);
                res.json({ message: 'Updated', last_update: date });
            });
        } else {
            db.query('INSERT INTO config_uipath (user_id, url, tenant, client_id, client_secret, deployment_type, last_update, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, url, tenant, client_id, encryptedSecret, deployment_type, date, date], (err) => {
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
            } catch (e) {}
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
                    ...(config.deployment_type !== 'cloud' ? { 'X-UIPATH-TenantName': config.tenant } : {}),
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                let errorData = {};
                try { errorData = JSON.parse(text); } catch(e) {}
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


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
