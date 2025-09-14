const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/database");
require("dotenv").config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// CORS configuration for Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "https://live-stream-frontend-six.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const PORT = process.env.PORT || 3001;

// Import routes
const roomRoutes = require("./routes/rooms");

// Import models
const Room = require("./models/Room");
const Message = require("./models/Message");

// Import middleware
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://https://live-stream-frontend-six.vercel.applive-stream-frontend-six.vercel.app",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan("combined"));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeConnections: io.engine.clientsCount,
  });
});

// API routes
app.use("/api/rooms", roomRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "LiveStream Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      users: "/api/users",
      streams: "/api/streams",
      rooms: "/api/rooms",
    },
    socketio: {
      enabled: true,
      transports: ["websocket", "polling"],
    },
  });``
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Store user info if available
  let currentUser = null;
  let currentRoom = null;

  // Handle user authentication (optional)
  socket.on("authenticate", (userData) => {
    currentUser = userData;
    console.log(
      `👤 User authenticated: ${userData.displayName || userData.username}`
    );
  });

  // Handle room creation
  socket.on("createRoom", async (roomData) => {
    try {
      // Generate unique room ID if not provided
      const roomId =
        roomData.id ||
        `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Check if room ID already exists
      const existingRoom = await Room.findByRoomId(roomId);
      if (existingRoom) {
        socket.emit("error", {
          message: "Room ID already exists",
          code: "ROOM_ID_EXISTS",
        });
        return;
      }

      const newRoomData = {
        id: roomId,
        title: roomData.title,
        description: roomData.description || '',
        admin: {
          uid: roomData.admin.uid,
          displayName: roomData.admin.displayName,
          username: roomData.admin.username,
          avatar: roomData.admin.avatar || ''
        },
        participants: [{
          uid: roomData.admin.uid,
          displayName: roomData.admin.displayName,
          username: roomData.admin.username,
          avatar: roomData.admin.avatar || '',
          socketId: socket.id
        }],
        isLive: true,
        status: 'live',
        category: roomData.category || 'general',
        tags: roomData.tags || [],
        isPublic: roomData.isPublic !== false,
        maxParticipants: roomData.maxParticipants || 100,
        createdBy: socket.id,
        lastActivity: new Date()
      };

      // Store room in database
      const newRoom = await Room.create(newRoomData);

      // Join the socket to the room
      socket.join(roomId);
      currentRoom = roomId;

      // Notify all clients about new room
      io.emit("roomsUpdated", { type: "roomCreated", room: newRoom });

      // Confirm room creation to creator
      socket.emit("roomCreated", newRoom);

      console.log(
        `🏠 Room created: ${roomId} by ${
          roomData.admin?.displayName || "Unknown"
        }`
      );
    } catch (error) {
      console.error("❌ Error creating room:", error);
      socket.emit("error", {
        message: "Failed to create room",
        code: "ROOM_CREATE_ERROR",
      });
    }
  });

  // Handle joining room
  socket.on("joinRoom", async (data) => {
    try {
      const { roomId, user } = data;

      // Check if room exists in database
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        socket.emit("error", {
          message: "Room not found",
          code: "ROOM_NOT_FOUND",
        });
        return;
      }

      // Check if room is live
      if (!room.isLive || room.status !== 'live') {
        socket.emit("error", {
          message: "Room is not live",
          code: "ROOM_NOT_LIVE",
        });
        return;
      }

      // Check if room has space
      if (room.currentParticipants >= room.maxParticipants) {
        socket.emit("error", {
          message: "Room is full",
          code: "ROOM_FULL",
        });
        return;
      }

      // Check if user is already in the room
      const existingParticipant = room.participants.find(p => p.uid === user.uid);
      if (existingParticipant) {
        // Update socket ID for existing participant
        room.updateParticipantSocket(user.uid, socket.id);
        await room.save();
      } else {
        // Add new participant
        const participantData = {
          uid: user.uid,
          displayName: user.displayName,
          username: user.username,
          avatar: user.avatar || '',
          socketId: socket.id
        };
        room.addParticipant(participantData);
        await room.save();
      }

      // Join the socket to the room
      socket.join(roomId);
      currentRoom = roomId;
      currentUser = user;

      // Fetch recent messages from database
      const recentMessages = await Message.findRecentMessages(roomId, 50);

      // Send room data to user
      socket.emit("roomUpdated", {
        id: roomId,
        title: room.title,
        description: room.description,
        participants: room.participants,
        admin: room.admin,
        currentParticipants: room.currentParticipants,
        maxParticipants: room.maxParticipants,
        isLive: room.isLive,
        status: room.status
      });

      // Send existing messages
      socket.emit("existingMessages", recentMessages.reverse());

      // Notify others in room
      socket.to(roomId).emit("userJoined", user);
      socket.to(roomId).emit("roomUpdated", {
        id: roomId,
        participants: room.participants,
        currentParticipants: room.currentParticipants
      });

      console.log(
        `👥 User ${user.displayName || user.username} joined room ${roomId}`
      );
    } catch (error) {
      console.error("❌ Error joining room:", error);
      socket.emit("error", {
        message: "Failed to join room",
        code: "ROOM_JOIN_ERROR",
      });
    }
  });

  // Handle sending messages
  socket.on("sendMessage", async (message) => {
    try {
      const { roomId, text, user } = message;

      // Validate message
      if (!text || text.trim().length === 0) {
        socket.emit("error", {
          message: "Message cannot be empty",
          code: "EMPTY_MESSAGE",
        });
        return;
      }

      // Check if room exists and user is in it
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        socket.emit("error", {
          message: "Room not found",
          code: "ROOM_NOT_FOUND",
        });
        return;
      }

      const isParticipant = room.participants.some(p => p.uid === user.uid);
      if (!isParticipant) {
        socket.emit("error", {
          message: "You are not in this room",
          code: "NOT_IN_ROOM",
        });
        return;
      }

      // Create message object
      const messageData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        roomId: roomId,
        text: text.trim(),
        user: {
          uid: user.uid,
          displayName: user.displayName,
          username: user.username,
          avatar: user.avatar || ''
        },
        socketId: socket.id,
        messageType: 'text'
      };

      // Store message in database
      const savedMessage = await Message.create(messageData);

      // Update room last activity
      room.lastActivity = new Date();
      await room.save();

      // Broadcast to all users in room
      io.to(roomId).emit("newMessage", savedMessage);

      console.log(
        `💬 Message sent in room ${roomId}: ${text.substring(0, 50)}...`
      );
    } catch (error) {
      console.error("❌ Error sending message:", error);
      socket.emit("error", {
        message: "Failed to send message",
        code: "MESSAGE_SEND_ERROR",
      });
    }
  });

  // Handle leaving room
  socket.on("leaveRoom", async (data) => {
    try {
      const { roomId, user } = data;

      // Update room participants in database
      const room = await Room.findByRoomId(roomId);
      if (room) {
        room.removeParticipant(user.uid);
        await room.save();

        // Notify others in room with updated participant list
        socket.to(roomId).emit("userLeft", user);
        socket.to(roomId).emit("roomUpdated", {
          id: roomId,
          participants: room.participants,
          currentParticipants: room.currentParticipants
        });
      }

      // Leave the socket from the room
      socket.leave(roomId);
      currentRoom = null;

      console.log(
        `👋 User ${user.displayName || user.username} left room ${roomId}`
      );
    } catch (error) {
      console.error("❌ Error leaving room:", error);
    }
  });

  // Handle ending stream (admin only)
  socket.on("endStream", async (data) => {
    try {
      const { roomId } = data;

      // Verify admin permissions
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      if (room.admin.uid !== currentUser?.uid) {
        socket.emit('error', { message: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      // Update room status
      room.isLive = false;
      room.status = 'ended';
      room.endedAt = new Date();
      await room.save();

      // Notify all users in room that stream is ending
      io.to(roomId).emit("roomDeleted", { roomId, reason: "ended_by_admin" });

      // Notify all clients about room deletion
      io.emit("roomsUpdated", { type: "roomDeleted", roomId });

      console.log(`🔚 Stream ended for room ${roomId}`);
    } catch (error) {
      console.error("❌ Error ending stream:", error);
      socket.emit("error", {
        message: "Failed to end stream",
        code: "STREAM_END_ERROR",
      });
    }
  });

  // Handle getting all rooms
  socket.on("getRooms", async () => {
    try {
      // Fetch active rooms from database
      const rooms = await Room.findActiveRooms();

      socket.emit("roomsUpdated", { type: "roomsList", rooms });
    } catch (error) {
      console.error("❌ Error fetching rooms:", error);
      socket.emit("error", {
        message: "Failed to fetch rooms",
        code: "ROOMS_FETCH_ERROR",
      });
    }
  });

  // Handle leaving all rooms (for logout)
  socket.on("leaveAllRooms", async () => {
    try {
      // Get all rooms this socket is in and leave them
      const rooms = Array.from(socket.rooms);
      
      for (const roomId of rooms) {
        if (roomId !== socket.id) {
          // Update database to remove user from room
          const room = await Room.findByRoomId(roomId);
          if (room && currentUser) {
            room.removeParticipant(currentUser.uid);
            await room.save();
            
            // Notify others in room
            socket.to(roomId).emit("userLeft", currentUser);
            socket.to(roomId).emit("roomUpdated", {
              id: roomId,
              participants: room.participants,
              currentParticipants: room.currentParticipants
            });
          }
          
          socket.leave(roomId);
        }
      }
      
      currentRoom = null;
      console.log(`👋 User left all rooms`);
    } catch (error) {
      console.error("❌ Error leaving all rooms:", error);
    }
  });

  // Handle typing indicators
  socket.on("typing", (data) => {
    const { roomId, user, isTyping } = data;
    socket.to(roomId).emit("userTyping", { user, isTyping });
  });

  // Handle disconnect
  socket.on("disconnect", async (reason) => {
    console.log(`🔌 User disconnected: ${socket.id}, reason: ${reason}`);

    try {
      // Clean up user from all rooms
      if (currentRoom && currentUser) {
        const room = await Room.findByRoomId(currentRoom);
        if (room) {
          room.removeParticipant(currentUser.uid);
          await room.save();
          
          socket.to(currentRoom).emit("userLeft", {
            uid: currentUser.uid,
            displayName: currentUser.displayName || "Unknown User",
          });
          
          socket.to(currentRoom).emit("roomUpdated", {
            id: currentRoom,
            participants: room.participants,
            currentParticipants: room.currentParticipants
          });
        }
      }

      // Update room list
      io.emit("roomsUpdated", { type: "userDisconnected", socketId: socket.id });
    } catch (error) {
      console.error("❌ Error during disconnect cleanup:", error);
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/`);
  console.log(`🔌 Socket.io server ready for connections`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

module.exports = { app, server, io };