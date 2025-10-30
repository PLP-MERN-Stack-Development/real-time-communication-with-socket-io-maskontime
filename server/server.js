// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const multer = require('multer');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, unique + ext);
  },
});
const upload = multer({ storage });

// Store connected users, rooms and messages
const users = {};
const messages = []; // { room?: string }
const typingUsers = {};
const rooms = new Set(['general']);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', (username) => {
    users[socket.id] = { username, id: socket.id };
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, id: socket.id });
    // Auto-join default room
    socket.join('general');
    socket.emit('room_joined', { room: 'general' });
    socket.emit('room_list', Array.from(rooms));
    console.log(`${username} joined the chat`);
  });

  // Handle room creation/join
  socket.on('join_room', (room) => {
    if (!room || typeof room !== 'string') return;
    rooms.add(room);
    // Leave all rooms except own id room and new one
    for (const r of socket.rooms) {
      if (r !== socket.id && r !== room) socket.leave(r);
    }
    socket.join(room);
    socket.emit('room_joined', { room });
    io.emit('room_list', Array.from(rooms));
  });

  // Leave current room (joins general)
  socket.on('leave_room', (room) => {
    if (room && socket.rooms.has(room)) socket.leave(room);
    socket.join('general');
    socket.emit('room_joined', { room: 'general' });
  });

  // Handle chat messages
  socket.on('send_message', (messageData) => {
    const message = {
      ...messageData,
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date().toISOString(),
    };

    messages.push(message);

    // Limit stored messages to prevent memory issues
    if (messages.length > 100) {
      messages.shift();
    }

    if (message.room) {
      io.to(message.room).emit('receive_message', message);
    } else {
      io.emit('receive_message', message);
    }
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;

      if (isTyping) {
        typingUsers[socket.id] = username;
      } else {
        delete typingUsers[socket.id];
      }

      io.emit('typing_users', Object.values(typingUsers));
    }
  });

  // Handle private messages
  socket.on('private_message', ({ to, message }) => {
    const messageData = {
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };

    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const { username } = users[socket.id];
      io.emit('user_left', { username, id: socket.id });
      console.log(`${username} left the chat`);
    }

    delete users[socket.id];
    delete typingUsers[socket.id];

    io.emit('user_list', Object.values(users));
    io.emit('typing_users', Object.values(typingUsers));
  });
});

// API routes
app.get('/api/messages', (req, res) => {
  const { room } = req.query;
  if (room) {
    return res.json(messages.filter((m) => m.room === room));
  }
  res.json(messages);
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

app.get('/api/rooms', (req, res) => {
  res.json(Array.from(rooms));
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const urlPath = `/uploads/${req.file.filename}`;
  res.json({ url: urlPath });
});

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io }; 