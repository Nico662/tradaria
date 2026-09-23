const mongoose = require('mongoose');

const AcademyAssignmentSchema = new mongoose.Schema({
  academyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true },
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  mode:         { type: String, enum: ['guess', 'survival', 'daily', 'portfolio'], required: true },
  targetGames:  { type: Number, required: true },
  startsAt:     { type: Date, required: true },
  endsAt:       { type: Date, required: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submissions:  [{
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gamesPlayed: { type: Number, default: 0 },
    completed:   { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  }],
}, { timestamps: true });

module.exports = mongoose.model('AcademyAssignment', AcademyAssignmentSchema);
