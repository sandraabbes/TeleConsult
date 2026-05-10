const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'keys');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
});

fs.writeFileSync(path.join(dir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(dir, 'public.pem'), publicKey);

console.log('✅ RSA key pair generated successfully in /keys');
