// generate-patient-keys.js
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

// ✅ CHANGED: Use patient-specific filenames
fs.writeFileSync(path.join(dir, 'patient-private.pem'), privateKey);
fs.writeFileSync(path.join(dir, 'patient-public.pem'), publicKey);

console.log('✅ Patient RSA key pair generated successfully in /keys');
console.log('   - patient-private.pem');
console.log('   - patient-public.pem');