# Oref Shelter Timer

## Production (Docker)

```bash
docker compose up -d --build
```

App will be available at http://localhost:5300

To stop:
```bash
docker compose down
```

## Development

### Server (Terminal 1)
```bash
cd server
npm install
PORT=5300 node index.js
```

### Client (Terminal 2)
```bash
cd client
npm install
PORT=5400 npm start
```

Client will be available at http://localhost:5400 and will proxy API requests to the server on port 5300.

### Windows (PowerShell)
```powershell
# Server
cd server
$env:PORT=5300; node index.js

# Client
cd client
$env:PORT=5400; npm start
```
