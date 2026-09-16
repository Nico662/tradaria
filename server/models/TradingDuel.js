'use strict';
const mongoose = require('mongoose');

const TradingDuelSchema = new mongoose.Schema({
  challenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  opponent:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:     { type: String, enum: ['pending', 'active', 'finished'], default: 'pending' },
  startDate:  { type: String, default: null },
  endDate:    { type: String, default: null },
  challengerStartEquity: { type: Number, default: null },
  opponentStartEquity:   { type: Number, default: null },
  winner:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('TradingDuel', TradingDuelSchema);
