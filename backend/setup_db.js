const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting:', err);
        process.exit(1);
    }
    console.log('Connected.');
    
    const sql = `CREATE TABLE IF NOT EXISTS triggers (
        id INT AUTO_INCREMENT PRIMARY KEY, 
        user_id INT, 
        name VARCHAR(255), 
        type VARCHAR(50), 
        config TEXT, 
        enabled BOOLEAN DEFAULT TRUE, 
        last_run DATETIME, 
        created_at DATETIME
    );`;
    
    db.query(sql, (err) => {
        if (err) {
            console.error('Error creating table:', err);
            process.exit(1);
        }
        console.log('Table triggers created/verified.');
        process.exit(0);
    });
});
