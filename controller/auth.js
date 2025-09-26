const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { validationResult } = require('express-validator');
require('dotenv').config();

// Generate JWT tokens
const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
    
    const refreshToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
    
    return { accessToken, refreshToken };
};

// Register new user
const register = async (req, res) => {
    try {
        console.log('Registration attempt with data:', req.body);
        
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password, name, phone, userType, ...profileData } = req.body;
        console.log('Extracted data:', { email, name, phone, userType, profileData });
        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Insert user
            const [userResult] = await connection.execute(
                'INSERT INTO users (email, password, name, phone, user_type) VALUES (?, ?, ?, ?, ?)',
                [email, hashedPassword, name, phone, userType]
            );

            const userId = userResult.insertId;

            // Insert profile data based on user type
            if (userType === 'tourist') {
                await connection.execute(
                    'INSERT INTO tourist_profiles (user_id, preferences, interests) VALUES (?, ?, ?)',
                    [userId, profileData.preferences || null, JSON.stringify(profileData.interests || [])]
                );
            } else if (userType === 'local') {
                await connection.execute(
                    'INSERT INTO local_profiles (user_id, address, specialization, languages, experience_years) VALUES (?, ?, ?, ?, ?)',
                    [userId, profileData.address, profileData.specialization, profileData.languages, profileData.experienceYears || 0]
                );
            } else if (userType === 'admin') {
                await connection.execute(
                    'INSERT INTO admin_profiles (user_id, employee_id, department, admin_level, permissions) VALUES (?, ?, ?, ?, ?)',
                    [userId, profileData.employeeId, profileData.department || 'Tourism', profileData.adminLevel || 'district', JSON.stringify(profileData.permissions || {})]
                );
            }

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(userId);

            // Store refresh token
            const refreshExpiry = new Date();
            refreshExpiry.setDate(refreshExpiry.getDate() + 7);
            
            await connection.execute(
                'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
                [userId, refreshToken, refreshExpiry]
            );

            await connection.commit();
            connection.release();

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                user: {
                    id: userId,
                    email,
                    name,
                    userType
                },
                tokens: {
                    accessToken,
                    refreshToken
                }
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Get user with password
        const [users] = await pool.execute(
            'SELECT id, email, password, name, user_type, status FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Account is inactive. Please contact administrator.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user.id);

        // Store refresh token
        const refreshExpiry = new Date();
        refreshExpiry.setDate(refreshExpiry.getDate() + 7);
        
        await pool.execute(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, refreshToken, refreshExpiry]
        );

        // Get user profile data
        let profileData = {};
        if (user.user_type === 'tourist') {
            const [profile] = await pool.execute(
                'SELECT preferences, visited_places, interests FROM tourist_profiles WHERE user_id = ?',
                [user.id]
            );
            profileData = profile[0] || {};
        } else if (user.user_type === 'local') {
            const [profile] = await pool.execute(
                'SELECT address, specialization, languages, experience_years, rating, verified FROM local_profiles WHERE user_id = ?',
                [user.id]
            );
            profileData = profile[0] || {};
        } else if (user.user_type === 'admin') {
            const [profile] = await pool.execute(
                'SELECT employee_id, department, admin_level, permissions FROM admin_profiles WHERE user_id = ?',
                [user.id]
            );
            profileData = profile[0] || {};
        }

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                userType: user.user_type,
                profile: profileData
            },
            tokens: {
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Refresh access token
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

        // Check if token exists in database and is not expired
        const [tokens] = await pool.execute(
            'SELECT user_id FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
            [token]
        );

        if (tokens.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        // Generate new access token
        const { accessToken } = generateTokens(decoded.userId);

        res.json({
            success: true,
            accessToken
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};

// Logout user
const logout = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (token) {
            // Remove refresh token from database
            await pool.execute(
                'DELETE FROM refresh_tokens WHERE token = ?',
                [token]
            );
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout'
        });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user basic info
        const [users] = await pool.execute(
            'SELECT id, email, name, phone, user_type, status, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        // Get profile data based on user type
        let profileData = {};
        if (user.user_type === 'tourist') {
            const [profile] = await pool.execute(
                'SELECT preferences, visited_places, interests FROM tourist_profiles WHERE user_id = ?',
                [userId]
            );
            profileData = profile[0] || {};
        } else if (user.user_type === 'local') {
            const [profile] = await pool.execute(
                'SELECT address, specialization, languages, experience_years, rating, verified FROM local_profiles WHERE user_id = ?',
                [userId]
            );
            profileData = profile[0] || {};
        } else if (user.user_type === 'admin') {
            const [profile] = await pool.execute(
                'SELECT employee_id, department, admin_level, permissions FROM admin_profiles WHERE user_id = ?',
                [userId]
            );
            profileData = profile[0] || {};
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                userType: user.user_type,
                status: user.status,
                created_at: user.created_at,
                profile: profileData
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile'
        });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, ...profileData } = req.body;

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Update basic user info
            if (name || phone) {
                const updates = [];
                const values = [];
                
                if (name) {
                    updates.push('name = ?');
                    values.push(name);
                }
                if (phone) {
                    updates.push('phone = ?');
                    values.push(phone);
                }
                
                values.push(userId);
                
                await connection.execute(
                    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                    values
                );
            }

            // Update profile data based on user type
            if (req.user.user_type === 'tourist' && Object.keys(profileData).length > 0) {
                const updates = [];
                const values = [];
                
                if (profileData.preferences) {
                    updates.push('preferences = ?');
                    values.push(profileData.preferences);
                }
                if (profileData.interests) {
                    updates.push('interests = ?');
                    values.push(JSON.stringify(profileData.interests));
                }
                if (profileData.visitedPlaces) {
                    updates.push('visited_places = ?');
                    values.push(JSON.stringify(profileData.visitedPlaces));
                }
                
                if (updates.length > 0) {
                    values.push(userId);
                    await connection.execute(
                        `UPDATE tourist_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
                        values
                    );
                }
            } else if (req.user.user_type === 'local' && Object.keys(profileData).length > 0) {
                const updates = [];
                const values = [];
                
                if (profileData.address) {
                    updates.push('address = ?');
                    values.push(profileData.address);
                }
                if (profileData.specialization) {
                    updates.push('specialization = ?');
                    values.push(profileData.specialization);
                }
                if (profileData.languages) {
                    updates.push('languages = ?');
                    values.push(profileData.languages);
                }
                if (profileData.experienceYears !== undefined) {
                    updates.push('experience_years = ?');
                    values.push(profileData.experienceYears);
                }
                
                if (updates.length > 0) {
                    values.push(userId);
                    await connection.execute(
                        `UPDATE local_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
                        values
                    );
                }
            }

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: 'Profile updated successfully'
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile'
        });
    }
};

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    getProfile,
    updateProfile
};
