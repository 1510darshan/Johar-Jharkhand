const express = require('express');
const router = express.Router();
const { analyzeSingle } = require('../controller/sentimentAI');

// Store feedback data (in production, use a proper database)
const feedbackStorage = [];

// Submit feedback endpoint
router.post('/feedback', async (req, res) => {
    try {
        const {
            name,
            email,
            mobile,
            address,
            locationVisited,
            cleanliness,
            staffBehavior,
            information,
            signage,
            safety,
            overallExperience,
            suggestions
        } = req.body;

        // Validate required fields
        if (!name || !email || !mobile || !locationVisited || !cleanliness || 
            !staffBehavior || !information || !signage || !safety || !overallExperience) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Please fill in all required fields'
            });
        }

        // Validate email format
        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format',
                message: 'Please provide a valid email address'
            });
        }

        // Validate mobile number (10 digits)
        const mobileRegex = /^\d{10}$/;
        if (!mobileRegex.test(mobile)) {
            return res.status(400).json({
                error: 'Invalid mobile number',
                message: 'Mobile number must be 10 digits'
            });
        }

        // Perform comprehensive sentiment analysis
        let sentimentAnalysis = {
            overallExperience: null,
            suggestions: null,
            combinedAnalysis: null
        };
        
        // Initialize combinedText outside try block
        let combinedText = '';

        try {
            console.log('🔍 Starting sentiment analysis...');
            console.log(`📝 Overall experience: "${overallExperience}" (${overallExperience?.length || 0} chars)`);
            console.log(`💡 Suggestions: "${suggestions || ''}" (${suggestions?.length || 0} chars)`);
            
            // Analyze overall experience (lowered minimum to 3 characters)
            if (overallExperience && overallExperience.trim().length >= 3) {
                console.log('🔄 Analyzing overall experience...');
                sentimentAnalysis.overallExperience = await analyzeSingle(overallExperience, true);
                console.log('✅ Overall experience sentiment:', sentimentAnalysis.overallExperience?.sentiment);
            } else {
                console.log('⚠️ Overall experience too short for analysis');
            }

            // Analyze suggestions if provided (lowered minimum to 3 characters)
            if (suggestions && suggestions.trim().length >= 3) {
                console.log('🔄 Analyzing suggestions...');
                sentimentAnalysis.suggestions = await analyzeSingle(suggestions, true);
                console.log('✅ Suggestions sentiment:', sentimentAnalysis.suggestions?.sentiment);
            } else {
                console.log('⚠️ No suggestions provided or too short');
            }

            // Combined analysis of both texts
            combinedText = [overallExperience, suggestions].filter(text => text && text.trim().length >= 3).join('. ');
            if (combinedText.trim().length >= 3) {
                console.log('🔄 Analyzing combined text...');
                console.log(`📝 Combined text: "${combinedText}" (${combinedText.length} chars)`);
                sentimentAnalysis.combinedAnalysis = await analyzeSingle(combinedText, true);
                console.log('✅ Combined sentiment analysis:', sentimentAnalysis.combinedAnalysis?.sentiment);
            } else {
                console.log('⚠️ Combined text too short for analysis');
            }

        } catch (error) {
            console.warn('Sentiment analysis failed:', error.message);
            // Continue without sentiment analysis if it fails
        }

        // Calculate overall rating score
        const ratingValues = { 'Excellent': 4, 'Very Good': 3, 'Average': 2, 'Poor': 1 };
        const ratings = { cleanliness, staffBehavior, information, signage, safety };
        const ratingScores = Object.values(ratings).map(rating => ratingValues[rating] || 0);
        const averageRating = ratingScores.reduce((sum, score) => sum + score, 0) / ratingScores.length;

        // Create feedback object with enhanced data
        const feedback = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            personalInfo: {
                name,
                email,
                mobile,
                address
            },
            visitInfo: {
                locationVisited
            },
            ratings: {
                cleanliness,
                staffBehavior,
                information,
                signage,
                safety,
                averageScore: averageRating.toFixed(2)
            },
            feedback: {
                overallExperience,
                suggestions: suggestions || ''
            },
            sentimentAnalysis,
            analytics: {
                totalWords: combinedText.split(' ').length,
                hasNegativeFeedback: sentimentAnalysis.combinedAnalysis?.sentiment === 'negative',
                recommendationScore: calculateRecommendationScore(averageRating, sentimentAnalysis.combinedAnalysis),
                priorityLevel: calculatePriorityLevel(sentimentAnalysis.combinedAnalysis, averageRating)
            }
        };

        // Store feedback (in production, save to database)
        feedbackStorage.push(feedback);

        console.log(`New feedback received from ${name} for ${locationVisited} - Sentiment: ${sentimentAnalysis.combinedAnalysis?.sentiment || 'unknown'}`);

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            feedbackId: feedback.id,
            sentiment: sentimentAnalysis.combinedAnalysis?.sentiment || null,
            averageRating: averageRating.toFixed(2),
            recommendationScore: feedback.analytics.recommendationScore
        });

    } catch (error) {
        console.error('Error processing feedback:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to process feedback. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Helper function to calculate recommendation score
function calculateRecommendationScore(averageRating, sentimentAnalysis) {
    let score = averageRating * 25; // Base score from ratings (0-100)
    
    if (sentimentAnalysis) {
        const sentimentBonus = {
            'positive': 10,
            'neutral': 0,
            'negative': -15
        };
        score += sentimentBonus[sentimentAnalysis.sentiment] || 0;
        score += (sentimentAnalysis.confidence - 0.5) * 10; // Confidence bonus
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
}

// Helper function to calculate priority level
function calculatePriorityLevel(sentimentAnalysis, averageRating) {
    if (averageRating <= 2 || (sentimentAnalysis && sentimentAnalysis.sentiment === 'negative')) {
        return 'high';
    } else if (averageRating <= 3 || (sentimentAnalysis && sentimentAnalysis.sentiment === 'neutral')) {
        return 'medium';
    }
    return 'low';
}

// Get all feedback (admin endpoint)
router.get('/feedback', (req, res) => {
    try {
        res.json({
            success: true,
            total: feedbackStorage.length,
            feedback: feedbackStorage
        });
    } catch (error) {
        console.error('Error retrieving feedback:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve feedback'
        });
    }
});

// Get feedback by location
router.get('/feedback/location/:location', (req, res) => {
    try {
        const { location } = req.params;
        const locationFeedback = feedbackStorage.filter(
            fb => fb.visitInfo.locationVisited.toLowerCase() === location.toLowerCase()
        );

        res.json({
            success: true,
            location,
            total: locationFeedback.length,
            feedback: locationFeedback
        });
    } catch (error) {
        console.error('Error retrieving location feedback:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve feedback for location'
        });
    }
});

// Get feedback statistics with enhanced sentiment insights
router.get('/feedback/stats', (req, res) => {
    try {
        if (feedbackStorage.length === 0) {
            return res.json({
                success: true,
                message: 'No feedback available',
                stats: {
                    total: 0,
                    byLocation: {},
                    averageRatings: {},
                    sentimentDistribution: {},
                    priorityDistribution: {},
                    recommendationScore: 0,
                    insights: []
                }
            });
        }

        // Calculate comprehensive statistics
        const stats = {
            total: feedbackStorage.length,
            byLocation: {},
            averageRatings: {
                cleanliness: 0,
                staffBehavior: 0,
                information: 0,
                signage: 0,
                safety: 0,
                overall: 0
            },
            sentimentDistribution: {
                positive: 0,
                neutral: 0,
                negative: 0
            },
            priorityDistribution: {
                high: 0,
                medium: 0,
                low: 0
            },
            emotionalInsights: {
                topEmotions: [],
                commonKeyPhrases: []
            },
            recommendationScore: 0,
            insights: []
        };

        // Count by location and priority
        feedbackStorage.forEach(fb => {
            const location = fb.visitInfo.locationVisited;
            stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;
            
            if (fb.analytics && fb.analytics.priorityLevel) {
                stats.priorityDistribution[fb.analytics.priorityLevel]++;
            }
        });

        // Calculate average ratings
        const ratingCounts = {
            cleanliness: { total: 0, count: 0 },
            staffBehavior: { total: 0, count: 0 },
            information: { total: 0, count: 0 },
            signage: { total: 0, count: 0 },
            safety: { total: 0, count: 0 }
        };

        const ratingValues = { 'Excellent': 4, 'Very Good': 3, 'Average': 2, 'Poor': 1 };
        let totalRecommendationScore = 0;
        const allEmotions = [];
        const allKeyPhrases = [];

        feedbackStorage.forEach(fb => {
            Object.keys(ratingCounts).forEach(key => {
                if (fb.ratings[key]) {
                    ratingCounts[key].total += ratingValues[fb.ratings[key]] || 0;
                    ratingCounts[key].count += 1;
                }
            });

            // Count sentiment distribution
            if (fb.sentimentAnalysis && fb.sentimentAnalysis.combinedAnalysis) {
                const sentiment = fb.sentimentAnalysis.combinedAnalysis.sentiment.toLowerCase();
                if (sentiment === 'positive') stats.sentimentDistribution.positive++;
                else if (sentiment === 'negative') stats.sentimentDistribution.negative++;
                else stats.sentimentDistribution.neutral++;

                // Collect emotions and key phrases
                if (fb.sentimentAnalysis.combinedAnalysis.emotions) {
                    allEmotions.push(...fb.sentimentAnalysis.combinedAnalysis.emotions);
                }
                if (fb.sentimentAnalysis.combinedAnalysis.key_phrases) {
                    allKeyPhrases.push(...fb.sentimentAnalysis.combinedAnalysis.key_phrases);
                }
            }

            // Add to recommendation score
            if (fb.analytics && fb.analytics.recommendationScore) {
                totalRecommendationScore += fb.analytics.recommendationScore;
            }
        });

        // Calculate averages
        Object.keys(ratingCounts).forEach(key => {
            if (ratingCounts[key].count > 0) {
                stats.averageRatings[key] = (ratingCounts[key].total / ratingCounts[key].count).toFixed(2);
            }
        });

        // Overall average rating
        const allRatings = Object.values(stats.averageRatings).filter(r => r > 0);
        if (allRatings.length > 0) {
            stats.averageRatings.overall = (allRatings.reduce((sum, rating) => sum + parseFloat(rating), 0) / allRatings.length).toFixed(2);
        }

        // Calculate recommendation score
        stats.recommendationScore = feedbackStorage.length > 0 ? 
            Math.round(totalRecommendationScore / feedbackStorage.length) : 0;

        // Get top emotions and key phrases
        stats.emotionalInsights.topEmotions = getTopItems(allEmotions, 5);
        stats.emotionalInsights.commonKeyPhrases = getTopItems(allKeyPhrases, 10);

        // Generate insights
        stats.insights = generateInsights(stats, feedbackStorage);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Error calculating feedback stats:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to calculate feedback statistics'
        });
    }
});

