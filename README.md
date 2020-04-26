Sample of using Redis to reliable delayed message handling. 
Node.js server implemented with Express.
Use Redis notification to handle(print to server's console) expired message if client (Node.js server) is online.
In case of Node.js server crash, expired messages are processed after ir restarts.

How to test:
1. run Redis (mapped to 3001 port) in Docker container
"docker run --name redis-test -d -p 3001:6379  redis"

2. run Node.js server (mapped to 3000 port)
"npm i"
"npm run dev"

3. send test (time should be in future!) POST request
"curl -H "Content-Type: application/json"  -d "{\"message\":\"hey-ho\",\"time\":\"2020-04-26T15:15:30\"}" -X POST http://localhost:3000/echoAtTime"