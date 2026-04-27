const imaps = require('imap-simple');

const config = {
    imap: {
        user: 'kismet.tosun@ucgenotomasyon.com',
        password: 'fazbqdlmfefxrefw',
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 5000,
        tlsOptions: { rejectUnauthorized: false }
    }
};

imaps.connect(config).then(connection => {
    console.log("SUCCESS");
    connection.end();
}).catch(err => {
    console.error("FAIL:", err.message);
});
