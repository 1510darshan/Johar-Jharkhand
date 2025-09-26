# Feedback Sentiment Analysis Backend — Project Report

## Project Overview
This project implements a Node.js backend for advanced sentiment analysis of user feedback using the Groq API. It provides endpoints for analyzing individual and batch feedback, detecting emotions and key phrases, and generating summary statistics.

---

## Objectives
- Automate sentiment analysis for feedback data
- Provide emotion and key phrase extraction
- Enable batch processing and summary reporting
- Ensure modular, maintainable backend architecture

---

## Technologies Used
- **Node.js** (v16+)
- **Express.js** — Web server framework
- **Axios** — HTTP client for Groq API
- **Groq API** — Large language model for sentiment analysis

---

## Architecture & Structure
```
server.js
controller/
  sentimentAI.js
processor/
  sentimentAIProcessor.js
routes/
  sentimentAI.js
README.md
```
- **server.js**: Main server entry point
- **controller/sentimentAI.js**: Controller functions for API logic
- **processor/sentimentAIProcessor.js**: Sentiment analysis logic and Groq API integration
- **routes/sentimentAI.js**: Express routes for API endpoints
- **README.md**: Documentation and usage guide

---

## API Endpoints
### 1. Analyze Single Feedback
- **POST** `/api/sentiment`
- Analyzes one feedback text, returns sentiment, confidence, emotions, and key phrases

### 2. Analyze Batch Feedback
- **POST** `/api/sentiment/batch`
- Analyzes multiple feedback texts, returns array of results

### 3. Get Summary Statistics
- **POST** `/api/sentiment/summary`
- Returns summary statistics for a batch of feedbacks

### 4. Health Check
- **GET** `/`
- Returns API status and timestamp

---

## Example Usage
### Single Feedback
```sh
curl -X POST http://localhost:3000/api/sentiment \
  -H "Content-Type: application/json" \
  -d '{"feedback": "The product is amazing!", "includeEmotions": true}'
```

### Batch Feedback
```sh
curl -X POST http://localhost:3000/api/sentiment/batch \
  -H "Content-Type: application/json" \
  -d '{"feedbacks": ["Great service!", "Not satisfied with the product."]}'
```

### Summary Statistics
```sh
curl -X POST http://localhost:3000/api/sentiment/summary \
  -H "Content-Type: application/json" \
  -d '{"feedbacks": ["Great service!", "Not satisfied with the product."]}'
```

---

## Sample Output
### Sentiment Result
```json
{
  "text": "The product is amazing!",
  "sentiment": "positive",
  "confidence": 0.97,
  "emotions": ["happy", "excited"],
  "key_phrases": ["amazing", "product"],
  "timestamp": "2025-09-05T12:34:56.789Z"
}
```

### Summary Statistics
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

---

## Error Handling
- Returns clear error messages for invalid input or server errors
- Centralized error middleware in `server.js`

---

## How to Run
1. Install dependencies:
   ```sh
   npm install express axios
   ```
2. Set your Groq API key:
   ```sh
   set GROQ_API_KEY=your_groq_api_key_here
   ```
3. Start the server:
   ```sh
   node server.js
   ```

---

## Future Improvements
- Add authentication for API endpoints
- Support for additional languages
- Frontend dashboard for visualization
- Dockerization for deployment

---

## License
MIT
