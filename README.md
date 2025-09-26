# Feedback Sentiment Analysis API

A Node.js backend for advanced sentiment analysis using the Groq API.

## Features
- Analyze sentiment for single or multiple feedback texts
- Detect emotions and key phrases
- Get summary statistics for batches

## Requirements
- Node.js v16+
- express
- axios
- Groq API key (set as `GROQ_API_KEY` environment variable)

## Installation
```sh
npm install express axios
```

## Usage
1. Set your Groq API key in the environment:
   ```sh
   set GROQ_API_KEY=your_groq_api_key_here
   ```
2. Start the server:
   ```sh
   node server.js
   ```

## Endpoints

### 1. Analyze Single Feedback
**POST** `/api/sentiment`

**Request Body:**
```json
{
  "feedback": "Your feedback text here",
  "includeEmotions": true
}
```

**Response:**
```json
{
  "text": "...",
  "sentiment": "positive|negative|neutral",
  "confidence": 0.95,
  "emotions": ["happy", "excited"],
  "key_phrases": ["phrase1", "phrase2"],
  "timestamp": "2025-09-05T12:34:56.789Z"
}
```

**Example curl:**
```sh
curl -X POST http://localhost:3000/api/sentiment \
  -H "Content-Type: application/json" \
  -d '{"feedback": "The product is amazing!", "includeEmotions": true}'
```

---

### 2. Analyze Batch Feedback
**POST** `/api/sentiment/batch`

**Request Body:**
```json
{
  "feedbacks": [
    "First feedback text",
    "Second feedback text"
  ]
}
```

**Response:**
```json
[
  { /* SentimentResult for first feedback */ },
  { /* SentimentResult for second feedback */ }
]
```

**Example curl:**
```sh
curl -X POST http://localhost:3000/api/sentiment/batch \
  -H "Content-Type: application/json" \
  -d '{"feedbacks": ["Great service!", "Not satisfied with the product."]}'
```

---

### 3. Get Summary Statistics
**POST** `/api/sentiment/summary`

**Request Body:**
```json
{
  "feedbacks": [
    "First feedback text",
    "Second feedback text"
  ]
}
```

**Response:**
```json
{
  "total_feedback": 2,
  "positive": 50,
  "negative": 0,
  "neutral": 50,
  "average_confidence": 0.92,
  "most_common_emotions": ["happy", "neutral"],
  "analysis_timestamp": "2025-09-05T12:34:56.789Z"
}
```

**Example curl:**
```sh
curl -X POST http://localhost:3000/api/sentiment/summary \
  -H "Content-Type: application/json" \
  -d '{"feedbacks": ["Great service!", "Not satisfied with the product."]}'
```

---

## Health Check
**GET** `/`

Returns API status and timestamp.

---

## Project Structure
```
server.js
controller/
  sentimentAI.js
processor/
  sentimentAIProcessor.js
routes/
  sentimentAI.js
```

## License
MIT
