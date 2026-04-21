const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
    if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY is not defined");
    
    // Ensure the key is exactly 32 bytes by padding or hashing if necessary
    // But we'll assume the user provided a 32-byte string or we hash it
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY is not defined");
    
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
}

module.exports = { encrypt, decrypt };
