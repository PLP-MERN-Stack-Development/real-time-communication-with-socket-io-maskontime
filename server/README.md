# Server — Socket.io Chat

This folder contains the Express + Socket.io server for the real-time chat assignment.

Note: I did not create a `.env` file. Create one yourself and set the values you need (PORT, CLIENT_URL, MONGO_URI, etc.).

Getting started

1. From the `server` folder install dependencies:

```powershell
npm install
```

2. Create a `.env` file (example values):

```
PORT=5000
CLIENT_URL=http://localhost:5173
# MONGO_URI=mongodb://localhost:27017/socketio-chat
```

3. Run in development (uses `nodemon`):

```powershell
npm run dev
```

Features included

- Socket.io real-time events (user join, send_message, private_message, typing)
- Upload endpoint at `POST /api/upload` (multipart/form-data field name `file`)
- Optional MongoDB integration: if `MONGO_URI` is set the server will try to connect and use `models/Message.js` and `models/User.js`.
- Pagination support on `GET /api/messages` (query params `page` and `limit`)
- Basic security (helmet), logging (morgan), rate limiter, and graceful shutdown

If you want me to remove anything or change the way uploads are stored, tell me and I can update the code.
