const express = require('express');
const { 
  getRooms, 
  getRoom, 
  getRoomMessages, 
  searchRoomMessages, 
  getRoomStats, 
  getRoomCategories 
} = require('../controllers/roomController');

const router = express.Router();

// @route   GET /api/rooms
// @desc    Get all active rooms
// @access  Public
router.get('/', getRooms);

// @route   GET /api/rooms/categories
// @desc    Get room categories
// @access  Public
router.get('/categories', getRoomCategories);

// @route   GET /api/rooms/:id
// @desc    Get room by ID
// @access  Public
router.get('/:id', getRoom);

// @route   GET /api/rooms/:id/messages
// @desc    Get room messages
// @access  Public
router.get('/:id/messages', getRoomMessages);

// @route   GET /api/rooms/:id/search
// @desc    Search messages in room
// @access  Public
router.get('/:id/search', searchRoomMessages);

// @route   GET /api/rooms/:id/stats
// @desc    Get room statistics
// @access  Public
router.get('/:id/stats', getRoomStats);

module.exports = router;
