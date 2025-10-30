# Assignment Submission — Real-Time Communication with Socket.io

- **Repository**: real-time-communication-with-socket-io-maskontime
- **Week**: 5 — Real-Time Communication
- For the detailed brief, see `Week5-Assignment.md`.

## Overview
A real-time chat app using Socket.io, Express, and React (Vite). The client connects to the server via WebSocket, supports public and private messages, online users list, and typing indicators. REST endpoints are used to fetch initial messages and users for a consistent first load.

## Structure
- **`server/`**: Express + Socket.io server. Exposes:
  - `GET /api/messages` to fetch recent messages
  - `GET /api/users` to fetch current online users
  - Socket events: `user_join`, `receive_message`, `private_message`, `user_list`, `user_joined`, `user_left`, `typing_users`
- **`client/`**: React (Vite) app with Chakra UI.
  - `src/socket/socket.js`: Socket.io client + `useSocket()` hook
  - `src/App.jsx`: Chat UI wired to server events and REST endpoints
  - `src/main.jsx`: Wraps app with `ChakraProvider`

## Features Implemented
- **Real-time messaging**: Public and private messages using Socket.io
- **User presence**: Online users list via `user_list`
- **Typing indicators**: Real-time indicator via `typing`/`typing_users`
- **System events**: Join/leave announcements via `user_joined`/`user_left`
- **Initial data load**: Fetch messages and users from REST endpoints for a consistent initial state

## Environment Variables
Create `.env` files as needed.

- Server (`server/.env`):
```
PORT=5000
CLIENT_URL=http://localhost:5173
# MONGO_URI=mongodb://localhost:27017/socketio-chat  (optional)
```

- Client (`client/.env`):
```
VITE_SOCKET_URL=http://localhost:5000
# Optionally override REST base
# VITE_API_URL=http://localhost:5000
```

## Running Locally
1. Install server deps
```
cd server
npm install
npm run dev
```
2. Install client deps (in a separate terminal)
```
cd client
npm install
npm run dev
```
3. Open the Vite URL (default `http://localhost:5173`).

## Notes
- The client aligns with the server’s events and endpoints in `server/server.js`.
- CORS is configured on the server for `http://localhost:5173` by default.
- Pagination exists on the server route in the README; the client currently loads the default message list.
- A nested scaffold exists at `client/socket.io/`; the working client is in `client/`.

## Reference
- See `Week5-Assignment.md` for the original task list and grading guidance.
- See root `README.md` for project overview and resources.
