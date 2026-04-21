const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');

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

// GET all robots
app.get('/api/robots', (req, res) => {
    db.query('SELECT * FROM robots', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// GET activity logs
app.get('/api/activity', (req, res) => {
    db.query('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 10', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// POST trigger robot
app.post('/api/trigger/:id', (req, res) => {
    const robotId = req.params.id;
    
    // First, find robot name and current status
    db.query('SELECT name FROM robots WHERE id = ?', [robotId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Robot not found' });
        
        const robotName = results[0].name;
        
        // Update robot status back to 'running' (simulation)
        db.query('UPDATE robots SET status = "running" WHERE id = ?', [robotId], (err) => {
            if (err) return res.status(500).json(err);
            
            // Log the activity
            const timestamp = new Date().toLocaleTimeString();
            db.query('INSERT INTO activity_logs (robot_id, robot_name, timestamp, duration, status) VALUES (?, ?, ?, ?, ?)', 
                [robotId, robotName, timestamp, '...', 'Running'], (err) => {
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
