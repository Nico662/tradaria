// Single source of truth for valid historical event IDs.
// The canonical list lives in src/historicalEventIds.json — do not add IDs here.
module.exports = new Set(require('../../src/historicalEventIds.json'));
