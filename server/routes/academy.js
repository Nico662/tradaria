const express        = require('express');
const jwt            = require('jsonwebtoken');
const mongoose       = require('mongoose');
const Stripe         = require('stripe');
const Academy        = require('../models/Academy');
const AcademyTournament  = require('../models/AcademyTournament');
const AcademyAssignment  = require('../models/AcademyAssignment');
const AcademyFeedback    = require('../models/AcademyFeedback');
const requireTeacher     = require('../middleware/requireTeacher');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    if (!academy) {
      if (req.user.academyId && req.user.academyId.toString() === req.params.id) {
        await mongoose.model('User').findByIdAndUpdate(req.user._id, { academyId: null, isAcademyPro: false });
      }
      return res.status(404).json({ error: 'Academia no encontrada', academyGone: true });
    }
    const uid      = req.user._id.toString();
    const isOwner  = academy.ownerId.toString() === uid;
    const isMember = academy.students.some(s => s._id.toString() === uid);
    if (!isOwner && !isMember) return res.status(403).json({ error: 'No autorizado' });

    const GameHistory = mongoose.model('GameHistory');
    const Portfolio   = mongoose.model('Portfolio');

    const studentStats = await Promise.all(academy.students.map(async (student) => {
      const [games, portfolio] = await Promise.all([
        GameHistory.find({ userId: student._id }),
        Portfolio.findOne({ userId: student._id }, 'cash positions'),
      ]);
      const gamesPlayed = games.length;
      const avgAccuracy = gamesPlayed
        ? Math.round(games.reduce((sum, g) => sum + (g.accuracy || 0), 0) / gamesPlayed)
        : 0;

      let portfolioValue  = null;
      let portfolioPnl    = null;
      let portfolioPnlPct = null;
      if (portfolio) {
        const invested  = portfolio.positions.reduce((s, pos) => s + pos.qty * pos.avgPrice, 0);
        portfolioValue  = Math.round(portfolio.cash + invested);
        portfolioPnl    = Math.round(portfolioValue - 50000);
        portfolioPnlPct = +((portfolioPnl / 50000) * 100).toFixed(2);
      }

      return {
        id:            student._id,
        name:          student.name,
        email:         isOwner ? student.email : undefined,
        gamesPlayed,
        avgAccuracy,
        currentStreak: student.dailyStreak || 0,
        lastSeen:      student.lastLogin || null,
        portfolioValue,
        portfolioPnl,
        portfolioPnlPct,
      };
    }));

    const tournaments = await AcademyTournament.find({ academyId: req.params.id }).sort({ startsAt: -1 });
    const academyObj = academy.toObject();
    delete academyObj.students;
    delete academyObj.stripeCustomerId;
    delete academyObj.stripeSubscriptionId;
    res.json({ ...academyObj, students: studentStats, tournaments });
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
    const rawScore = Number(req.body.score);
    if (!Number.isFinite(rawScore)) return res.status(400).json({ error: 'score requerido' });
    const score = Math.max(0, Math.min(rawScore, 100000));

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

// ── POST /academy/:id/assignment/create ──────────────────────────
router.post('/:id/assignment/create', requireTeacher, async (req, res) => {
  try {
    const academy = await Academy.findById(req.params.id);
    if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });
    if (academy.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'No autorizado' });

    const { title, description, mode, targetGames, startsAt, endsAt } = req.body;
    if (!title || !mode || !targetGames || !startsAt || !endsAt)
      return res.status(400).json({ error: 'Título, modo, partidas objetivo, fecha inicio y fecha fin son obligatorios' });
    if (!['guess', 'survival', 'daily', 'portfolio'].includes(mode))
      return res.status(400).json({ error: 'Modo no válido' });
    const tGames = Number(targetGames);
    if (!Number.isInteger(tGames) || tGames < 1 || tGames > 1000)
      return res.status(400).json({ error: 'Número de partidas no válido (1-1000)' });
    if (new Date(endsAt) <= new Date(startsAt))
      return res.status(400).json({ error: 'La fecha fin debe ser posterior al inicio' });

    const submissions = academy.students.map(studentId => ({
      userId: studentId, gamesPlayed: 0, completed: false, completedAt: null,
    }));

    const assignment = await AcademyAssignment.create({
      academyId:   req.params.id,
      title:       title.trim(),
      description: description?.trim() || '',
      mode,
      targetGames: tGames,
      startsAt:    new Date(startsAt),
      endsAt:      new Date(endsAt),
      createdBy:   req.user._id,
      submissions,
    });
    res.status(201).json(assignment);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /academy/:id/assignments ─────────────────────────────────
