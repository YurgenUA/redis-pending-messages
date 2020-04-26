const moment = require('moment');
const redis = require('redis');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const CONF = {
  db: 3,
  port: process.env.REDIS_PORT || 3001
};
const client = redis.createClient(CONF);
const setAsync = promisify(client.set).bind(client);
const hsetAsync = promisify(client.hset).bind(client);
const hgetAsync = promisify(client.hget).bind(client);
const hdelAsync = promisify(client.hdel).bind(client);
const zaddAsync = promisify(client.zadd).bind(client);
const zremAsync = promisify(client.zrem).bind(client);
const zrangebyscoreAsync = promisify(client.zrangebyscore).bind(client);

const R_MESSAGE_HASH = 'messages';
const R_EXPIRE_SS = 'expirations';
const EXPIRATION_KEY_TAIL = ':expired';

async function setDelayedMessage(message, time) {
  const key = uuidv4();

  const elapseInMilliseconds = time - moment();
  const promises = [
    hsetAsync(R_MESSAGE_HASH, key, message),
    // time as a score
    zaddAsync(R_EXPIRE_SS, time.valueOf(), key),
    // set expiration event
    setAsync(`${key}${EXPIRATION_KEY_TAIL}`, 'expiration', 'PX', elapseInMilliseconds)
  ];
  await Promise.all(promises);
}


async function processExpiredUntilDateMessages(tresholdDate) {
  const LIMIT = 100;
  const OFFSET = 0;
  const response = await zrangebyscoreAsync(R_EXPIRE_SS, 0, tresholdDate.valueOf(), "WITHSCORES", "LIMIT", OFFSET, LIMIT);
  if (response.length < 2) {
    return;
  }
  const expiredKeys = response.filter((it, index) => index % 2 === 0);
  for (const it in expiredKeys) {
    await processExpiredMessage(expiredKeys[it]);
  }
  if (response.length == 2 * LIMIT) {
    await processExpiredUntilDateMessages(tresholdDate);
  }
}

async function processExpiredMessage(key) {
  const messageToPrint = await hgetAsync(R_MESSAGE_HASH, key);

  // cleanup message from redis
  const promises = [
    hdelAsync(R_MESSAGE_HASH, key),
    zremAsync(R_EXPIRE_SS, key)
  ];
  await Promise.all(promises);

  console.log(`>>(${moment()}). Expired message: ${messageToPrint}.`);
}


function SubscribeExpired(e, r) {
  let sub = redis.createClient(CONF)
  const expired_subKey = '__keyevent@' + CONF.db + '__:expired'
  sub.subscribe(expired_subKey, function () {
    console.log('Subscribed to "' + expired_subKey + '" event channel : ' + r);
    sub.on('message', (chan, msg) => {
      if (!msg.endsWith(EXPIRATION_KEY_TAIL)) {
        // unknown item expired
        return;
      }
      processExpiredMessage(msg.replace(EXPIRATION_KEY_TAIL, ''));
    });
  })
}

function watchNotifications() {
  client.send_command('config', ['set', 'notify-keyspace-events', 'Ex'], SubscribeExpired);
}

module.exports = {
  setDelayedMessage,
  processExpiredUntilDateMessages,
  watchNotifications
};