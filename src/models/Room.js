const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Room title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters'],
    default: ''
  },
  admin: {
    uid: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: ''
    }
  },
  participants: [{
    uid: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: ''
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    socketId: {
      type: String,
      required: false
    }
  }],
  isLive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['live', 'ended', 'scheduled'],
    default: 'live'
  },
  streamKey: {
    type: String,
    unique: true,
    sparse: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  maxParticipants: {
    type: Number,
    default: 100
  },
  currentParticipants: {
    type: Number,
    default: 1
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  createdBy: {
    type: String, // socket.id of creator
    required: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes
RoomSchema.index({ id: 1 });
RoomSchema.index({ isLive: 1 });
RoomSchema.index({ status: 1 });
RoomSchema.index({ createdAt: -1 });
RoomSchema.index({ category: 1 });
RoomSchema.index({ 'admin.uid': 1 });
RoomSchema.index({ 'participants.uid': 1 });

// Virtual for participant count
RoomSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Method to add participant
RoomSchema.methods.addParticipant = function(participant) {
  const existingParticipant = this.participants.find(p => p.uid === participant.uid);
  if (!existingParticipant) {
    this.participants.push(participant);
    this.currentParticipants = this.participants.length;
    this.lastActivity = new Date();
  }
  return this;
};

// Method to remove participant
RoomSchema.methods.removeParticipant = function(uid) {
  this.participants = this.participants.filter(p => p.uid !== uid);
  this.currentParticipants = this.participants.length;
  this.lastActivity = new Date();
  return this;
};

// Method to update participant socket
RoomSchema.methods.updateParticipantSocket = function(uid, socketId) {
  const participant = this.participants.find(p => p.uid === uid);
  if (participant) {
    participant.socketId = socketId;
  }
  return this;
};

// Static method to find active rooms
RoomSchema.statics.findActiveRooms = function() {
  return this.find({ isLive: true, status: 'live' })
    .sort({ lastActivity: -1 })
    .limit(50);
};

// Static method to find room by ID
RoomSchema.statics.findByRoomId = function(roomId) {
  return this.findOne({ id: roomId });
};

// Ensure virtual fields are serialized
RoomSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Room', RoomSchema);
