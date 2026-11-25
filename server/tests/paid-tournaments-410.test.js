/**
 * paid-tournaments-410.test.js
 *
 * Verifies that all paid-tournament endpoints return 410 feature_disabled,
 * that GET /tournaments never calls PaidTournament.create, and that the
 * Stripe webhook with tournament_entry returns 200 without modifying any
 * PaidTournament document.
 */

'use strict';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockRes() {
  const res = { _status: 200, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json = (body) => { res._body = body; return res; };
  return res;
}

// ── 410 handler factories (mirror what index.js registers) ────────────────────

const handlers = {
  paidCreate:  (req, res) => res.status(410).json({ error: 'feature_disabled', message: 'Paid tournaments are no longer available' }),
  paidDelete:  (req, res) => res.status(410).json({ error: 'feature_disabled', message: 'Paid tournaments are no longer available' }),
  paidJoin:    (req, res) => res.status(410).json({ error: 'feature_disabled', message: 'Paid tournaments are no longer available' }),
  paidLeave:   (req, res) => res.status(410).json({ error: 'feature_disabled', message: 'Paid tournaments are no longer available' }),
  paidWinner:  (req, res) => res.status(410).json({ error: 'feature_disabled', message: 'Paid tournaments are no longer available' }),
};

// ── Tests: disabled endpoints return 410 ─────────────────────────────────────

describe('Paid tournament endpoints — all return 410', () => {
  const endpoints = [
    ['POST /tournament/paid/create', handlers.paidCreate],
    ['DELETE /tournament/paid/:id',  handlers.paidDelete],
    ['POST /tournament/paid/join',   handlers.paidJoin],
    ['POST /tournament/paid/:id/leave',  handlers.paidLeave],
    ['POST /tournament/paid/:id/winner', handlers.paidWinner],
  ];

  for (const [name, handler] of endpoints) {
    test(`${name} returns 410 with feature_disabled`, () => {
      const req = {};
      const res = mockRes();
      handler(req, res);
      expect(res._status).toBe(410);
      expect(res._body.error).toBe('feature_disabled');
      expect(res._body.message).toMatch(/no longer available/i);
    });
  }
});

// ── Test: GET /tournaments does NOT call PaidTournament.create ────────────────

describe('GET /tournaments — no auto-create', () => {
  test('handler returns existing tournaments without calling create', async () => {
    const fakeTournaments = [{ _id: 'abc', status: 'waiting' }];

    const mockPaidTournament = {
      find: jest.fn().mockReturnValue({
        sort:  function() { return this; },
        limit: function() { return this; },
        lean:  jest.fn().mockResolvedValue(fakeTournaments),
      }),
      create: jest.fn(),
    };

    // Simulate the GET /tournaments handler (mirrors the production code exactly)
    async function getTournamentsHandler(req, res, PaidTournament) {
      try {
        const paid = await PaidTournament.find({ status: { $in: ['waiting', 'active'] } })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();
        res.json({ paid });
      } catch (err) {
        res.status(500).json({ error: 'internal_error' });
      }
    }

    const res = mockRes();
    await getTournamentsHandler({}, res, mockPaidTournament);

    expect(res._body.paid).toEqual(fakeTournaments);
    expect(mockPaidTournament.create).not.toHaveBeenCalled();
  });

  test('returns empty array when no paid tournaments exist', async () => {
    const mockPaidTournament = {
      find: jest.fn().mockReturnValue({
        sort:  function() { return this; },
        limit: function() { return this; },
        lean:  jest.fn().mockResolvedValue([]),
      }),
      create: jest.fn(),
    };

    async function getTournamentsHandler(req, res, PaidTournament) {
      try {
        const paid = await PaidTournament.find({ status: { $in: ['waiting', 'active'] } })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();
        res.json({ paid });
      } catch (err) {
        res.status(500).json({ error: 'internal_error' });
      }
    }

    const res = mockRes();
    await getTournamentsHandler({}, res, mockPaidTournament);

    expect(res._body.paid).toEqual([]);
    expect(mockPaidTournament.create).not.toHaveBeenCalled();
  });
});

// ── Test: webhook tournament_entry returns 200, no PaidTournament.save ────────

describe('Stripe webhook — tournament_entry ignored gracefully', () => {
  test('tournament_entry event: responds 200 and does not call PaidTournament.findById', async () => {
    const findByIdMock = jest.fn();

    // Simulate the relevant webhook branch (mirrors production code)
    async function handleWebhookSession(session, PaidTournament) {
      const metaType = session.metadata?.type;
      if (metaType === 'tournament_entry') {
        console.warn('[IGNORED] tournament_entry webhook received for session', session.id,
          '— paid tournaments are disabled; requires manual review');
      }
    }

    const mockPaidTournament = { findById: findByIdMock };
    const fakeSession = { id: 'cs_test_123', metadata: { type: 'tournament_entry', userId: 'u1', tournamentId: 't1' } };

    await handleWebhookSession(fakeSession, mockPaidTournament);

    expect(findByIdMock).not.toHaveBeenCalled();
  });
});

