import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.warn('Faltan DATABASE_URL y/o JWT_SECRET en las variables de entorno.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(30) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS scores (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      username VARCHAR(30) NOT NULL,
      score INTEGER NOT NULL,
      played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS scores_score_idx ON scores (score DESC, played_at ASC);
  `);
}

function makeToken(user) {
  return jwt.sign({ sub: String(user.id), username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No has iniciado sesión.' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Sesión caducada.' }); }
}

app.post('/api/register', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) return res.status(400).json({ error: 'El usuario debe tener 3-30 caracteres: letras, números o _. ' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, passwordHash]
    );
    const user = rows[0];
    res.status(201).json({ token: makeToken(user), user: { username: user.username } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ese nombre de usuario ya existe.' });
    console.error(err); res.status(500).json({ error: 'No se pudo crear la cuenta.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const { rows } = await pool.query('SELECT id, username, password_hash FROM users WHERE LOWER(username)=LOWER($1)', [username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    res.json({ token: makeToken(user), user: { username: user.username } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'No se pudo iniciar sesión.' }); }
});

app.get('/api/me', auth, async (req, res) => {
  res.json({ user: { username: req.user.username } });
});

app.post('/api/scores', auth, async (req, res) => {
  try {
    const score = Number(req.body.score);
    if (!Number.isInteger(score) || score < 0 || score > 100000) return res.status(400).json({ error: 'Puntuación no válida.' });
    await pool.query('INSERT INTO scores (user_id, username, score) VALUES ($1, $2, $3)', [req.user.sub, req.user.username, score]);
    const { rows } = await pool.query(`
      SELECT username, score, ROW_NUMBER() OVER (ORDER BY score DESC, played_at ASC) AS position
      FROM scores ORDER BY score DESC, played_at ASC LIMIT 10
    `);
    res.status(201).json({ leaderboard: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'No se pudo guardar la puntuación.' }); }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT username, score, ROW_NUMBER() OVER (ORDER BY score DESC, played_at ASC) AS position
      FROM scores ORDER BY score DESC, played_at ASC LIMIT 10
    `);
    res.json({ leaderboard: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'No se pudo cargar la clasificación.' }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

initDb().then(() => app.listen(port, '0.0.0.0', () => console.log(`El Gran Reto escuchando en ${port}`)))
  .catch(err => { console.error('No se pudo inicializar la base de datos:', err); process.exit(1); });
