const jwt = require('jsonwebtoken');

/**
 * Resolves a JWT from a socket join event to a userId string.
 * Returns null on any failure — never throws.
 * Does NOT write to userSockets; that map is exclusively for the challenge system.
 */
function verifySocketToken(token) {
  if (!token || typeof token !== 'string') return null;
  try { return String(jwt.verify(token, process.env.JWT_SECRET).id); } catch { return null; }
}

module.exports = { verifySocketToken };
