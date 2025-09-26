const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
require('dotenv').config();

// Verify JWT Token
const verifyToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const [users] = await pool.execute(
            'SELECT id, email, name, user_type, status FROM users WHERE id = ? AND status = "active"',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token. User not found or inactive.' 
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

// Check user role
const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. Not authenticated.' 
            });
        }

        if (!allowedRoles.includes(req.user.user_type)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Insufficient permissions.' 
            });
        }

        next();
    };
};

// Check if user is admin
const isAdmin = checkRole('admin');

// Check if user is local or admin
const isLocalOrAdmin = checkRole('local', 'admin');

// Check if user is tourist, local or admin (any authenticated user)
const isAuthenticated = checkRole('tourist', 'local', 'admin');

// Optional authentication (for endpoints that work with or without auth)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [users] = await pool.execute(
            'SELECT id, email, name, user_type, status FROM users WHERE id = ? AND status = "active"',
            [decoded.userId]
        );

        req.user = users.length > 0 ? users[0] : null;
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

module.exports = {
    verifyToken,
    checkRole,
    isAdmin,
    isLocalOrAdmin,
    isAuthenticated,
    optionalAuth
};
