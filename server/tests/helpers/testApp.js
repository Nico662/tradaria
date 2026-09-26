const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

async function connect() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function disconnect() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
}

async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

// Minimal User schema for tests — mirrors fields used by the tested endpoints.
// Registered as 'User' so battlepass.js functions (mongoose.model('User')) work.
const userSchema = new mongoose.Schema({
  username:       String,
  xp:             { type: Number, default: 0 },
  badges:         { type: [String], default: [] },
  purchases:      { type: [String], default: [] },
  activeCosmetics:{ type: mongoose.Schema.Types.Mixed, default: {} },
  dailyStreak:    { type: Number, default: 0 },
  streakBeforeLoss: { type: Number, default: 0 },
  lastPlayed:     { type: Date, default: null },
  dailyResult:    mongoose.Schema.Types.Mixed,
  isPro:          { type: Boolean, default: false },
  battlePass: {
    seasonId:                  String,
    bpPoints:                  { type: Number,   default: 0 },
    completedMissions:         { type: [String], default: [] },
    claimedRewards:            { type: [Number], default: [] },
    claimedFreeRewards:        { type: [Number], default: [] },
    claimedProRewards:         { type: [Number], default: [] },
    dailiesCompleted:          { type: Number,   default: 0 },
    survivalRoundsTotal:       { type: Number,   default: 0 },
    classicMaxStreak:          { type: Number,   default: 0 },
    classicWinsTotal:          { type: Number,   default: 0 },
    historicalEventsCompleted: { type: Number,   default: 0 },
    completedEventIds:         { type: [String], default: [] },
    arenaWinsTotal:            { type: Number,   default: 0 },
    missionBaselines:          { type: Map, of: Number, default: new Map() },
    missionStreakCounters:     { type: Map, of: Number, default: new Map() },
  },
  battlePassItems:      { type: Array, default: [] },
  battlePassMechanics:  { type: [String], default: [] },
});

let UserModel;
function getUser() {
  if (!UserModel) {
    // Use a unique model name per test run to avoid OverwriteModelError
    try {
      UserModel = mongoose.model('User');
    } catch {
      UserModel = mongoose.model('User', userSchema);
    }
  }
  return UserModel;
}

module.exports = { connect, disconnect, clearDatabase, getUser };
