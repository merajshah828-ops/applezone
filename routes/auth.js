const express = require('express');
const bcrypt = require('bcryptjs');
const store = require('../db/store');

const router = express.Router();

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = store.getAdmin();
  if (!admin) {
    return res.status(500).json({
      error: 'No admin account exists yet. Run "node setup-admin.js <username> <password>" on the server first.',
    });
  }

  if (username !== admin.username || !bcrypt.compareSync(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  req.session.isAdmin = true;
  req.session.username = username;
  res.json({ success: true, username });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/admin/session — lets the admin frontend check if it's still logged in
router.get('/session', (req, res) => {
  if (req.session && req.session.isAdmin) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
