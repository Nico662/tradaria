const mongoose = require('mongoose');

const TradingAccountSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance:    { type: Number, default: 50000 },
  createdAt:  { type: Date,   default: Date.now },
  resetCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('TradingAccount', TradingAccountSchema);
