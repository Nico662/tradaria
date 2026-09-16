const mongoose = require('mongoose');

const TradingPositionSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  symbol:       { type: String, required: true },
  name:         { type: String, required: true },
  category:     { type: String, enum: ['crypto', 'forex', 'commodity', 'index', 'stock'], required: true },
  direction:    { type: String, enum: ['long', 'short'], required: true },
  entryPrice:   { type: Number, required: true },
  lots:         { type: Number, required: true },
  contractSize: { type: Number, required: true },
  leverage:     { type: Number, default: 100 },
  marginUsed:   { type: Number, required: true },
  stopLoss:     { type: Number, default: null },
  takeProfit:   { type: Number, default: null },
  openedAt:     { type: Date,   default: Date.now },
});

module.exports = mongoose.model('TradingPosition', TradingPositionSchema);
