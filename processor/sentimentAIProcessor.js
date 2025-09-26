const axios = require('axios');
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

class SentimentResult {
    constructor({ text, sentiment, confidence, emotions, key_phrases, timestamp }) {
        this.text = text;
        this.sentiment = sentiment;
        this.confidence = confidence;
        this.emotions = emotions;
        this.key_phrases = key_phrases;
        this.timestamp = timestamp;
    }
}

class FeedbackSentimentAnalyzer {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.model = 'openai/gpt-oss-20b';
    }

    async analyzeSentiment(feedbackText, includeEmotions = true) {
        const prompt = this._createAnalysisPrompt(feedbackText, includeEmotions);
        try {
            const response = await axios.post(GROQ_API_URL, {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert sentiment analysis AI. Provide accurate, detailed sentiment analysis in the exact JSON format requested.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1024,
                top_p: 0.9
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const responseText = response.data.choices[0].message.content;
            return this._parseResponse(feedbackText, responseText);
        } catch (e) {
            console.error('Error analyzing sentiment:', e.message);
            return this._createFallbackResult(feedbackText);
        }
    }

    async analyzeBatch(feedbackList) {
        const results = [];
        for (const feedback of feedbackList) {
            const result = await this.analyzeSentiment(feedback);
            results.push(result);
        }
        return results;
    }

    getSummaryStatistics(results) {
        if (!results || results.length === 0) return {};
        const sentiments = results.map(r => r.sentiment.toLowerCase());
        const total = sentiments.length;
        const stats = {
            total_feedback: total,
            positive: sentiments.filter(s => s === 'positive').length / total * 100,
            negative: sentiments.filter(s => s === 'negative').length / total * 100,
            neutral: sentiments.filter(s => s === 'neutral').length / total * 100,
            average_confidence: results.reduce((sum, r) => sum + r.confidence, 0) / total,
            most_common_emotions: this._getTopEmotions(results),
            analysis_timestamp: new Date().toISOString()
        };
        return stats;
    }

    _createAnalysisPrompt(text, includeEmotions) {
        const emotionInstruction = includeEmotions ? '\n- emotions: List of detected emotions (e.g., ["happy", "frustrated", "excited"])' : '';
        return `\nAnalyze the sentiment of this feedback text and respond with ONLY a JSON object in this exact format:\n\n{\n    "sentiment": "positive|negative|neutral",\n    "confidence": 0.95,\n    "key_phrases": ["phrase1", "phrase2"],${emotionInstruction}\n    "reasoning": "Brief explanation of the analysis"\n}\n\nFeedback text to analyze:\n"${text}"\n\nRules:\n- sentiment must be exactly one of: positive, negative, neutral\n- confidence should be between 0.0 and 1.0\n- key_phrases should be the most important words/phrases that influenced the sentiment\n- emotions should be common emotion words (if requested)\n- Keep reasoning brief and factual\n- Respond with ONLY the JSON object, no other text\n`;
    }

    _parseResponse(originalText, response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                return new SentimentResult({
                    text: originalText,
                    sentiment: (data.sentiment || 'neutral').toLowerCase(),
                    confidence: parseFloat(data.confidence || 0.5),
                    emotions: data.emotions || [],
                    key_phrases: data.key_phrases || [],
                    timestamp: new Date().toISOString()
                });
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (e) {
            console.error('Error parsing response:', e.message);
            return this._createFallbackResult(originalText);
        }
    }

    _createFallbackResult(text) {
        return new SentimentResult({
            text,
            sentiment: 'neutral',
            confidence: 0.0,
            emotions: [],
            key_phrases: [],
            timestamp: new Date().toISOString()
        });
    }

    _getTopEmotions(results, topN = 5) {
        const emotionCounts = {};
        for (const result of results) {
            for (const emotion of result.emotions) {
                emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
            }
        }
        return Object.keys(emotionCounts)
            .sort((a, b) => emotionCounts[b] - emotionCounts[a])
            .slice(0, topN);
    }
}

module.exports = FeedbackSentimentAnalyzer;
