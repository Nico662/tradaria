const mongoose = require('mongoose');

const SeasonSchema = new mongoose.Schema({
  seasonId:  { type: Number, required: true, unique: true },
  name:      { type: String, required: true },
  startDate: { type: Date,   required: true },
  endDate:   { type: Date,   required: true },
  status:    { type: String, enum: ['upcoming', 'active', 'ended'], default: 'upcoming' },
  createdAt: { type: Date,   default: Date.now },
});

module.exports = mongoose.model('Season', SeasonSchema);
