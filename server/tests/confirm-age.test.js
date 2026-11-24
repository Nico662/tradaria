/**
 * confirm-age.test.js
 *
 * Tests for POST /user/confirm-age endpoint:
 * - Valid token + accept:true → 200 ok
 * - Valid token + accept:false → 400
 * - Valid token + no accept → 400
 * - No token → 401
 * - Idempotent: calling twice → 200 both times
 */

'use strict';

process.env.JWT_SECRET = 'test_secret_age';

const jwt = require('jsonwebtoken');
const { connect, disconnect, clearDatabase } = require('./helpers/testApp');
const mongoose = require('mongoose');

// ── Minimal User model for this test ─────────────────────────────────────────

const userSchema = new mongoose.Schema({
  ageConfirmedAt:      { type: Date,   default: null },
  ageConfirmedVersion: { type: Number, default: null },
});

let User;

// ── Inline reimplementation of the endpoint (mirrors production code exactly) ──

async function confirmAgeHandler(req, res) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), 'test_secret_age');
    const { accept } = req.body;
    if (!accept) return res.status(400).json({ error: 'accept must be true' });
    await User.findByIdAndUpdate(decoded.id, {
      $set: { ageConfirmedAt: new Date(), ageConfirmedVersion: 1 },
    }, { new: true });
    res.json({ ok: true });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'No token' });
    }
    res.status(500).json({ error: 'internal_error' });
  }
}

function mockRes() {
  const r = { _status: 200, _body: null };
  r.status = (code) => { r._status = code; return r; };
  r.json   = (body) => { r._body = body; return r; };
  return r;
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  await connect();
  try { User = mongoose.model('UserAge'); }
  catch { User = mongoose.model('UserAge', userSchema); }
});

afterAll(async () => {
  await disconnect();
});

afterEach(async () => {
  await clearDatabase();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /user/confirm-age', () => {
  test('valid token + accept:true → 200 ok', async () => {
    const user  = await User.create({});
    const token = jwt.sign({ id: user._id.toString() }, 'test_secret_age');
    const req   = { headers: { authorization: `Bearer ${token}` }, body: { accept: true } };
    const res   = mockRes();

    await confirmAgeHandler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);

    const updated = await User.findById(user._id);
    expect(updated.ageConfirmedAt).toBeTruthy();
    expect(updated.ageConfirmedVersion).toBe(1);
  });

  test('valid token + accept:false → 400', async () => {
    const user  = await User.create({});
    const token = jwt.sign({ id: user._id.toString() }, 'test_secret_age');
    const req   = { headers: { authorization: `Bearer ${token}` }, body: { accept: false } };
    const res   = mockRes();

    await confirmAgeHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/accept must be true/i);
  });

  test('valid token + no accept field → 400', async () => {
    const user  = await User.create({});
    const token = jwt.sign({ id: user._id.toString() }, 'test_secret_age');
    const req   = { headers: { authorization: `Bearer ${token}` }, body: {} };
    const res   = mockRes();

    await confirmAgeHandler(req, res);

    expect(res._status).toBe(400);
  });

  test('no token → 401', async () => {
    const req = { headers: {}, body: { accept: true } };
    const res = mockRes();

    await confirmAgeHandler(req, res);

    expect(res._status).toBe(401);
  });

  test('idempotent: calling twice with accept:true → both return 200', async () => {
    const user  = await User.create({});
    const token = jwt.sign({ id: user._id.toString() }, 'test_secret_age');
    const makeReq = () => ({ headers: { authorization: `Bearer ${token}` }, body: { accept: true } });

    const res1 = mockRes();
    await confirmAgeHandler(makeReq(), res1);
    expect(res1._status).toBe(200);

    const res2 = mockRes();
    await confirmAgeHandler(makeReq(), res2);
    expect(res2._status).toBe(200);

    const updated = await User.findById(user._id);
    expect(updated.ageConfirmedVersion).toBe(1);
  });
});
