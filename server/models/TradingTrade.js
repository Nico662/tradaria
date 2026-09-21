const mongoose = require('mongoose');

const TradingTradeSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  symbol:       { type: String, required: true },
  name:         { type: String, required: true },
  category:     { type: String, enum: ['crypto', 'forex', 'commodity', 'index', 'stock'], required: true },
  direction:    { type: String, enum: ['long', 'short'], required: true },
  entryPrice:   { type: Number, required: true },
  closePrice:   { type: Number, required: true },
  lots:         { type: Number, required: true },
  contractSize: { type: Number, required: true },
  marginUsed:   { type: Number, required: true },
  pnl:          { type: Number, required: true },
  pnlPct:       { type: Number, required: true },
  closeReason:  { type: String, enum: ['manual', 'liquidation', 'stop_loss', 'take_profit'], required: true },
  openedAt:     { type: Date,   required: true },
  closedAt:     { type: Date,   default: Date.now },
});

TradingTradeSchema.index({ userId: 1, closedAt: -1 });

module.exports = mongoose.model('TradingTrade', TradingTradeSchema);
