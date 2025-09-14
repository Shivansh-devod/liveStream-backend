# LiveStream Backend

A comprehensive Node.js backend API for live streaming applications built with Express.js, MongoDB, and JWT authentication.

## Features

- 🔐 **Authentication & Authorization** - JWT-based auth with bcrypt password hashing
- 🎥 **Stream Management** - Create, update, delete, and manage live streams
- 👥 **User Management** - User registration, login, profile management
- 🛡️ **Security** - Helmet, CORS, rate limiting, input validation
- 📊 **Logging** - Morgan HTTP request logging
- 🗄️ **Database** - MongoDB with Mongoose ODM
- ✅ **Validation** - Express-validator for request validation
- 🧪 **Testing** - Jest testing framework setup

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors, express-rate-limit
- **Logging**: morgan
- **Testing**: Jest, Supertest

## Project Structure

```
src/
├── config/
│   └── database.js          # Database connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── userController.js    # User management
│   └── streamController.js  # Stream management
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   ├── errorHandler.js     # Global error handling
│   └── notFound.js         # 404 handler
├── models/
│   ├── User.js             # User schema
│   └── Stream.js           # Stream schema
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── users.js            # User routes
│   └── streams.js          # Stream routes
├── utils/
│   └── validation.js       # Validation utilities
└── server.js               # Main server file
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd liveStream_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/livestream
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=30d
   CLIENT_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)
- `POST /api/auth/logout` - Logout user (Protected)

### Users
- `GET /api/users` - Get all users (Protected)
- `GET /api/users/:id` - Get user by ID (Protected)
- `PUT /api/users/:id` - Update user (Protected)
- `DELETE /api/users/:id` - Delete user (Protected)

### Streams
- `GET /api/streams` - Get all streams (Public)
- `GET /api/streams/:id` - Get stream by ID (Public)
- `POST /api/streams` - Create new stream (Protected)
- `PUT /api/streams/:id` - Update stream (Protected)
- `DELETE /api/streams/:id` - Delete stream (Protected)
- `POST /api/streams/:id/join` - Join stream (Protected)
- `POST /api/streams/:id/leave` - Leave stream (Protected)

### Health Check
- `GET /health` - Server health status

## Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create a stream (with authentication)
```bash
curl -X POST http://localhost:3000/api/streams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "My Live Stream",
    "description": "This is my first live stream"
  }'
```

## Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/livestream |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRE` | JWT expiration time | 30d |
| `CLIENT_URL` | Frontend URL for CORS | http://localhost:3000 |

## Security Features

- **Helmet**: Sets various HTTP headers for security
- **CORS**: Configurable Cross-Origin Resource Sharing
- **Rate Limiting**: Prevents abuse with request rate limiting
- **Input Validation**: Validates and sanitizes all inputs
- **Password Hashing**: Uses bcrypt for secure password storage
- **JWT Authentication**: Secure token-based authentication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
