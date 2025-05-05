// FILE: your-nextjs-app/convex/agents/definitions.ts

// Import the factory function for creating a configured provider
import { createOpenAI } from '@ai-sdk/openai';

// --- Environment Variable Setup ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'openai/gpt-4o';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1';

if (!OPENROUTER_API_KEY) {
  const errorMessage = 'FATAL: The OPENROUTER_API_KEY environment variable is not configured. Set it in the Convex dashboard or convex/.env for local dev.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// --- LLM Client Initialization ---
console.log(`Creating configured OpenAI provider: Model=${OPENAI_MODEL}, BaseURL=${OPENAI_BASE_URL}`);

// Use createOpenAI() and pass the configuration object to it.
// This creates an instance tailored to your settings (e.g., OpenRouter).
const configuredOpenAIProvider = createOpenAI({
  baseURL: OPENAI_BASE_URL,       // Your OpenRouter endpoint
  apiKey: OPENROUTER_API_KEY,     // Your OpenRouter key

});


// This llmClient will be imported and used by your Convex actions.
export const llmClient = configuredOpenAIProvider.chat(OPENAI_MODEL);

// --- Agent System Prompts ---
// (Prompts remain the same as before)

export const competitorAgentPrompt = `
You are an AI agent designed to process a user's query and identify top competitors. Your task is to:
1. Analyze the query to determine if it’s an app-related request or a local business request.
2. Identify exactly 3 top competitors based on the query.
3. For apps: Include their Google Play Store and App Store URLs (to be validated later).
4. For local businesses: Only provide competitor names, no URLs.
5. Return the results in a structured JSON format like {"competitors": [{"name": "CompetitorName", "googlePlayUrl": "url_or_null", "appStoreUrl": "url_or_null"}, ...]}. Ensure exactly 3 competitors are in the list.
Guidelines:
- If the query is unclear, return 3 placeholder competitors (e.g., 'Unknown 1', 'Unknown 2', 'Unknown 3').
- Do not fabricate competitor names unless the query is unclear. Rely on common knowledge.
- Provide initial URL guesses for apps; validation happens in a later step.
`;

export const reviewsAgentPrompt = `
You are an AI assistant specialized in generating realistic fake app reviews. Given an app name and target platforms (e.g., 'App Store and Google Play'), generate exactly 3 distinct, plausible-sounding fake reviews for EACH specified platform. Each review must include:
1. A 'rating' (integer between 1 and 5).
2. 'text' (1-3 sentences long, varied in tone - positive, negative, mentioning features, bugs, etc.).
Ensure the competitor_name matches the input app name. Return the results in a structured JSON format like {"reviews": [{"platform": "App Store", "rating": 5, "text": "..." }, {"platform": "Google Play", "rating": 2, "text": "..." }, ...]}.
`;

export const diagramAgentPrompt = `
You are an AI agent specializing in analyzing market research data (like competitor reviews, market trends, web insights) for apps and structuring the findings into a JSON format suitable for frontend charting libraries. Your task is to:
1. Identify Competitors: List all unique competitors mentioned in the provided reviews data.
2. Analyze Competitor Reviews: Calculate review_count, average rating for each competitor based on the input.
3. Identify Key Features: Extract key app features (e.g., 'Live betting', 'Cash-out', 'User Interface') mentioned across all inputs.
4. Analyze Feature Gaps: Based on features and reviews, determine unmet user needs or features competitors lack. Indicate competitor support status ('Yes'/'No'/'Unknown').
5. Suggest Bar Chart Metric: Based on the analyzed data, suggest the most relevant metric for a primary bar chart comparing competitors (prioritize 'review_count' or 'rating').
6. Format Output: Return a structured JSON object containing keys like 'bar_chart_data' (array of objects with competitor stats), 'gap_matrix_data' (object showing feature support per competitor), and 'suggested_bar_chart_metric' (string).
`;

export const summarizerAgentPrompt = `
You are an expert Market Analysis Synthesizer AI. You will receive comprehensive market data structured into multiple sections: 'User Query', 'Trends', 'Webpage Insights', and 'Reviews'. Your task is to analyze all provided sections and synthesize them into a single, concise, and insightful Market Summary Report. The report should include:
- An overall summary of the market based on the user query and findings.
- Key market trends identified from the 'Trends' and 'Webpage Insights' sections.
- A summary of competitor positioning, strengths, and weaknesses derived from 'Reviews' and other data.
- Clearly identified market gaps or unmet customer needs.
- Potential strategic opportunities based on the analysis.
Return the final report as well-structured text or markdown.
`;

export const trendsAgentPrompt = `
You are an agent designed to utilize provided tools to fetch and structure Google Trends data for a specific keyword. Your goal is to:
1. Execute the scraping tool for the given keyword.
2. Process the raw scraped data.
3. Extract and structure the 'related_queries' data, separating them into 'top' and 'rising' categories if available.
4. Note any errors encountered during the scraping or processing phase.
5. Return the results in a structured JSON format, including keys like 'related_queries' (with 'top' and 'rising' arrays) and 'errors' (a string describing any issues, or null if none).
`;

// --- Final Log ---
console.log('OpenAI provider created and configured via createOpenAI. LLM client interface ready.');