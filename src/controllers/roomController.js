const Room = require('../models/Room');
const Message = require('../models/Message');

// @desc    Get all active rooms
// @route   GET /api/rooms
// @access  Public
const getRooms = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    
    let query = { isLive: true, status: 'live' };
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const rooms = await Room.find(query)
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-participants.socketId'); // Don't expose socket IDs
    
    const total = await Room.countDocuments(query);
    
    res.json({
      success: true,
      count: rooms.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: rooms
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get room by ID
// @route   GET /api/rooms/:id
// @access  Public
const getRoom = async (req, res) => {
  try {
    const room = await Room.findByRoomId(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Don't expose socket IDs
    const roomData = room.toObject();
    if (roomData.participants) {
      roomData.participants = roomData.participants.map(p => {
        const { socketId, ...participant } = p;
        return participant;
      });
    }
    
    res.json({
      success: true,
      data: roomData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get room messages
// @route   GET /api/rooms/:id/messages
// @access  Public
const getRoomMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const roomId = req.params.id;
    
    // Check if room exists
    const room = await Room.findByRoomId(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    const messages = await Message.findByRoom(
      roomId, 
      parseInt(limit), 
      (parseInt(page) - 1) * parseInt(limit)
    );
    
    const total = await Message.countDocuments({ roomId, isDeleted: false });
    
    res.json({
      success: true,
      count: messages.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: messages
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search messages in room
// @route   GET /api/rooms/:id/search
// @access  Public
const searchRoomMessages = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const roomId = req.params.id;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Check if room exists
    const room = await Room.findByRoomId(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    const messages = await Message.searchMessages(roomId, q, parseInt(limit));
    
    res.json({
      success: true,
      count: messages.length,
      query: q,
      data: messages
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get room statistics
// @route   GET /api/rooms/:id/stats
// @access  Public
const getRoomStats = async (req, res) => {
  try {
    const roomId = req.params.id;
    
    const room = await Room.findByRoomId(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    const messageCount = await Message.countDocuments({ roomId, isDeleted: false });
    const recentMessages = await Message.findRecentMessages(roomId, 10);
    
    const stats = {
      roomId: room.id,
      title: room.title,
      currentParticipants: room.currentParticipants,
      maxParticipants: room.maxParticipants,
      totalMessages: messageCount,
      isLive: room.isLive,
      status: room.status,
      startedAt: room.startedAt,
      lastActivity: room.lastActivity,
      recentMessages: recentMessages.length
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get room categories
// @route   GET /api/rooms/categories
// @access  Public
const getRoomCategories = async (req, res) => {
  try {
    const categories = await Room.distinct('category', { isLive: true, status: 'live' });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getRooms,
  getRoom,
  getRoomMessages,
  searchRoomMessages,
  getRoomStats,
  getRoomCategories
};
