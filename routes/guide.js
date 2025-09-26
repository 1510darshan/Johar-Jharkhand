const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const {
    registerGuide,
    findGuide,
    findGuideByQR,
    getAllGuides,
    getGuideStats,
    deleteGuide,
    guideHealthCheck
} = require('../controller/guide');
const { verifyToken } = require('../middlewares/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Backend uploads folder created');
}

// Multer configuration for photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

// Validation middleware
const validateGuideRegistration = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('mobile')
        .isMobilePhone('en-IN')
        .withMessage('Please provide a valid Indian mobile number'),
    body('city')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('City name must not exceed 50 characters'),
    body('tourist_spot_covered')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Tourist spots description must not exceed 500 characters'),
    body('language')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Languages must not exceed 200 characters'),
    body('photoUrl')
        .optional()
        .isURL()
        .withMessage('Photo URL must be a valid URL'),
    body('photo')
        .optional()
        .custom((value) => {
            if (value && !value.startsWith('data:image/')) {
                throw new Error('Photo must be a valid base64 image data URL');
            }
            return true;
        })
        .withMessage('Photo must be a valid base64 image'),
];

const validateGuideSearch = [
    body('uniqueId')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Unique ID must be between 3 and 20 characters'),
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
];

const validateQRSearch = [
    body('uniqueId')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Unique ID must be between 3 and 20 characters'),
];

// Error handling middleware for validation
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'File upload error',
            error: err.message
        });
    }
    if (err.message === 'Only image files are allowed (jpeg, jpg, png, gif)') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next(err);
};

// Routes

// Health check for guide service
router.get('/guide/health', guideHealthCheck);

// Register a new guide (public route) - handles both FormData and JSON
router.post('/guide/register',
    (req, res, next) => {
        // Check content type to decide if we need multer
        const contentType = req.headers['content-type'];
        if (contentType && contentType.includes('multipart/form-data')) {
            // Use multer for file uploads
            upload.single('photo')(req, res, (err) => {
                if (err) return handleMulterError(err, req, res, next);
                next();
            });
        } else {
            // Skip multer for JSON requests
            next();
        }
    },
    validateGuideRegistration,
    handleValidationErrors,
    registerGuide
);

// Find guide by ID and name (public route)
router.post('/guide/find',
    validateGuideSearch,
    handleValidationErrors,
    findGuide
);

// Find guide by QR code (public route)
router.post('/guide/findByQR',
    validateQRSearch,
    handleValidationErrors,
    findGuideByQR
);

// Get all guides (protected route - requires authentication)
router.get('/guide/all',
    verifyToken,
    getAllGuides
);

// Get guide statistics (protected route - requires authentication)
router.get('/guide/stats',
    verifyToken,
    getGuideStats
);

// Delete a guide (protected route - requires authentication)
router.delete('/guide/:uniqueId',
    verifyToken,
    deleteGuide
);

// Error handling middleware for the entire router
router.use((err, req, res, next) => {
    console.error('Guide router error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error in guide service',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

module.exports = router;