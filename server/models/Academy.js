const mongoose = require('mongoose');

const AcademySchema = new mongoose.Schema({
  name:                 { type: String, required: true },
  slug:                 { type: String, required: true, unique: true },
  ownerId:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan:                 { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'starter' },
  stripeCustomerId:     { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  maxStudents:          { type: Number, default: 30 },
  joinCode:             { type: String, required: true, unique: true },
  logoUrl:              { type: String, default: null },
  students:             [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive:             { type: Boolean, default: true },
  trialEndsAt:          { type: Date, default: null },
  createdAt:            { type: Date, default: Date.now },
});

module.exports = mongoose.model('Academy', AcademySchema);
