require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/character');
const gameRoutes = require('./routes/game');
const narratorRoutes = require('./routes/narrator');
const shopRoutes = require('./routes/shop');
const adminRoutes = require('./routes/admin');
const setupRoutes = require('./routes/setup');
const firebaseAdmin = require('./firebaseAdmin');

const app = express();
const PORT = parseInt(process.env.PORT || process.env.BACKEND_PORT, 10) || 4001;

app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/narrator', narratorRoutes);
app.use('/api/shop', shopRoutes);
app.get('/api/health', async (req, res) => {
  const { firestore } = require('./firestore');
  let firestoreStatus = 'unknown';
  let firestoreError = null;
  let userCount = null;
  let charCount = null;
  try {
    const [users, characters] = await Promise.all([
      firestore.collection('users').count().get(),
      firestore.collection('characters').count().get(),
    ]);
    userCount = users.data().count;
    charCount = characters.data().count;
    firestoreStatus = 'connected';
  } catch (err) {
    firestoreStatus = 'error';
    firestoreError = err.message;
  }
  res.json({
    status: 'ok',
    firebaseAdmin: firebaseAdmin.__initStatus,
    firebaseAdminError: firebaseAdmin.__initError,
    firestoreStatus,
    firestoreError,
    userCount,
    charCount,
  });
});

// Serve React frontend static files.
// The built frontend can end up in different locations depending on how the
// app is run (local monorepo dev vs. the platform's Docker layout), so check
// a few known candidate paths and use the first one that actually has files.
const fs = require('fs');
const publicCandidates = [
  path.join(__dirname, '../../public'), // project-root/public (sibling of backend/)
  path.join(__dirname, '../public'), // backend/public
  path.join(process.cwd(), 'public'), // ./public relative to process cwd
];
const publicDir = publicCandidates.find((p) => {
  try {
    return fs.existsSync(path.join(p, 'index.html'));
  } catch {
    return false;
  }
}) || publicCandidates[0];
console.log(`Serving frontend static files from: ${publicDir}`);
app.use(express.static(publicDir));

// SPA fallback — tüm bilinmeyen rotalar index.html'e döner
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('OK');
    }
  });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
