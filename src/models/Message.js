const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomId: {
    type: String,
    required: true,
    index: true
  },
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true,
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  user: {
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
  socketId: {
    type: String,
    required: false
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  metadata: {
    fileName: String,
    fileSize: Number,
    fileType: String,
    imageUrl: String,
    thumbnailUrl: String
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  reactions: [{
    user: {
      uid: String,
      displayName: String
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: String, // message ID this is replying to
    ref: 'Message'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedAt: {
    type: Date
  },
  pinnedBy: {
    uid: String,
    displayName: String
  }
}, {
  timestamps: true
});

// Create indexes
MessageSchema.index({ id: 1 });
MessageSchema.index({ roomId: 1 });
MessageSchema.index({ 'user.uid': 1 });
MessageSchema.index({ createdAt: -1 });
MessageSchema.index({ roomId: 1, createdAt: -1 });
MessageSchema.index({ isDeleted: 1 });

// Virtual for reaction count
MessageSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Method to add reaction
MessageSchema.methods.addReaction = function(user, emoji) {
  // Remove existing reaction from same user
  this.reactions = this.reactions.filter(r => r.user.uid !== user.uid);
  // Add new reaction
  this.reactions.push({
    user: {
      uid: user.uid,
      displayName: user.displayName
    },
    emoji: emoji
  });
  return this;
};

// Method to remove reaction
MessageSchema.methods.removeReaction = function(userUid) {
  this.reactions = this.reactions.filter(r => r.user.uid !== userUid);
  return this;
};

// Method to edit message
MessageSchema.methods.editMessage = function(newText) {
  this.text = newText;
  this.isEdited = true;
  this.editedAt = new Date();
  return this;
};

// Method to delete message (soft delete)
MessageSchema.methods.deleteMessage = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this;
};

// Method to pin message
MessageSchema.methods.pinMessage = function(user) {
  this.isPinned = true;
  this.pinnedAt = new Date();
  this.pinnedBy = {
    uid: user.uid,
    displayName: user.displayName
  };
  return this;
};

// Method to unpin message
MessageSchema.methods.unpinMessage = function() {
  this.isPinned = false;
  this.pinnedAt = undefined;
  this.pinnedBy = undefined;
  return this;
};

// Static method to find messages by room
MessageSchema.statics.findByRoom = function(roomId, limit = 50, skip = 0) {
  return this.find({ 
    roomId: roomId, 
    isDeleted: false 
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to find recent messages
MessageSchema.statics.findRecentMessages = function(roomId, limit = 20) {
  return this.find({ 
    roomId: roomId, 
    isDeleted: false 
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search messages
MessageSchema.statics.searchMessages = function(roomId, searchTerm, limit = 20) {
  return this.find({
    roomId: roomId,
    isDeleted: false,
    text: { $regex: searchTerm, $options: 'i' }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Ensure virtual fields are serialized
MessageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Message', MessageSchema);
