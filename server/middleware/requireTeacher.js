const jwt      = require('jsonwebtoken');
const mongoose = require('mongoose');

module.exports = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
    const User    = mongoose.model('User');
    const user    = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.role !== 'teacher') return res.status(403).json({ error: 'Teacher role required' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
