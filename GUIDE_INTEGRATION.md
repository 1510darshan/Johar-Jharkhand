# Guide Verification Service Integration

This document describes the integration of the guide verification service into the main backend application.

## Overview

The guide verification service has been successfully integrated into the main Jharkhand Tourism Backend API. This allows for centralized management of tourist guides, including registration, verification, and QR-code based authentication.

## Features

### Guide Registration
- **Endpoint**: `POST /api/guide/register`
- **Description**: Register a new government-verified guide
- **Authentication**: Public (no authentication required)
- **Features**:
  - Validates guide credentials against government dataset
  - Supports photo upload via multipart form data
  - Generates unique QR codes for verification
  - Prevents duplicate registrations

### Guide Search
- **Endpoint**: `POST /api/guide/find`
- **Description**: Find guide by unique ID and name
- **Authentication**: Public

- **Endpoint**: `POST /api/guide/findByQR`
- **Description**: Find guide by QR code (unique ID only)
- **Authentication**: Public

### Guide Management (Admin Only)
- **Endpoint**: `GET /api/guide/all`
- **Description**: Get all registered guides with pagination
- **Authentication**: Required (JWT token)

- **Endpoint**: `GET /api/guide/stats`
- **Description**: Get guide statistics and analytics
- **Authentication**: Required (JWT token)

- **Endpoint**: `DELETE /api/guide/:uniqueId`
- **Description**: Delete a guide registration
- **Authentication**: Required (JWT token)

### Health Check
- **Endpoint**: `GET /api/guide/health`
- **Description**: Check guide service health and status
- **Authentication**: Public

## Technical Details

### Database Architecture
The integration uses a hybrid approach:
- **MongoDB**: Stores registered guide information (maintains compatibility with existing guide_verify service)
- **MySQL**: Stores guide activities and feedback for integration with the main application

### File Structure
```
backend/
├── controller/
│   └── guide.js          # Guide business logic and MongoDB operations
├── routes/
│   └── guide.js          # Guide API endpoints and validation
├── data/
│   └── guid.json         # Government guide dataset (copied from guide_verify)
├── uploads/              # Directory for uploaded photos and QR codes
└── config/
    └── database.js       # Updated with guide-related MySQL tables
```

### Key Dependencies Added
- `mongoose`: MongoDB ODM for guide data management
- `multer`: File upload handling for guide photos
- `qrcode`: QR code generation for guide verification
- `uuid`: Unique ID generation for guides

### Environment Variables
```env
# MongoDB Configuration for Guide Service
MONGO_URI=mongodb://127.0.0.1:27017/jharkhanddb
```

## API Usage Examples

### Register a Guide
```javascript
// Using FormData for photo upload
const formData = new FormData();
formData.append('name', 'Rekha Devi');
formData.append('email', 'rekhadevi73@example.com');
formData.append('mobile', '8336618692');
formData.append('city', 'Simdega');
formData.append('photo', fileInput.files[0]); // Optional photo file

fetch('/api/guide/register', {
    method: 'POST',
    body: formData
});
```

### Find Guide by QR Code
```javascript
fetch('/api/guide/findByQR', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        uniqueId: 'JH-A1B2C3D4'
    })
});
```

### Get Guide Statistics (Admin)
```javascript
fetch('/api/guide/stats', {
    method: 'GET',
    headers: {
        'Authorization': 'Bearer ' + jwt_token
    }
});
```

## Validation and Security

### Input Validation
- Email validation with normalization
- Mobile number validation for Indian numbers
- File type validation for photo uploads (jpeg, jpg, png, gif)
- File size limit: 5MB maximum
- Sanitization of all string inputs

### Authentication
- Public endpoints: guide registration, search, and health check
- Protected endpoints: admin functions require valid JWT token
- Role-based access control integrated with existing auth system

### Error Handling
- Comprehensive error handling with meaningful messages
- File upload error handling
- Database connection error handling
- Validation error aggregation

## Integration with Existing System

### MySQL Tables Added
```sql
-- Guide activities tracking
CREATE TABLE guide_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guide_unique_id VARCHAR(50) NOT NULL,
    guide_name VARCHAR(255) NOT NULL,
    activity_type ENUM('registration', 'verification', 'tour_request', 'tour_completed', 'profile_update'),
    activity_details JSON,
    tourist_id INT NULL,
    location VARCHAR(255),
    activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tourist_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Guide feedback from tourists
CREATE TABLE guide_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guide_unique_id VARCHAR(50) NOT NULL,
    tourist_id INT NOT NULL,
    rating DECIMAL(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
    feedback_text TEXT,
    tour_date DATE,
    location VARCHAR(255),
    service_aspects JSON,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tourist_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Static File Serving
- Guide photos and QR codes served from `/uploads` endpoint
- Automatic cleanup of QR codes when guides are deleted
- Secure file upload with type and size validation

## Backward Compatibility

The integration maintains full backward compatibility:
- Original guide_verify service can continue to operate independently
- Shared MongoDB database ensures data consistency
- Government dataset (`guid.json`) copied to backend for redundancy

## Testing

The service has been tested for:
- ✅ Server startup with both MySQL and MongoDB connections
- ✅ Route registration and middleware integration
- ✅ Health check endpoint functionality
- ✅ Error handling and validation
- ✅ File upload configuration
- ✅ Database table creation

## Future Enhancements

Potential improvements for future versions:
1. Real-time guide location tracking
2. Guide availability scheduling
3. Tourist-guide matching system
4. Integrated payment processing
5. Performance analytics and reporting
6. Mobile app integration with push notifications

## Support

For issues or questions regarding the guide verification integration:
1. Check server logs for MongoDB and MySQL connection status
2. Verify environment variables are properly configured
3. Ensure all required dependencies are installed
4. Test endpoints using the health check endpoint first

## Changelog

### Version 1.0.0 (Current)
- Initial integration of guide verification service
- Full CRUD operations for guide management
- QR code generation and verification
- Photo upload functionality
- Admin dashboard support
- Government dataset validation