router.get('/:id/assignments', requireAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.params.id, 'ownerId students');
    if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });

    const uid      = req.user._id.toString();
    const isOwner  = academy.ownerId.toString() === uid;
    const isMember = academy.students.some(s => s.toString() === uid);
    if (!isOwner && !isMember) return res.status(403).json({ error: 'No autorizado' });

    const assignments = await AcademyAssignment.find({ academyId: req.params.id }).sort({ startsAt: -1 });

    if (isOwner) {
      const User       = mongoose.model('User');
      const students   = await User.find({ _id: { $in: academy.students } }, 'name email');
      const studentMap = {};
      students.forEach(s => { studentMap[s._id.toString()] = { name: s.name, email: s.email }; });
      return res.json(assignments.map(a => ({
        ...a.toObject(),
        submissions: a.submissions.map(sub => ({
          ...sub.toObject(),
          studentName:  studentMap[sub.userId.toString()]?.name  || '—',
          studentEmail: studentMap[sub.userId.toString()]?.email || '—',
        })),
      })));
    }

    // Student: compute live progress from GameHistory and auto-sync submission
    const GameHistory = mongoose.model('GameHistory');
    const result = await Promise.all(assignments.map(async a => {
      const liveCount = await GameHistory.countDocuments({
        userId: req.user._id, mode: a.mode, createdAt: { $gte: a.startsAt },
      });
      const subIdx       = a.submissions.findIndex(s => s.userId.toString() === uid);
      const stored       = subIdx !== -1 ? a.submissions[subIdx] : null;
      const prevDone     = stored?.completed ?? false;
      const nowDone      = prevDone || liveCount >= a.targetGames;
      const completedAt  = stored?.completedAt ?? (nowDone && !prevDone ? new Date() : null);

      if (!stored) {
        await AcademyAssignment.updateOne({ _id: a._id }, {
          $push: { submissions: { userId: req.user._id, gamesPlayed: liveCount, completed: nowDone, completedAt: nowDone ? new Date() : null } },
        });
      } else if (stored.gamesPlayed !== liveCount || stored.completed !== nowDone) {
        const upd = { 'submissions.$.gamesPlayed': liveCount };
        if (!stored.completed && nowDone) { upd['submissions.$.completed'] = true; upd['submissions.$.completedAt'] = new Date(); }
        await AcademyAssignment.updateOne({ _id: a._id, 'submissions.userId': req.user._id }, { $set: upd });
      }

      return {
        _id: a._id, title: a.title, description: a.description, mode: a.mode,
        targetGames: a.targetGames, startsAt: a.startsAt, endsAt: a.endsAt,
        mySubmission: { gamesPlayed: liveCount, completed: nowDone, completedAt },
      };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /academy/:id/assignment/:aId/progress ────────────────────
router.post('/:id/assignment/:aId/progress', requireAuth, async (req, res) => {
  try {
    const gamesPlayed = Number(req.body.gamesPlayed);
    if (!Number.isFinite(gamesPlayed) || gamesPlayed < 0 || gamesPlayed > 10000)
      return res.status(400).json({ error: 'gamesPlayed inválido' });

    const assignment = await AcademyAssignment.findOne({ _id: req.params.aId, academyId: req.params.id });
    if (!assignment) return res.status(404).json({ error: 'Deber no encontrado' });

    const uid = req.user._id.toString();
    let sub   = assignment.submissions.find(s => s.userId.toString() === uid);
    if (!sub) {
      const academy = await Academy.findById(req.params.id, 'students ownerId');
      if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });
      const isMember = academy.students.some(s => s.toString() === uid) || academy.ownerId.toString() === uid;
      if (!isMember) return res.status(403).json({ error: 'No autorizado' });
      assignment.submissions.push({ userId: req.user._id, gamesPlayed: 0, completed: false, completedAt: null });
      sub = assignment.submissions[assignment.submissions.length - 1];
    }

    sub.gamesPlayed = Math.max(sub.gamesPlayed, Math.min(gamesPlayed, 10000));
    if (!sub.completed && sub.gamesPlayed >= assignment.targetGames) {
      sub.completed   = true;
      sub.completedAt = new Date();
    }
    await assignment.save();
    res.json({ ok: true, submission: sub });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /academy/:id/feedback ───────────────────────────────────
router.post('/:id/feedback', requireTeacher, async (req, res) => {
  try {
    const { toId, message } = req.body;
    if (!toId || !message?.trim())
      return res.status(400).json({ error: 'toId y message son obligatorios' });
    if (message.trim().length > 500)
      return res.status(400).json({ error: 'Mensaje demasiado largo (max 500 caracteres)' });

    const academy = await Academy.findById(req.params.id, 'ownerId students');
    if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });
    if (academy.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'No autorizado' });
    if (!academy.students.some(s => s.toString() === toId))
      return res.status(400).json({ error: 'El alumno no pertenece a esta academia' });

    const feedback = await AcademyFeedback.create({
      academyId: req.params.id,
      fromId:    req.user._id,
      toId,
      message:   message.trim(),
    });
    res.status(201).json(feedback);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /academy/:id/feedback/sent ───────────────────────────────
router.get('/:id/feedback/sent', requireTeacher, async (req, res) => {
  try {
    const academy = await Academy.findById(req.params.id, 'ownerId');
    if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });
    if (academy.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'No autorizado' });

    const query = { academyId: req.params.id, fromId: req.user._id };
    if (req.query.toId) query.toId = req.query.toId;

    const messages = await AcademyFeedback.find(query).sort({ createdAt: -1 });
    const studentIds = [...new Set(messages.map(m => m.toId.toString()))];
    const students   = await mongoose.model('User').find({ _id: { $in: studentIds } }, 'name');
    const nameMap    = {};
    students.forEach(s => { nameMap[s._id.toString()] = s.name; });

    res.json(messages.map(m => ({
      ...m.toObject(),
      recipientName: nameMap[m.toId.toString()] || '—',
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /academy/:id/feedback/inbox ──────────────────────────────
router.get('/:id/feedback/inbox', requireAuth, async (req, res) => {
  try {
    const messages = await AcademyFeedback.find({
      academyId: req.params.id,
      toId:      req.user._id,
    }).sort({ createdAt: -1 });

    res.json(messages.map(m => m.toObject()));

    AcademyFeedback.updateMany(
      { academyId: req.params.id, toId: req.user._id, read: false },
      { $set: { read: true } }
    ).catch(() => {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /academy/:id/feedback/unread-count ───────────────────────
router.get('/:id/feedback/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await AcademyFeedback.countDocuments({
      academyId: req.params.id,
      toId:      req.user._id,
      read:      false,
    });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /academy/:id/student/:studentId ─────────────────────────────
router.get('/:id/student/:studentId', requireTeacher, async (req, res) => {
  try {
    const { id: academyId, studentId: sid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sid))
      return res.status(400).json({ error: 'ID de alumno inválido' });

    const academy = await Academy.findById(academyId, 'ownerId students');
    if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });
    if (academy.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'No autorizado' });
    if (!academy.students.some(s => s.toString() === sid))
      return res.status(404).json({ error: 'Alumno no encontrado en esta academia' });

    const GameHistory      = mongoose.model('GameHistory');
    const PortfolioHistory = mongoose.model('PortfolioHistory');
    const User             = mongoose.model('User');
    const sidObj           = new mongoose.Types.ObjectId(sid);

    const [student, modeBreakdown, recentGames, portfolioHist, feedback, assignments] = await Promise.all([
      User.findById(sid, 'name email dailyStreak lastLogin'),

      GameHistory.aggregate([
        { $match: { userId: sidObj, mode: { $in: ['guess', 'survival', 'daily', 'historical', 'portfolio'] } } },
        { $group: { _id: '$mode', gamesPlayed: { $sum: 1 }, avgAccuracy: { $avg: '$accuracy' } } },
      ]),

      GameHistory.find({ userId: sid })
        .sort({ createdAt: -1 }).limit(20).select('accuracy createdAt').lean(),

      PortfolioHistory.find({ userId: sid }).sort({ date: 1 }).select('date totalValue').lean(),

      AcademyFeedback.find({ academyId, toId: sid }).sort({ createdAt: -1 }).lean(),

      AcademyAssignment.find({ academyId }).sort({ startsAt: -1 }).lean(),
    ]);

    if (!student) return res.status(404).json({ error: 'Alumno no encontrado' });

    res.json({
      student: {
        id:            student._id,
        name:          student.name,
        email:         student.email,
        currentStreak: student.dailyStreak || 0,
        lastSeen:      student.lastLogin   || null,
      },
      modeBreakdown: modeBreakdown.map(m => ({
        mode:        m._id,
        gamesPlayed: m.gamesPlayed,
        avgAccuracy: Math.round(m.avgAccuracy),
      })),
      accuracyTrend: [...recentGames].reverse().map(g => ({
        date:     g.createdAt,
        accuracy: g.accuracy,
      })),
      portfolioHistory: portfolioHist.map(h => ({ date: h.date, totalValue: h.totalValue })),
      feedback,
      assignments: assignments.map(a => {
        const sub = a.submissions.find(s => s.userId.toString() === sid);
        return {
          _id:         a._id,
          title:       a.title,
          mode:        a.mode,
          targetGames: a.targetGames,
          startsAt:    a.startsAt,
          endsAt:      a.endsAt,
          submission:  sub ? { gamesPlayed: sub.gamesPlayed, completed: sub.completed, completedAt: sub.completedAt } : null,
        };
      }),
    });
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

// ── POST /academy/leave ───────────────────────────────────────────
router.post('/leave', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    if (!req.user.academyId) return res.status(400).json({ error: 'No estás en ninguna academia' });

    const academy = await Academy.findById(req.user.academyId);
    if (academy) {
      if (academy.ownerId.toString() === userId.toString())
        return res.status(403).json({ error: 'El owner no puede abandonar la academia. Elimínala.' });
      academy.students = academy.students.filter(s => s.toString() !== userId.toString());
      await academy.save();
    }

    await mongoose.model('User').findByIdAndUpdate(userId, { academyId: null, isAcademyPro: false });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /academy/subscribe ───────────────────────────────────────
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { academyId, plan } = req.body;
    if (!academyId || !['starter', 'pro'].includes(plan))
      return res.status(400).json({ error: 'academyId y plan requeridos' });

    const academy = await Academy.findById(academyId);
    if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });
    if (academy.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'No autorizado' });

    const priceId = plan === 'pro'
      ? process.env.STRIPE_ACADEMY_PRO_PRICE_ID
      : process.env.STRIPE_ACADEMY_STARTER_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://tradiko.dev/teacher-dashboard?payment=success',
      cancel_url:  'https://tradiko.dev/teacher-dashboard?payment=cancelled',
      metadata: { academyId: String(academy._id), plan },
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /academy/:id/status ───────────────────────────────────────
router.get('/:id/status', requireAuth, async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'null' || req.params.id === 'undefined')
      return res.status(400).json({ error: 'Academy ID no válido' });

    const academy = await Academy.findById(req.params.id);
    if (!academy) {
      if (req.user.academyId && req.user.academyId.toString() === req.params.id) {
        await mongoose.model('User').findByIdAndUpdate(req.user._id, { academyId: null, isAcademyPro: false });
      }
      return res.status(404).json({ error: 'Academia no encontrada', academyGone: true });
    }

    const now = new Date();

    // Auto-expire trial
    if (academy.trialEndsAt && academy.trialEndsAt < now && !academy.stripeSubscriptionId && academy.isActive) {
      academy.isActive = false;
      await academy.save();
      const User = mongoose.model('User');
      await User.updateMany({ _id: { $in: academy.students } }, { isAcademyPro: false });
    }

    const trialDaysLeft = academy.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(academy.trialEndsAt) - now) / 86400000))
      : null;

    res.json({
      isActive:             academy.isActive,
      plan:                 academy.plan,
      trialEndsAt:          academy.trialEndsAt,
      trialDaysLeft,
      hasSubscription:      !!academy.stripeSubscriptionId,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
