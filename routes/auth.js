const express = require('express');
const router = express.Router();
const authController = require('../controller/auth');
const { verifyToken } = require('../middlewares/auth');
const {
    validateRegister,
    validateLogin,
    validateProfileUpdate,
    validatePasswordChange,
    validatePasswordResetRequest,
    validatePasswordReset
} = require('../middlewares/validation');

// Public routes
router.post('/auth/register', validateRegister, authController.register);
router.post('/auth/login', validateLogin, authController.login);
router.post('/auth/refresh-token', authController.refreshToken);

// Protected routes
router.post('/auth/logout', verifyToken, authController.logout);
router.get('/auth/profile', verifyToken, authController.getProfile);
router.put('/auth/profile', verifyToken, validateProfileUpdate, authController.updateProfile);

module.exports = router;
