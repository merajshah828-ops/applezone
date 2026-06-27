require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-before-deploying';

if (SESSION_SECRET === 'change-this-secret-before-deploying') {
  console.warn(
    '\n⚠️  WARNING: Using the default SESSION_SECRET. Set a real SESSION_SECRET in your .env file before deploying publicly.\n'
  );
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 12, // 12 hours
      // secure: true, // uncomment once deployed behind HTTPS
    },
  })
);

// Serve uploaded device photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the public website (your existing Apple Zone site) and the admin panel
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/admin', authRoutes);
app.use('/api/devices', deviceRoutes);

// Fallback 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.listen(PORT, () => {
  console.log(`Apple Zone server running at http://localhost:${PORT}`);
  console.log(`Public site:  http://localhost:${PORT}/`);
  console.log(`Admin login:  http://localhost:${PORT}/admin/login.html`);
});
