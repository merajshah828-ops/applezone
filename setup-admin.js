/**
 * One-time setup script: creates (or resets) the single admin account.
 *
 * Usage:
 *   node setup-admin.js <username> <password>
 *
 * Example:
 *   node setup-admin.js merajadmin "MyStr0ngP@ss"
 *
 * Run this once before starting the server for the first time, and again any time you
 * want to change the admin username/password. The password is hashed with bcrypt before
 * being stored — the plain-text password is never saved anywhere.
 */

const bcrypt = require('bcryptjs');
const store = require('./db/store');

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error('Usage: node setup-admin.js <username> <password>');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(password, 10);
store.setAdmin({ username, passwordHash });

console.log(`Admin account created/updated.`);
console.log(`Username: ${username}`);
console.log(`You can now run "npm start" and log in at /admin/login.html`);