// Helper function to get top items by frequency
function getTopItems(items, topN = 5) {
    const counts = {};
    items.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
    });
    return Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, topN)
        .map(item => ({ item, count: counts[item] }));
}

// Helper function to generate insights
function generateInsights(stats, feedbackData) {
    const insights = [];

    // Sentiment insights
    if (stats.sentimentDistribution.negative > stats.total * 0.3) {
        insights.push({
            type: 'warning',
            message: `${Math.round(stats.sentimentDistribution.negative / stats.total * 100)}% of feedback has negative sentiment. Consider investigating common issues.`,
            priority: 'high'
        });
    }

    // Rating insights
    Object.keys(stats.averageRatings).forEach(category => {
        const score = parseFloat(stats.averageRatings[category]);
        if (score > 0 && score < 2.5) {
            insights.push({
                type: 'improvement',
                message: `${category} rating is below average (${score}/4). Focus on improving this area.`,
                priority: 'medium'
            });
        }
    });

    // Priority insights
    if (stats.priorityDistribution.high > 0) {
        insights.push({
            type: 'urgent',
            message: `${stats.priorityDistribution.high} feedback items require immediate attention.`,
            priority: 'high'
        });
    }

    // Recommendation score insight
    if (stats.recommendationScore < 60) {
        insights.push({
            type: 'concern',
            message: `Overall recommendation score is ${stats.recommendationScore}%. Consider addressing key concerns.`,
            priority: 'medium'
        });
    } else if (stats.recommendationScore > 80) {
        insights.push({
            type: 'positive',
            message: `Excellent recommendation score of ${stats.recommendationScore}%! Keep up the good work.`,
            priority: 'low'
        });
    }

    return insights;
}

