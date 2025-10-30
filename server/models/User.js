const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    socketId: { type: String },
    online: { type: Boolean, default: true },
    avatar: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
