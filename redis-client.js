const redis = require('redis');
const {promisify} = require('util');
const { v4: uuidv4 } = require('uuid');

const client = redis.createClient(process.env.REDIS_URL);
const hsetAsync = promisify(client.hset).bind(client);
const hgetAsync = promisify(client.hget).bind(client);
const hdelAsync = promisify(client.hdel).bind(client);
const zaddAsync = promisify(client.zadd).bind(client);
const zremAsync = promisify(client.zrem).bind(client);
const zrangebyscoreAsync = promisify(client.zrangebyscore).bind(client);

let FAKE_SEED = 1;
const R_MESSAGE_HASH = 'messages2';
const R_EXPIRE_SS = 'expires2';

async function setDelayedMessage(message, time) {
  time = FAKE_SEED++;
  const key = uuidv4();
  await hsetAsync(R_MESSAGE_HASH, key, message);
  // time as a score
  await zaddAsync(R_EXPIRE_SS, time, key);

}


async function processExpiredUntilDateMessages(tresholdDate) {
  const LIMIT = 2;
  const OFFSET = 0;
  const response = await zrangebyscoreAsync(R_EXPIRE_SS, 0, tresholdDate, "WITHSCORES", "LIMIT", OFFSET, LIMIT);
  if (response.length < 2) {
    return;
  }
  const expiredKeys = response.filter((it, index) => index % 2 === 0);
  for(const it in expiredKeys){
    await processExpiredMessage(expiredKeys[it]);
  }
  if (response.length == 2 * LIMIT) {
    await processExpiredUntilDateMessages(tresholdDate);
  }
} 

async function processExpiredMessage(key) {
  console.log('++++ in processExpiredMessage', key);
  const messageToPrint = await hgetAsync(R_MESSAGE_HASH, key);

  // cleanup message from redis
  await hdelAsync(R_MESSAGE_HASH, key);
  await zremAsync(R_EXPIRE_SS, key);

  console.log(`>> expired message: ${messageToPrint}`);
}

module.exports = {
  setDelayedMessage,
  processExpiredUntilDateMessages
};