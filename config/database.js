const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'darshan1510',
    database: process.env.DB_NAME || 'jharkhand_tourism',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000
});

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Initialize database tables
const initializeTables = async () => {
    try {
        const connection = await pool.getConnection();
        
        // Create users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                user_type ENUM('tourist', 'local', 'admin') NOT NULL,
                status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_user_type (user_type)
            )
        `);

        // Create tourist_profiles table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tourist_profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                preferences TEXT,
                visited_places JSON,
                interests JSON,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create local_profiles table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS local_profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                address TEXT,
                specialization VARCHAR(255),
                languages VARCHAR(255),
                experience_years INT,
                rating DECIMAL(3,2) DEFAULT 0.00,
                verified BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create admin_profiles table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS admin_profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                employee_id VARCHAR(100) UNIQUE NOT NULL,
                department VARCHAR(255),
                admin_level ENUM('state', 'district', 'block') NOT NULL,
                permissions JSON,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create refresh_tokens table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(500) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_token (token)
            )
        `);

        // Create password_resets table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_token (token)
            )
        `);

        // Create guide_activities table for MySQL-based guide tracking
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS guide_activities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guide_unique_id VARCHAR(50) NOT NULL,
                guide_name VARCHAR(255) NOT NULL,
                activity_type ENUM('registration', 'verification', 'tour_request', 'tour_completed', 'profile_update') NOT NULL,
                activity_details JSON,
                tourist_id INT NULL,
                location VARCHAR(255),
                activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tourist_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_guide_id (guide_unique_id),
                INDEX idx_activity_type (activity_type),
                INDEX idx_activity_date (activity_date),
                INDEX idx_status (status)
            )
        `);

        // Create guide_feedback table for guide-specific feedback
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS guide_feedback (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guide_unique_id VARCHAR(50) NOT NULL,
                tourist_id INT NOT NULL,
                rating DECIMAL(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
                feedback_text TEXT,
                tour_date DATE,
                location VARCHAR(255),
                service_aspects JSON COMMENT 'JSON object with ratings for different aspects like communication, knowledge, punctuality',
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (tourist_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_guide_id (guide_unique_id),
                INDEX idx_tourist_id (tourist_id),
                INDEX idx_rating (rating),
                INDEX idx_tour_date (tour_date)
            )
        `);

        connection.release();
        console.log('✅ Database tables initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize database tables:', error.message);
        return false;
    }
};

module.exports = {
    pool,
    testConnection,
    initializeTables
};
