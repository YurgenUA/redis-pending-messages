run Redis in Docker container

docker run --name redis-test -d -p 3001:6379  redis

run Node.js server

npm run dev



curl -H "Content-Type: application/json"  -d "{\"message\":\"hey-ho\",\"time\":\"2020-26-04T10:48:00.000Z\"}" -X POST http://localhost:3000/echoAtTime
