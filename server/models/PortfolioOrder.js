const mongoose = require('mongoose');

const PortfolioOrderSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  symbol:        { type: String, required: true },
  name:          { type: String, required: true },
  type:          { type: String, enum: ['buy', 'sell'], required: true },
  qty:           { type: Number, required: true },
  reservedCash:  { type: Number, default: 0 },
  status:        { type: String, enum: ['pending', 'executed', 'cancelled'], default: 'pending' },
  createdAt:     { type: Date, default: Date.now },
  executedAt:    { type: Date, default: null },
  executedPrice: { type: Number, default: null },
  cancelReason:  { type: String, default: null },
});

PortfolioOrderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PortfolioOrder', PortfolioOrderSchema);
