const mysql = require('mysql2');
const {encrypt} = require('./encryption');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

const cleanPw = 'fazbqdlmfefxrefw';

const newConfig = JSON.stringify({
  email: 'kismet.tosun@ucgenotomasyon.com',
  app_password: encrypt(cleanPw)
});

db.query('UPDATE external_connections SET config=? WHERE app_name="gmail"', [newConfig], (e, r) => {
  if(e) console.error(e);
  else console.log("Saved clean successfully!");
  process.exit();
});
