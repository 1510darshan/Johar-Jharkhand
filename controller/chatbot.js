const { getAnswer } = require('../processor/llm');

const chat = async (req, res) => {
    try {
        const { query } = req.body;
        
        // Input validation
        if (!query || typeof query !== 'string' || query.trim() === '') {
            return res.status(400).json({
                error: 'Invalid query',
                message: 'Query must be a non-empty string'
            });
        }

        console.log(`Chatbot Input: ${query}`);
        
        const answer = await getAnswer(query.trim());
        
        console.log(`Chatbot Output: ${answer}`);
        
        res.json({ 
            answer,
            timestamp: new Date().toISOString(),
            query: query.trim()
        });
    } catch (error) {
        console.error('Chat endpoint error:', error);
        
        // Different error responses based on error type
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                answer: "❌ Please provide a valid question about Jharkhand."
            });
        }
        
        if (error.name === 'TimeoutError') {
            return res.status(504).json({
                answer: "⏰ Request timed out. Please try again with a shorter question."
            });
        }
        
        // Generic error response
        res.status(500).json({
            answer: "⚠️ Server busy or offline. Try again later."
        });
    }
};

module.exports = {
    chat
};