// Script de solo lectura — NO escribe nada en Redis ni en Mongo.
// Diagnostica por qué un usuario puede recibir múltiples notificaciones del reto diario.
// Uso: node server/scripts/diagnose-push.js
// Requiere server/.env con UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN y MONGODB_URI.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Redis }   = require('@upstash/redis');
const mongoose    = require('mongoose');

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// ── A. Tokens APNs duplicados bajo varios userId ──────────────────────────────
async function checkApnsTokenDuplicates() {
  console.log('\n=== A. apns_token:* — tokens con más de un userId ===');
  const keys = await redis.keys('apns_token:*');
  console.log(`Total claves apns_token:*: ${keys.length}`);

  // token → [userId, ...]
  const tokenToUsers = {};
  for (const key of keys) {
    const userId = key.replace('apns_token:', '');
    const token  = await redis.get(key);
    if (!token) continue;
    if (!tokenToUsers[token]) tokenToUsers[token] = [];
    tokenToUsers[token].push(userId);
  }

  const duplicates = Object.entries(tokenToUsers).filter(([, users]) => users.length > 1);
  if (duplicates.length === 0) {
    console.log('Sin duplicados: cada token pertenece a un único userId.');
  } else {
    console.log(`¡Tokens con >1 userId: ${duplicates.length}!`);
    for (const [token, users] of duplicates) {
      console.log(`  token ${token.slice(0, 8)}…  →  ${users.length} userIds: ${users.join(', ')}`);
    }
  }
  return tokenToUsers;
}

// ── B. Usuarios con apns_token Y push_user_sub a la vez ──────────────────────
async function checkOverlap() {
  console.log('\n=== B. Usuarios con apns_token:* Y push_user_sub:* simultáneos ===');
  const apnsKeys = await redis.keys('apns_token:*');
  const webKeys  = await redis.keys('push_user_sub:*');

  const apnsIds = new Set(apnsKeys.map(k => k.replace('apns_token:', '')));
  const webIds  = new Set(webKeys.map(k => k.replace('push_user_sub:', '')));

  const overlap = [...apnsIds].filter(id => webIds.has(id));
  console.log(`apns_token keys: ${apnsIds.size}  |  push_user_sub keys: ${webIds.size}`);
  if (overlap.length === 0) {
    console.log('Ningún usuario tiene ambos tipos de clave (correcto).');
  } else {
    console.log(`¡${overlap.length} usuario(s) tienen AMBAS claves — el cron APNs envía, pero sendPushToUser también podría web-push si se llama directamente!`);
    for (const id of overlap) console.log(`  userId: ${id}`);
  }
}

// ── C. Claves de push de "nico_" ──────────────────────────────────────────────
async function checkNicoUser(tokenToUsers) {
  console.log('\n=== C. Claves de push del usuario "nico_" ===');
  let User;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    // Schema mínimo — solo lo que necesitamos
    User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  } catch (e) {
    console.log(`No se pudo conectar a Mongo: ${e.message}`);
    console.log('Prueba manual: busca el userId de "nico_" y ejecuta: redis-cli keys "apns_token:<id>" "push_user_sub:<id>"');
    return;
  }

  const user = await User.findOne({ username: 'nico_' }).lean();
  if (!user) {
    console.log('Usuario "nico_" no encontrado en Mongo.');
    await mongoose.disconnect();
    return;
  }
  const userId = user._id.toString();
  console.log(`userId de "nico_": ${userId}`);

  const apnsToken = await redis.get(`apns_token:${userId}`);
  const webSub    = await redis.get(`push_user_sub:${userId}`);

  console.log(`apns_token:${userId}     → ${apnsToken ? `"${apnsToken.slice(0, 8)}…" (${apnsToken.length} chars)` : 'NO existe'}`);
  console.log(`push_user_sub:${userId} → ${webSub ? 'existe' : 'NO existe'}`);

  if (apnsToken) {
    const usersForToken = tokenToUsers[apnsToken] || [];
    if (usersForToken.length > 1) {
      console.log(`\n⚠️  El token "${apnsToken.slice(0, 8)}…" está registrado bajo ${usersForToken.length} userId distintos:`);
      for (const uid of usersForToken) console.log(`    ${uid}${uid === userId ? '  ← nico_' : ''}`);
      console.log('   → El cron envía UNA notificación APNs por cada userId: ese dispositivo recibirá', usersForToken.length, 'notificaciones.');
    } else {
      console.log('Token APNs de nico_ no está duplicado bajo otros userId.');
    }
  }

  // ¿hay más apns_token que apunten al mismo token físico?
  if (apnsToken) {
    const allWithSameToken = Object.entries(tokenToUsers)
      .filter(([tok]) => tok === apnsToken)
      .flatMap(([, ids]) => ids);
    console.log(`\nResumen: el dispositivo físico de nico_ recibirá ${allWithSameToken.length} notificación(es) APNs del cron (una por cada userId que comparte su token).`);
  }

  // Lock de hoy
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
  const lockVal = await redis.get(`cron_lock:dailyChallenge:${today}`);
  console.log(`\ncron_lock:dailyChallenge:${today} → ${lockVal !== null ? `"${lockVal}" (lock presente — el cron ya corrió hoy)` : 'NO existe (el cron aún no corrió hoy o ya expiró)'}`);

  await mongoose.disconnect();
}

// ── D. Cuántos push_user_sub activos (sin apns_token) pasarán web-push ────────
async function countWebPushRecipients() {
  console.log('\n=== D. Receptores web-push del cron (push_user_sub sin apns_token) ===');
  const webKeys = await redis.keys('push_user_sub:*');
  let count = 0;
  for (const key of webKeys) {
    const userId = key.replace('push_user_sub:', '');
    const hasApns = await redis.get(`apns_token:${userId}`);
    if (!hasApns) count++;
  }
  console.log(`${count} usuarios recibirán web-push (tienen push_user_sub pero NO apns_token).`);
}

async function main() {
  try {
    const tokenToUsers = await checkApnsTokenDuplicates();
    await checkOverlap();
    await checkNicoUser(tokenToUsers);
    await countWebPushRecipients();
  } catch (e) {
    console.error('Error inesperado:', e);
  } finally {
    process.exit(0);
  }
}

main();
