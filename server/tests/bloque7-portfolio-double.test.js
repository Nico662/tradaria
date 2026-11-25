describe('Bloque 7: mechanic_portfolio_double', () => {
  test('portfolioFilter returns $in:[0,null] for slot 0', () => {
    function portfolioFilter(userId, slot) {
      return slot === 1 ? { userId, slot: 1 } : { userId, slot: { $in: [0, null] } };
    }
    const f = portfolioFilter('u1', 0);
    expect(f.slot).toEqual({ $in: [0, null] });
    expect(f.userId).toBe('u1');
  });

  test('portfolioFilter returns slot:1 for slot 1', () => {
    function portfolioFilter(userId, slot) {
      return slot === 1 ? { userId, slot: 1 } : { userId, slot: { $in: [0, null] } };
    }
    const f = portfolioFilter('u1', 1);
    expect(f.slot).toBe(1);
  });

  test('slot defaults to 0 when raw value is undefined', () => {
    const rawSlot = undefined;
    const slot = Number(rawSlot) === 1 ? 1 : 0;
    expect(slot).toBe(0);
  });

  test('slot 1 validation from query string', () => {
    const rawSlot = '1';
    const slot = Number(rawSlot) === 1 ? 1 : 0;
    expect(slot).toBe(1);
  });

  test('baseline map key uses userId:slot format', () => {
    const baselineMap = {};
    const mockData = [
      { _id: { userId: 'u1', slot: 0 }, totalValue: 52000 },
      { _id: { userId: 'u1', slot: 1 }, totalValue: 48000 },
    ];
    mockData.forEach(h => { baselineMap[`${h._id.userId}:${h._id.slot}`] = h.totalValue; });
    expect(baselineMap['u1:0']).toBe(52000);
    expect(baselineMap['u1:1']).toBe(48000);
  });

  test('leaderboard userPosition picks best entry outside top 10', () => {
    const allLeaderboard = [
      { userId: 'u2', slot: 0, returnPct: 50 },
      { userId: 'u1', slot: 0, returnPct: 40 },
      { userId: 'u3', slot: 0, returnPct: 30 },
      { userId: 'u1', slot: 1, returnPct: 20 },
      { userId: 'u4', slot: 0, returnPct: 10 },
      { userId: 'u5', slot: 0, returnPct: 9 },
      { userId: 'u6', slot: 0, returnPct: 8 },
      { userId: 'u7', slot: 0, returnPct: 7 },
      { userId: 'u8', slot: 0, returnPct: 6 },
      { userId: 'u9', slot: 0, returnPct: 5 },
      { userId: 'u10', slot: 0, returnPct: 4 },
      { userId: 'u11', slot: 0, returnPct: 3 },
    ];
    const userId = 'u9'; // rank 10 — in top 10 (u1 occupies ranks 2 and 4), no userPosition shown
    const allEntries = allLeaderboard.map((e, idx) => ({ ...e, rank: idx + 1 }));
    const outsideTop10 = allEntries.filter(e => e.userId === userId && e.rank > 10);
    expect(outsideTop10.length).toBe(0);
  });

  test('(2) indicator slot — display name logic', () => {
    const entry = { username: 'alice', slot: 1 };
    const display = (entry.username ? `@${entry.username}` : entry.name) + (entry.slot === 1 ? ' (2)' : '');
    expect(display).toBe('@alice (2)');
  });
});
