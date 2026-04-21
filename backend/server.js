const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { encrypt, decrypt } = require('./encryption');

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
