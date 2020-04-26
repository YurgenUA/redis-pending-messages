const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');
const redisClient = require('./redis-client');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json({ extended: true }));

app.post('/echoAtTime', async (req, res) => {
  let input = req.body;
  if (!input instanceof Object ||
    !input['message'] ||
    !input['time']) {
    return res.status(400).send('Validation error! Input json should have both "time" and "message"');
  }

  let message = input['message'];
  let time = moment(input['time']);
  if (isNaN(time)) {
    return res.status(400).send('Validation error! "time" should be valid date');
  }
  if (time < Date.now()) {
    return res.status(400).send('Validation error! "time" is in past');
  }

  try {
    await redisClient.setDelayedMessage(message, time);
    console.log('Message submitted to redis');
  }
  catch (err) {
    console.error('redisClient error', err);
    return res.status(500).send(err);
  }

  res.sendStatus(200);
});

app.listen(PORT, async () => {
  console.log(`Started server at http://localhost:${PORT}`);
  await redisClient.processExpiredUntilDateMessages(moment());
  redisClient.watchNotifications();
});