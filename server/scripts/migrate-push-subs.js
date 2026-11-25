// Migra suscripciones del array legacy push_subscriptions a las keys push_user_sub:{userId}.
// Ejecutar una sola vez: node server/scripts/migrate-push-subs.js
// Requiere que server/.env esté configurado con las credenciales de Redis de producción.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

async function main() {
  const raw = await redis.get('push_subscriptions');
  if (!raw) { console.log('push_subscriptions vacío o no existe. Nada que migrar.'); return; }

  const subs = Array.isArray(raw) ? raw : JSON.parse(raw);
  console.log(`Encontradas ${subs.length} entradas en push_subscriptions.`);

  let migrated = 0;
  let skippedNoUserId = 0;
  let skippedAlreadyExists = 0;

  for (const sub of subs) {
    if (!sub.userId) {
      skippedNoUserId++;
      continue;
    }
    const existing = await redis.get(`push_user_sub:${sub.userId}`);
    if (existing) {
      skippedAlreadyExists++;
      continue;
    }
    const { userId, ...subData } = sub;
    await redis.set(`push_user_sub:${userId}`, JSON.stringify(subData));
    migrated++;
  }

  console.log(`Migradas:          ${migrated}`);
  console.log(`Ya existían:       ${skippedAlreadyExists}`);
  console.log(`Sin userId:        ${skippedNoUserId} (no se pueden migrar)`);
}

main().catch(err => { console.error(err); process.exit(1); });
