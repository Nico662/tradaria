const mongoose = require('mongoose');

const TradingAccountHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:   { type: String, required: true },  // YYYY-MM-DD
  equity: { type: Number, required: true },
});

TradingAccountHistorySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('TradingAccountHistory', TradingAccountHistorySchema);
