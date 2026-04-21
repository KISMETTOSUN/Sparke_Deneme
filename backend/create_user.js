const mysql = require('mysql2');
const dotenv = require('dotenv');
const { encrypt } = require('./encryption');

const fs = require('fs');
dotenv.config();

// Fallback to manual parsing for difficult encodings (like UTF-16 from Powershell/Notepad)
try {
    let envStr = fs.readFileSync('.env', 'utf16le');
    if (!envStr.includes('DB_HOST')) envStr = fs.readFileSync('.env', 'utf8');
    
    envStr.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let key = match[1];
            let value = match[2] ? match[2].trim() : '';
            // Handle values without quotes if they were pasted raw
            if (!process.env[key]) process.env[key] = value;
        }
    });
} catch (e) {}


const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Kullanım: node create_user.js <kullanici_adi> <sifre>");
    process.exit(1);
}

const username = args[0];
const password = args[1];

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'sparke_db'
});

db.connect((err) => {
    if (err) {
        console.error('Veritabanina baglanilirken hata olustu:', err);
        process.exit(1);
    }
    
    db.query('SELECT id FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Veritabani sorgu hatasi:', err);
            db.end();
            process.exit(1);
        }
        
        if (results.length > 0) {
            console.log(`Hata: '${username}' adli kullanici zaten mevcut.`);
            db.end();
            process.exit(1);
        }
        
        try {
            const encryptedPassword = encrypt(password);
            
            db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, encryptedPassword], (err, result) => {
                if (err) {
                    console.error('Kullanici eklenirken hata:', err);
                } else {
                    console.log(`Basarili! Kullanici '${username}' olusturuldu. (ID: ${result.insertId})`);
                }
                db.end();
            });
        } catch (error) {
            console.error('Sifreleme sirasinda hata:', error.message);
            db.end();
        }
    });
});
