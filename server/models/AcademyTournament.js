const mongoose = require('mongoose');

const AcademyTournamentSchema = new mongoose.Schema({
  academyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true },
  name:         { type: String, required: true },
  startsAt:     { type: Date, required: true },
  endsAt:       { type: Date, required: true },
  participants: [{
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score:       { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
  }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

module.exports = mongoose.model('AcademyTournament', AcademyTournamentSchema);
