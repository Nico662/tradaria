const express        = require('express');
const jwt            = require('jsonwebtoken');
const mongoose       = require('mongoose');
const Academy        = require('../models/Academy');
const AcademyTournament = require('../models/AcademyTournament');
const requireTeacher = require('../middleware/requireTeacher');

const router = express.Router();

// ── Local auth middleware ─────────────────────────────────────────
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
    const User    = mongoose.model('User');
    const user    = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── POST /academy/create ──────────────────────────────────────────
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2)
      return res.status(400).json({ error: 'Nombre demasiado corto' });

    const slug     = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const joinCode = slug.slice(0, 4).toUpperCase() + '-' + (1000 + Math.floor(Math.random() * 9000));

    const existing = await Academy.findOne({ $or: [{ slug }, { joinCode }] });
    if (existing) return res.status(409).json({ error: 'Ya existe una academia con ese nombre' });

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const academy = await Academy.create({
      name: name.trim(),
      slug,
      joinCode,
      ownerId:    req.user._id,
      trialEndsAt,
    });

    await mongoose.model('User').findByIdAndUpdate(req.user._id, { role: 'teacher', academyId: academy._id });

    res.status(201).json(academy);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /academy/join ────────────────────────────────────────────
router.post('/join', requireAuth, async (req, res) => {
  try {
    const { joinCode } = req.body;
    if (!joinCode) return res.status(400).json({ error: 'joinCode requerido' });

    const academy = await Academy.findOne({ joinCode: joinCode.toUpperCase() });
    if (!academy)        return res.status(404).json({ error: 'Academia no encontrada' });
    if (!academy.isActive) return res.status(403).json({ error: 'Academia inactiva' });
    if (academy.students.length >= academy.maxStudents)
      return res.status(403).json({ error: 'Academia llena' });

    const userId = req.user._id.toString();
    if (academy.ownerId.toString() === userId)
      return res.status(409).json({ error: 'Ya eres el propietario de esta academia' });
    if (academy.students.some(s => s.toString() === userId))
      return res.status(409).json({ error: 'Ya eres miembro de esta academia' });

    academy.students.push(req.user._id);
    await academy.save();

    await mongoose.model('User').findByIdAndUpdate(req.user._id, {
      academyId:    academy._id,
      isAcademyPro: academy.plan !== null,
    });

    res.json({ success: true, academy: { _id: academy._id, name: academy.name, slug: academy.slug } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /academy/preview?code= ───────────────────────────────────
router.get('/preview', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'code requerido' });
  try {
    const academy = await Academy.findOne({ joinCode: code.toUpperCase() }, 'name');
    if (!academy) return res.status(404).json({ error: 'Código no válido' });
    res.json({ name: academy.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /academy/:id/dashboard ────────────────────────────────────
router.get('/:id/dashboard', requireAuth, async (req, res) => {
  if (!req.params.id || req.params.id === 'null' || req.params.id === 'undefined') {
    return res.status(400).json({ error: 'Academy ID no válido' });
  }
  try {
    const academy = await Academy.findById(req.params.id).populate('students', 'name email dailyStreak lastLogin');
    if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });
    const uid      = req.user._id.toString();
    const isOwner  = academy.ownerId.toString() === uid;
    const isMember = academy.students.some(s => s._id.toString() === uid);
    if (!isOwner && !isMember) return res.status(403).json({ error: 'No autorizado' });

    const GameHistory = mongoose.model('GameHistory');

    const studentStats = await Promise.all(academy.students.map(async (student) => {
      const games = await GameHistory.find({ userId: student._id });
      const gamesPlayed = games.length;
      const avgAccuracy = gamesPlayed
        ? Math.round(games.reduce((sum, g) => sum + (g.accuracy || 0), 0) / gamesPlayed)
        : 0;

      return {
        id:            student._id,
        name:          student.name,
        email:         student.email,
        gamesPlayed,
        avgAccuracy,
        currentStreak: student.dailyStreak || 0,
        lastSeen:      student.lastLogin || null,
      };
    }));

    const tournaments = await AcademyTournament.find({ academyId: req.params.id }).sort({ startsAt: -1 });
    res.json({ ...academy.toObject(), students: studentStats, tournaments });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /academy/:id/tournament/create ──────────────────────────
router.post('/:id/tournament/create', requireTeacher, async (req, res) => {
  try {
    const academy = await Academy.findById(req.params.id);
    if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });
    if (academy.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'No autorizado' });

    const { name, startsAt, endsAt } = req.body;
    if (!name || !startsAt || !endsAt)
      return res.status(400).json({ error: 'Nombre, fecha inicio y fecha fin son obligatorios' });
    if (new Date(endsAt) <= new Date(startsAt))
      return res.status(400).json({ error: 'La fecha fin debe ser posterior al inicio' });

    const tournament = await AcademyTournament.create({
      academyId: req.params.id,
      name:      name.trim(),
      startsAt:  new Date(startsAt),
      endsAt:    new Date(endsAt),
      createdBy: req.user._id,
    });
    res.status(201).json(tournament);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /academy/:id/export ───────────────────────────────────────
router.get('/:id/export', requireTeacher, async (req, res) => {
  try {
    const academy = await Academy.findById(req.params.id).populate('students', 'name email dailyStreak lastLogin');
    if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });
    if (academy.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'No autorizado' });

    const GameHistory = mongoose.model('GameHistory');

    const rows = await Promise.all(academy.students.map(async (student) => {
      const games = await GameHistory.find({ userId: student._id });
      const gamesPlayed = games.length;
      const avgAccuracy = gamesPlayed
        ? Math.round(games.reduce((sum, g) => sum + (g.accuracy || 0), 0) / gamesPlayed)
        : 0;
      const lastSeen = student.lastLogin
        ? new Date(student.lastLogin).toISOString().split('T')[0]
        : '';

      return [student.name, student.email, gamesPlayed, avgAccuracy, student.dailyStreak || 0, lastSeen]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
    }));

    const csv = ['nombre,email,partidas,precision,racha,ultimo_acceso', ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="alumnos-${academy.slug}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /academy/:id/tournament/:tournamentId/score ─────────────
router.post('/:id/tournament/:tournamentId/score', requireAuth, async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number') return res.status(400).json({ error: 'score requerido' });

    const tournament = await AcademyTournament.findOne({
      _id:       req.params.tournamentId,
      academyId: req.params.id,
    });
    if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

    const uid = req.user._id;
    const idx = tournament.participants.findIndex(p => p.userId.toString() === uid.toString());
    if (idx !== -1)
      return res.status(409).json({ error: 'Ya has jugado este torneo', alreadyPlayed: true });
    tournament.participants.push({ userId: uid, score, gamesPlayed: 1 });
    await tournament.save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /academy/:id/tournament/active ───────────────────────────
router.get('/:id/tournament/active', requireAuth, async (req, res) => {
  try {
    const now        = new Date();
    const tournament = await AcademyTournament.findOne({
      academyId: req.params.id,
      startsAt:  { $lte: now },
      endsAt:    { $gte: now },
    }).populate('participants.userId', 'name username');
    if (!tournament) return res.json({ active: false });
    res.json({ active: true, tournament });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /academy/:id/name ─────────────────────────────────────────
router.get('/:id/name', async (req, res) => {
  try {
    const academy = await Academy.findById(req.params.id, 'name');
    if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });
    res.json({ name: academy.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
