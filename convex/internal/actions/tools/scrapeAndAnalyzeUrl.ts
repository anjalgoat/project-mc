import { internalAction } from "../../../_generated/server"; // Corrected path
import { v } from "convex/values";
import { z } from "zod";
import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom"; // Use JSDOM for Readability
import { createOpenAI } from "@ai-sdk/openai"; // Use createOpenAI factory
import {
    ScrapeAndAnalyzeInputSchema, // Rename for clarity if needed in types.ts
    ScrapeResultSchema
} from "../../../lib/types"; // Ensure these are defined in types.ts
import fetch from 'node-fetch'; // Using node-fetch

// Zod schema for parsing the LLM's structured text output
const LlmAnalysisOutputSchema = z.object({
    summary: z.string().min(1, "Summary cannot be empty"),
    insight: z.string().min(1, "Insight cannot be empty"),
    relevance: z.string().min(1, "Relevance assessment cannot be empty"),
});

// Define a basic type for the Scrapfly response structure we expect
interface ScrapflyResponse {
    result?: {
        content?: string;
        success?: boolean;
        status_code?: number;
        error?: string;
    };
    error?: string; // Top-level error
}


export const scrapeAndAnalyzeUrl = internalAction({
  args: {
    // Use v.any() and let Zod do stricter validation inside handler
    url: v.string(),
    // title: v.optional(v.string()), // Title might not be known upfront
    threadId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<z.infer<typeof ScrapeResultSchema>> => { // Use _ctx, return validated type

    // Prepare initial result structure for error cases
    const errorResultBase = {
        url: args.url,
        title: null, // Title will be extracted later if possible
        success: false,
        content: null,
        summary: null,
        insight: null,
        relevance: null,
        error: "Unknown error", // Default error message
    };

    // Validate inputs using Zod
    let validatedInput: z.infer<typeof ScrapeAndAnalyzeInputSchema>;
    try {
      // Assuming ScrapeAndAnalyzeInputSchema expects url, threadId, userId
      validatedInput = ScrapeAndAnalyzeInputSchema.parse(args);
      console.log(`Starting scrape & analysis for URL: ${validatedInput.url}`);
    } catch (error) {
      const message = error instanceof z.ZodError ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') : 'Unknown validation error';
      console.error("Input validation failed:", message);
      return ScrapeResultSchema.parse({ ...errorResultBase, error: `Invalid input: ${message}` });
    }

    const { url } = validatedInput;

    // Check for Scrapfly API key
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
    if (!scrapflyApiKey) {
      console.error("SCRAPFLY_API_KEY environment variable is missing.");
      return ScrapeResultSchema.parse({ ...errorResultBase, error: "Configuration error: Missing SCRAPFLY_API_KEY" });
    }

    let htmlContent = "";
    let pageTitle: string | null = null;

    // --- Step 1: Scrape Content ---
    try {
      console.log(`Scraping ${url} using Scrapfly`);
      const scrapflyUrl = `https://api.scrapfly.io/scrape?key=${scrapflyApiKey}&url=${encodeURIComponent(url)}&asp=true&render_js=false`; // Try without JS first for speed
      const response = await fetch(scrapflyUrl, { timeout: 15000 }); // 15s timeout

      const result: ScrapflyResponse = await response.json() as ScrapflyResponse;

      if (!response.ok || !result?.result?.success || !result?.result?.content) {
        const statusCode = result?.result?.status_code || response.status || "N/A";
        const reason = result?.result?.error || result?.error || response.statusText || "Scraping failed";
        console.warn(`Scrapfly failed for ${url}. Status: ${statusCode}, Reason: ${reason}`);
        return ScrapeResultSchema.parse({ ...errorResultBase, error: `Scraping failed: Status ${statusCode}, ${reason}` });
      }

      htmlContent = result.result.content;
      console.log(`Successfully scraped ${url}. Content length: ${htmlContent.length}`);

    } catch (error) {
      console.error(`Scraping error for ${url}:`, error instanceof Error ? error.message : error);
      return ScrapeResultSchema.parse({ ...errorResultBase, error: `Scraping failed: ${error instanceof Error ? error.message : "Unknown network error"}` });
    }

    // --- Step 2: Extract Text Content ---
    let extractedText = "";
    try {
        // Use JSDOM to create a DOM environment for Readability
        const dom = new JSDOM(htmlContent, { url: url }); // Provide URL context to Readability
        const document = dom.window.document;

        // Extract title using JSDOM before Readability potentially removes it
        pageTitle = document.title || null;

        const reader = new Readability(document);
        const article = reader.parse(); // article contains { title, content, textContent, ... }

        // Use Readability's extracted title if it's better, otherwise keep JSDOM's title
        pageTitle = article?.title && article.title.length > (pageTitle?.length || 0) ? article.title : pageTitle;
        extractedText = article?.textContent || ""; // textContent has paragraphs preserved

        // Fallback to Cheerio if Readability extracts minimal content
        if (!extractedText || extractedText.length < 100) { // Increased threshold
            console.warn(`Readability extracted minimal text (${extractedText.length} chars) from ${url}, trying Cheerio.`);
            const $ = cheerio.load(htmlContent);
            // Try to get text from main content areas first
            let mainContent = $('main').text() || $('article').text() || $('#content').text() || $('.content').text();
            if (mainContent.length < 100) {
                mainContent = $('body').text(); // Fallback to whole body
            }
            extractedText = mainContent.replace(/\s+/g, " ").trim(); // Clean whitespace

            if (!pageTitle) { // Try getting title with Cheerio if JSDOM failed
                 pageTitle = $('title').text() || null;
            }
        }

        if (extractedText.length < 50) { // Final check after fallbacks
            console.error(`Could not extract significant text from ${url}.`);
            return ScrapeResultSchema.parse({ ...errorResultBase, title: pageTitle, error: "Extraction failed: No significant text content found." });
        }

        console.log(`Extracted ~${extractedText.length} characters from ${url}. Title: "${pageTitle}"`);

    } catch (error) {
        console.error(`Error during text extraction for ${url}:`, error instanceof Error ? error.message : error);
        return ScrapeResultSchema.parse({ ...errorResultBase, title: pageTitle, error: `Text extraction failed: ${error instanceof Error ? error.message : "Unknown error"}` });
    }


    // --- Step 3: Analyze Content with LLM ---
    const contentToAnalyze = extractedText.slice(0, 8000); // Increased limit, adjust based on model
    const prompt = `
Analyze the following text content scraped from the URL "${url}" (Title: "${pageTitle || 'N/A'}").
Focus specifically on information relevant to **market research for betting apps**.

Content:
---
${contentToAnalyze}
---

Based **only** on the provided content:
1.  **Summary:** Write a concise summary (3-5 sentences) highlighting the key points relevant to betting app market research. If the content is irrelevant, state that clearly.
2.  **Insight:** Extract one specific, actionable insight useful for someone researching or building a betting app. If no specific insight exists, state "No specific insight found."
3.  **Relevance:** Assess the relevance of this content to the topic 'market research for betting apps'. Choose ONE: Highly relevant, Partially relevant, Not relevant. Provide a brief justification.

Format your response EXACTLY like this:
Summary: [Your summary here]
Insight: [Your insight here]
Relevance: [Your relevance assessment and justification here]
`;

    try {
      // Configure OpenRouter client
      const openRouterApiKey = process.env.OPENROUTER_API_KEY;
      const openRouterBaseUrl = process.env.OPENROUTER_BASE_URL || "[https://openrouter.ai/api/v1](https://openrouter.ai/api/v1)";
      const modelName = process.env.OPENAI_MODEL || "openai/gpt-4o-mini";

      if (!openRouterApiKey) {
        console.error("OPENROUTER_API_KEY environment variable is missing for analysis.");
        return ScrapeResultSchema.parse({ ...errorResultBase, title: pageTitle, content: contentToAnalyze.slice(0, 100), error: "Configuration error: Missing OpenRouter API key" });
      }

      const openRouterClient = createOpenAI({
        apiKey: openRouterApiKey,
        baseURL: openRouterBaseUrl,
      });

      console.log(`Analyzing content for ${url} with LLM (${modelName})...`);
      const response = await openRouterClient.chat(modelName).completions.create({
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500, // Limit response size
        temperature: 0.2, // Lower temperature for factual summary
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        console.error(`Invalid or empty LLM response for ${url}`);
        return ScrapeResultSchema.parse({ ...errorResultBase, title: pageTitle, content: contentToAnalyze.slice(0, 100), error: "LLM analysis failed: No response content" });
      }

      console.log(`LLM analysis response received for ${url}.`);

      // Parse LLM response text robustly
      let summary = "Parsing failed.";
      let insight = "Parsing failed.";
      let relevance = "Parsing failed.";

      const summaryMatch = responseText.match(/Summary:\s*([\s\S]*?)(?=Insight:|Relevance:|$)/i);
      const insightMatch = responseText.match(/Insight:\s*([\s\S]*?)(?=Summary:|Relevance:|$)/i);
      const relevanceMatch = responseText.match(/Relevance:\s*([\s\S]*?)(?=Summary:|Insight:|$)/i);

      if (summaryMatch && summaryMatch[1]) summary = summaryMatch[1].trim();
      if (insightMatch && insightMatch[1]) insight = insightMatch[1].trim();
      if (relevanceMatch && relevanceMatch[1]) relevance = relevanceMatch[1].trim();

      // Validate parsed fields
      const parsedLlmData = { summary, insight, relevance };
      const llmValidationResult = LlmAnalysisOutputSchema.safeParse(parsedLlmData);

      if (!llmValidationResult.success) {
           console.warn(`LLM output parsing/validation failed for ${url}: ${llmValidationResult.error.format()}. Raw text: ${responseText}`);
           // Use potentially partially parsed data but log warning, or mark as failed
           summary = summary !== "Parsing failed." ? summary : "LLM output parsing failed.";
           insight = insight !== "Parsing failed." ? insight : "LLM output parsing failed.";
           relevance = relevance !== "Parsing failed." ? relevance : "LLM output parsing failed.";
           // Decide whether to return error or proceed with partial data
           // return ScrapeResultSchema.parse({ ...errorResultBase, title: pageTitle, error: "LLM output parsing/validation failed" });
      }

      // Construct final result
      const finalResult: z.infer<typeof ScrapeResultSchema> = {
        url,
        title: pageTitle,
        success: true, // Mark as successful scrape and analysis
        content: contentToAnalyze.slice(0, 500), // Store snippet of analyzed content for context
        summary: llmValidationResult.success ? llmValidationResult.data.summary : summary,
        insight: llmValidationResult.success ? llmValidationResult.data.insight : insight,
        relevance: llmValidationResult.success ? llmValidationResult.data.relevance : relevance,
        error: null, // No error on success
      };

      // Final validation of the complete result object
      return ScrapeResultSchema.parse(finalResult);

    } catch (error) {
      console.error(`LLM analysis failed for ${url}:`, error instanceof Error ? error.message : error);
      return ScrapeResultSchema.parse({ ...errorResultBase, title: pageTitle, content: contentToAnalyze.slice(0,100), error: `LLM analysis failed: ${error instanceof Error ? error.message : "Unknown error"}` });
    }
  },
});