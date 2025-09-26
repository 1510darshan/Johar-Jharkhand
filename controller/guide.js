const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// MongoDB connection for guides (separate from MySQL)
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/jharkhanddb";

// Initialize MongoDB connection if not already connected
if (mongoose.connection.readyState === 0) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ MongoDB connected for guides:', MONGO_URI))
        .catch((err) => console.error('❌ Guide MongoDB connection error:', err));
}

// Guide Schema for MongoDB
const RegisteredGuideSchema = new mongoose.Schema({}, { strict: false });
const RegisteredGuide = mongoose.model('RegisteredGuide', RegisteredGuideSchema, 'registered_guides');

// Load government dataset
const getGuidData = () => {
    try {
        const guidDataPath = path.join(__dirname, '../data/guid.json');
        return require(guidDataPath);
    } catch (error) {
        console.error('❌ Error loading guide data:', error);
        return {};
    }
};

// Utility function to normalize mobile numbers
const normalizeMobileDigits = (mobile) => {
    if (!mobile) return "";
    const digits = mobile.replace(/\D/g, "");
    return digits.slice(-10);
};

// Ensure uploads directory exists
const ensureUploadsDir = () => {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ Backend uploads folder created');
    }
    return uploadsDir;
};

// Register a new guide
const registerGuide = async (req, res) => {
    try {
        const {
            name = "",
            city = "",
            mobile = "",
            email = "",
            tourist_spot_covered = "",
            language = "",
            photoUrl = "",
        } = req.body;

        const nameClean = name.trim().toLowerCase();
        const emailClean = (email || "").trim().toLowerCase();
        const mobileClean = normalizeMobileDigits(mobile);

        // Validate required fields
        if (!nameClean || !emailClean || !mobileClean) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, mobile and email."
            });
        }

        // Search in government dataset
        const guidData = getGuidData();
        let found = null;
        
        for (const cityKey of Object.keys(guidData)) {
            const arr = guidData[cityKey];
            for (const g of arr) {
                const gName = (g.name || "").trim().toLowerCase();
                const gEmail = (g.email || "").trim().toLowerCase();
                
                if (gName === nameClean && gEmail === emailClean) {
                    const gMobiles = (g.mobile || "")
                        .split(",")
                        .map((m) => normalizeMobileDigits(m));
                    
                    if (gMobiles.includes(mobileClean)) {
                        found = { ...g, city: g.city || cityKey };
                        break;
                    }
                }
            }
            if (found) break;
        }

        if (!found) {
            return res.status(404).json({
                success: false,
                message: "You are not a government verified guide"
            });
        }

        console.log("✅ Government verified guide found:", {
            name: found.name,
            email: found.email,
            city: found.city
        });

        // Decide final photo
        let photoFinal = photoUrl || found.photo || "";
        
        // Handle file upload (multer)
        if (req.file) {
            photoFinal = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        }
        // Handle base64 photo from JSON
        else if (req.body.photo && req.body.photo.startsWith('data:image/')) {
            try {
                const uploadsDir = ensureUploadsDir();
                const base64Data = req.body.photo.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                // Get file extension from data URL
                const mimeMatch = req.body.photo.match(/data:image\/(\w+);base64,/);
                const ext = mimeMatch ? mimeMatch[1] : 'jpg';
                
                const fileName = `photo-${Date.now()}.${ext}`;
                const filePath = path.join(uploadsDir, fileName);
                
                fs.writeFileSync(filePath, buffer);
                photoFinal = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
                
                console.log("✅ Base64 photo saved:", fileName);
            } catch (error) {
                console.error("❌ Error saving base64 photo:", error);
                // Continue with original photo or empty
            }
        }

        // Prevent duplicates
        const query = {
            name: found.name,
            email: found.email,
            mobile: found.mobile,
        };
        
        let existing = await RegisteredGuide.findOne(query).lean();
        if (existing) {
            console.log("⚠️ Guide already registered:", existing.uniqueId);
            return res.json({
                success: true,
                message: "Guide already registered",
                data: existing,
            });
        }

        // Generate unique ID
        const uniqueId = "JH-" + uuidv4().slice(0, 8).toUpperCase();

        // Generate QR code
        const uploadsDir = ensureUploadsDir();
        console.log(`path : ${uploadsDir}`);
        const qrFileName = `qr-${Date.now()}.png`;
        const qrFilePath = path.join(uploadsDir, qrFileName);
        const qrUrl = `${req.protocol}://${req.get("host")}/uploads/${qrFileName}`;

        console.log("🟡 Generating QR code:", qrFilePath);
        await QRCode.toFile(qrFilePath, uniqueId, {
            color: { dark: "#000", light: "#FFF" },
        });
        console.log("✅ QR generated:", qrUrl);

        // Create record to insert
        const recordToInsert = {
            ...found,
            tourist_spot_covered: found.tourist_spot_covered || tourist_spot_covered,
            language: found.language || language,
            photo: photoFinal,
            registeredAt: new Date(),
            uniqueId,
            qrCode: qrUrl,
        };

        const created = await RegisteredGuide.create(recordToInsert);
        console.log("✅ Guide created successfully:", created.uniqueId);
        
        res.json({
            success: true,
            message: "Guide registered successfully",
            data: created,
        });

    } catch (error) {
        console.error("❌ Error in registerGuide:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

// Find guide by ID and name
const findGuide = async (req, res) => {
    try {
        const { uniqueId, name } = req.body;
        console.log( `UniqueId : ${uniqueId}    name : ${name}`)

        if (!uniqueId || !name) {
            return res.status(400).json({
                success: false,
                message: "Missing uniqueId or name"
            });
        }

        const guide = await RegisteredGuide.findOne({
            uniqueId: uniqueId.trim(),
            name: new RegExp(`^${name.trim()}$`, "i"),
        }).lean();

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: "Guide not found"
            });
        }

        console.log(`Data : ${guide}`)

        res.json({
            success: true,
            data: guide
        });

    } catch (error) {
        console.error("❌ Error in findGuide:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// Find guide by QR code (unique ID only)
const findGuideByQR = async (req, res) => {
    try {
        const { uniqueId } = req.body;

        if (!uniqueId) {
            return res.status(400).json({
                success: false,
                message: "Missing QR ID"
            });
        }

        const guide = await RegisteredGuide.findOne({
            uniqueId: uniqueId.trim(),
        }).lean();

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: "Guide not found"
            });
        }

        res.json({
            success: true,
            data: guide
        });

    } catch (error) {
        console.error("❌ Error in findGuideByQR:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// Get all registered guides (admin function)
const getAllGuides = async (req, res) => {
    try {
        const { page = 1, limit = 10, city, name } = req.query;
        const skip = (page - 1) * limit;

        // Build query
        let query = {};
        if (city) {
            query.city = new RegExp(city, 'i');
        }
        if (name) {
            query.name = new RegExp(name, 'i');
        }

        const guides = await RegisteredGuide.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ registeredAt: -1 })
            .lean();

        const total = await RegisteredGuide.countDocuments(query);

        res.json({
            success: true,
            data: {
                guides,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalGuides: total,
                    hasNext: skip + guides.length < total,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error("❌ Error in getAllGuides:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// Get guide statistics
const getGuideStats = async (req, res) => {
    try {
        const totalGuides = await RegisteredGuide.countDocuments();
        
        // Get guides by city
        const guidesByCity = await RegisteredGuide.aggregate([
            { $group: { _id: "$city", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Get recent registrations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentRegistrations = await RegisteredGuide.countDocuments({
            registeredAt: { $gte: thirtyDaysAgo }
        });

        res.json({
            success: true,
            data: {
                totalGuides,
                guidesByCity,
                recentRegistrations,
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        console.error("❌ Error in getGuideStats:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// Delete a guide (admin function)
const deleteGuide = async (req, res) => {
    try {
        const { uniqueId } = req.params;

        if (!uniqueId) {
            return res.status(400).json({
                success: false,
                message: "Missing guide ID"
            });
        }

        const guide = await RegisteredGuide.findOneAndDelete({ uniqueId });

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: "Guide not found"
            });
        }

        // Clean up QR code file if it exists
        if (guide.qrCode) {
            try {
                const qrFileName = path.basename(guide.qrCode);
                const qrFilePath = path.join(__dirname, '../uploads', qrFileName);
                if (fs.existsSync(qrFilePath)) {
                    fs.unlinkSync(qrFilePath);
                    console.log('✅ QR code file deleted:', qrFileName);
                }
            } catch (err) {
                console.warn('⚠️ Could not delete QR code file:', err.message);
            }
        }

        res.json({
            success: true,
            message: "Guide deleted successfully",
            data: guide
        });

    } catch (error) {
        console.error("❌ Error in deleteGuide:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// Health check for guide service
const guideHealthCheck = async (req, res) => {
    try {
        // Check MongoDB connection
        const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        // Check if guide data is accessible
        const guidData = getGuidData();
        const govDataStatus = Object.keys(guidData).length > 0 ? 'available' : 'unavailable';

        res.json({
            success: true,
            service: 'Guide Verification Service',
            mongodb: mongoStatus,
            governmentData: govDataStatus,
            totalCities: Object.keys(guidData).length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ Error in guideHealthCheck:", error);
        res.status(500).json({
            success: false,
            message: "Health check failed",
            error: error.message
        });
    }
};

module.exports = {
    registerGuide,
    findGuide,
    findGuideByQR,
    getAllGuides,
    getGuideStats,
    deleteGuide,
    guideHealthCheck
};