// Reprocess sentiment analysis for existing feedback
router.post('/feedback/reprocess-sentiment', async (req, res) => {
    try {
        console.log('🔄 Reprocessing sentiment analysis for existing feedback...');
        let processedCount = 0;
        let updatedCount = 0;

        for (let i = 0; i < feedbackStorage.length; i++) {
            const feedback = feedbackStorage[i];
            processedCount++;
            
            console.log(`📝 Processing feedback ${i + 1}/${feedbackStorage.length} from ${feedback.personalInfo.name}`);
            
            // Skip if already has sentiment analysis
            if (feedback.sentimentAnalysis && feedback.sentimentAnalysis.combinedAnalysis && feedback.sentimentAnalysis.combinedAnalysis.sentiment) {
                console.log('⏭️ Already has sentiment analysis, skipping...');
                continue;
            }

            const overallExperience = feedback.feedback.overallExperience;
            const suggestions = feedback.feedback.suggestions;

            try {
                let sentimentAnalysis = {
                    overallExperience: null,
                    suggestions: null,
                    combinedAnalysis: null
                };

                // Analyze overall experience
                if (overallExperience && overallExperience.trim().length >= 3) {
                    sentimentAnalysis.overallExperience = await analyzeSingle(overallExperience, true);
                }

                // Analyze suggestions if provided
                if (suggestions && suggestions.trim().length >= 3) {
                    sentimentAnalysis.suggestions = await analyzeSingle(suggestions, true);
                }

                // Combined analysis
                const combinedText = [overallExperience, suggestions].filter(text => text && text.trim().length >= 3).join('. ');
                if (combinedText.trim().length >= 3) {
                    sentimentAnalysis.combinedAnalysis = await analyzeSingle(combinedText, true);
                }

                // Update the feedback
                feedbackStorage[i].sentimentAnalysis = sentimentAnalysis;
                
                // Update analytics
                if (sentimentAnalysis.combinedAnalysis) {
                    feedbackStorage[i].analytics.hasNegativeFeedback = sentimentAnalysis.combinedAnalysis.sentiment === 'negative';
                    feedbackStorage[i].analytics.recommendationScore = calculateRecommendationScore(
                        parseFloat(feedback.ratings.averageScore), 
                        sentimentAnalysis.combinedAnalysis
                    );
                    feedbackStorage[i].analytics.priorityLevel = calculatePriorityLevel(
                        sentimentAnalysis.combinedAnalysis, 
                        parseFloat(feedback.ratings.averageScore)
                    );
                }

                updatedCount++;
                console.log(`✅ Updated sentiment for feedback from ${feedback.personalInfo.name}: ${sentimentAnalysis.combinedAnalysis?.sentiment || 'none'}`);

            } catch (error) {
                console.error(`❌ Error processing sentiment for feedback ${i + 1}:`, error.message);
            }
        }

        console.log(`🎉 Sentiment reprocessing complete: ${updatedCount}/${processedCount} updated`);

        res.json({
            success: true,
            message: `Sentiment analysis reprocessed for ${updatedCount} out of ${processedCount} feedback entries`,
            processedCount,
            updatedCount
        });

    } catch (error) {
        console.error('Error reprocessing sentiment analysis:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to reprocess sentiment analysis'
        });
    }
});

module.exports = router;
