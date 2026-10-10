// One-time setup: creates .env with a random JWT secret and a random admin password.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const target = path.join(__dirname, '..', '.env');
if (fs.existsSync(target)) { console.log('.env already exists - nothing changed.'); process.exit(0); }
const example = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
const adminPass = crypto.randomBytes(9).toString('base64url');
const out = example
  .replace('change-me-to-a-long-random-string', crypto.randomBytes(48).toString('hex'))
  .replace('ChangeMe123!', adminPass);
fs.writeFileSync(target, out);
console.log('.env created.\n');
console.log('  Admin email   : admin@zayoor.local');
console.log('  Admin password: ' + adminPass);
console.log('\nSave this password, then change it from Account > Security after logging in.');
