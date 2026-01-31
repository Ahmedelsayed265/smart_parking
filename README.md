# 🅿️ Smart Parking Backend

A computer vision-powered parking management system that uses AI to detect and monitor parking space occupancy in real-time.

## 🚀 Features

- **🤖 AI-Powered Detection**: Uses ONNX Runtime with a pre-trained YOLO model for car detection
- **🔐 JWT Authentication**: Secure user registration and login system
- **📊 Real-time Monitoring**: Upload images to get instant parking occupancy status
- **🗄️ Database Integration**: PostgreSQL for data persistence and logging
- **📱 RESTful API**: Clean and well-documented API endpoints
- **🖼️ Image Processing**: Automatic image preprocessing and optimization

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   AI Model      │
│   (Client)      │◄──►│   (Express.js)  │◄──►│   (ONNX)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   Database      │
                       └─────────────────┘
```

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.1.0
- **Database**: PostgreSQL
- **AI/ML**: ONNX Runtime Node
- **Image Processing**: Jimp
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-grage-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://username:password@localhost:5432/smart_parking
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Database Setup**
   Create the required tables in PostgreSQL:
   ```sql
   -- Users table
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     email VARCHAR(255) UNIQUE NOT NULL,
     phone VARCHAR(20),
     password VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Parking lots table
   CREATE TABLE parking_lots (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     description TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Parking slots table
   CREATE TABLE parking_slots (
     id SERIAL PRIMARY KEY,
     parking_lot_id INTEGER REFERENCES parking_lots(id),
     label VARCHAR(50) NOT NULL,
     x1 FLOAT NOT NULL,
     y1 FLOAT NOT NULL,
     y2 FLOAT NOT NULL,
     x2 FLOAT NOT NULL,
     is_active BOOLEAN DEFAULT true,
     UNIQUE(parking_lot_id, label)
   );

   -- Detection logs table
   CREATE TABLE detection_logs (
     id SERIAL PRIMARY KEY,
     parking_lot_id INTEGER REFERENCES parking_lots(id),
     occupied_slots TEXT[],
     total_occupied INTEGER,
     image_path VARCHAR(500),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "securepassword"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Model Endpoints

#### Process Parking Image
```http
POST /api/model/process
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

file: <image_file>
```

**Response:**
```json
{
  "success": true,
  "totalDetections": 3,
  "totalOccupied": 2,
  "occupiedSpaces": ["1", "5"],
  "detections": [
    {
      "bbox": [100, 200, 300, 400],
      "confidence": 0.85,
      "label": "car"
    }
  ]
}
```

## 🎯 How It Works

1. **Image Upload**: User uploads a parking lot image
2. **Preprocessing**: Image is resized to 640x640 and normalized
3. **AI Detection**: ONNX model detects cars and objects
4. **Intersection Analysis**: Detected objects are checked against predefined parking spaces
5. **Occupancy Calculation**: System determines which spaces are occupied
6. **Response**: Returns occupied spaces and detection details

## 📁 Project Structure

```
smart-grage-backend/
├── best.onnx              # AI model (36MB)
├── parking3.json          # Parking space coordinates
├── server.js              # Entry point
├── src/
│   ├── app.js             # Express app setup
│   ├── db.js              # Database connection
│   ├── controllers/       # Business logic
│   │   ├── authController.js
│   │   └── modelController.js
│   ├── routes/            # API routes
│   │   ├── auth.js
│   │   └── model.js
│   └── services/          # Database services
│       └── parkingService.js
└── uploads/               # Temporary image storage
```

## 🔧 Configuration

### Parking Spaces
The system uses predefined parking spaces defined in `parking3.json`. Each space has:
- **label**: Unique identifier (1-25)
- **coordinates**: Bounding box (x1, y1, x2, y2)

### AI Model
- **Model**: YOLO-based object detection
- **Input Size**: 640x640 pixels
- **Confidence Threshold**: 0.5
- **Classes**: Car detection

## 🚨 Error Handling

The API includes comprehensive error handling:
- **400**: Bad Request (missing fields, invalid data)
- **401**: Unauthorized (invalid credentials, missing token)
- **500**: Internal Server Error (server issues, model errors)

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure authentication with expiration
- **Input Validation**: Request data validation
- **File Upload Security**: Multer configuration for safe file handling

## 🧪 Testing

```bash
# Test the API endpoints
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"1234567890","password":"testpass"}'

curl -X POST http://localhost:3000/api/model/process \
  -H "Authorization: Bearer <your_token>" \
  -F "file=@parking_lot_image.jpg"
```

## 📈 Performance

- **Model Loading**: ONNX model loads once at startup
- **Image Processing**: Optimized with Jimp for fast processing
- **Database**: Connection pooling for efficient database operations
- **Memory Management**: Automatic cleanup of uploaded files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the error logs for debugging

## 🔮 Future Enhancements

- [ ] Real-time video stream processing
- [ ] Multiple parking lot support
- [ ] Mobile app integration
- [ ] Analytics dashboard
- [ ] Email notifications
- [ ] Parking reservation system
