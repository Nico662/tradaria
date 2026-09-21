'use strict';
const mongoose = require('mongoose');

const TradingLeagueSchema = new mongoose.Schema({
  name:  { type: String, required: true, maxlength: 30 },
  code:  { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startEquity: { type: Number, default: 50000 },
    joinedAt:    { type: Date, default: Date.now },
  }],
  startDate: { type: String, required: true },
  endDate:   { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TradingLeague', TradingLeagueSchema);
