const { body } = require('express-validator');

// Registration validation
const validateRegister = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Password confirmation does not match password');
            }
            return true;
        }),
    
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    
    body('phone')
        .optional({ nullable: true, checkFalsy: true })
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    
    body('userType')
        .isIn(['tourist', 'local', 'admin'])
        .withMessage('User type must be tourist, local, or admin'),

    // Tourist-specific validations
    body('interests')
        .if(body('userType').equals('tourist'))
        .optional()
        .isArray()
        .withMessage('Interests must be an array'),

    // Local-specific validations
    body('address')
        .if(body('userType').equals('local'))
        .notEmpty()
        .withMessage('Address is required for local users'),
    
    body('specialization')
        .if(body('userType').equals('local'))
        .notEmpty()
        .withMessage('Specialization is required for local users'),
    
    body('languages')
        .if(body('userType').equals('local'))
        .notEmpty()
        .withMessage('Languages are required for local users'),

    body('experienceYears')
        .if(body('userType').equals('local'))
        .optional()
        .isInt({ min: 0, max: 50 })
        .withMessage('Experience years must be between 0 and 50'),

    // Admin-specific validations
    body('employeeId')
        .if(body('userType').equals('admin'))
        .notEmpty()
        .withMessage('Employee ID is required for admin users'),
    
    body('adminLevel')
        .if(body('userType').equals('admin'))
        .optional()
        .isIn(['state', 'district', 'block'])
        .withMessage('Admin level must be state, district, or block'),
];

// Login validation
const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

// Profile update validation
const validateProfileUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    
    body('address')
        .optional()
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Address must be between 5 and 500 characters'),
    
    body('specialization')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Specialization must be between 2 and 100 characters'),
    
    body('languages')
        .optional()
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Languages must be between 2 and 200 characters'),
    
    body('experienceYears')
        .optional()
        .isInt({ min: 0, max: 50 })
        .withMessage('Experience years must be between 0 and 50'),
    
    body('interests')
        .optional()
        .isArray()
        .withMessage('Interests must be an array'),
];

// Password change validation
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('confirmNewPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match new password');
            }
            return true;
        }),
];

// Password reset request validation
const validatePasswordResetRequest = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
];

// Password reset validation
const validatePasswordReset = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('confirmNewPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match new password');
            }
            return true;
        }),
];

const validateQuery = (req, res, next) => {
    if (!req.body.query || typeof req.body.query !== 'string') {
        return res.status(400).json({
            error: "Invalid request body. 'query' field is required and must be a string."
        });
    }
    next();
};

module.exports = {
    validateRegister,
    validateLogin,
    validateProfileUpdate,
    validatePasswordChange,
    validatePasswordResetRequest,
    validatePasswordReset,
    validateQuery
};
