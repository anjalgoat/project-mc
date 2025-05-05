import { internalAction } from "../../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import fetch from "node-fetch"; // Using node-fetch as specified

// Input validation schema using Zod
const CrawlInputSchema = z.object({
  url: z.string().url("Must be a valid URL"),
});

// Output type (for clarity)
type CrawlOutput = {
  content: string | null;
  error?: string;
};

// Zod schema for the expected Scrapfly successful response structure
const ScrapflyScrapeResponseSchema = z.object({
  result: z.object({
    success: z.boolean().optional(),
    content: z.string().optional(),
    reason: z.string().optional(),
    status_code: z.number().optional(),
  }).optional(),
});

// Internal action for crawling web content
export const crawlContent = internalAction({
  args: {
    url: v.string(), // Basic validation, Zod does stricter check
  },
  handler: async (_ctx, args): Promise<CrawlOutput> => { // Use _ctx as context is unused
    try {
      // Validate input using Zod
      const validatedInput = CrawlInputSchema.parse(args);
      const { url } = validatedInput;

      // Access Scrapfly API key from environment
      const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
      if (!scrapflyApiKey) {
        console.error("SCRAPFLY_API_KEY environment variable is missing");
        return {
          content: null,
          error: "Configuration error: Missing SCRAPFLY_API_KEY",
        };
      }

      // Construct Scrapfly API URL
const scrapflyUrl = new URL("https://api.scrapfly.io/scrape");
      scrapflyUrl.searchParams.append("key", scrapflyApiKey);
scrapflyUrl.searchParams.append("url", url);
      scrapflyUrl.searchParams.append("asp", "true"); // Enable Anti Scraping Protection

      console.log(`Initiating Scrapfly request for URL: ${url}`);

      // Perform the fetch request to Scrapfly
const response = await fetch(scrapflyUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      // Check response status
if (!response.ok) {
        const status = response.status;
        const statusText = response.statusText;
        console.warn(`Scrapfly request failed for ${url} with status: ${status} ${statusText}`);
        return {
          content: null,
          error: `Scrapfly request failed with status ${status}`,
        };
      }

      // Parse JSON response and validate using Zod
const rawResult = await response.json();
      const parsedScrapflyResult = ScrapflyScrapeResponseSchema.safeParse(rawResult);

      // Check if the raw JSON response structure is as expected
      if (!parsedScrapflyResult.success) {
        console.error("Failed to parse Scrapfly response or unexpected structure:", parsedScrapflyResult.error.message);
        return {
          content: null,
          error: `Unexpected API response format: ${parsedScrapflyResult.error.message}`,
        };
      }

      const validatedScrapflyData = parsedScrapflyResult.data;

      // Check if Scrapfly reported success and provided content
      if (!validatedScrapflyData?.result?.success || !validatedScrapflyData?.result?.content) {
        const reason = validatedScrapflyData?.result?.reason || "Unknown reason";
        console.warn(`Scrapfly returned no content or failed for ${url}. Success: ${validatedScrapflyData?.result?.success}, Reason: ${reason}`);
        return {
          content: null,
          error: `Scrapfly returned no content or failed: ${reason}`,
        };
      }

      // Extract raw HTML content from the validated data
      const htmlContent = validatedScrapflyData.result.content;
      console.log(`Successfully crawled ${url}. Content length: ${htmlContent.length} characters`);

      return {
        content: htmlContent,
        error: undefined, // No error on success
      };

    } catch (error) {
      // Handle Zod validation errors or fetch errors
      if (error instanceof z.ZodError) {
        console.error(`Input validation failed for URL: ${args.url}`, error.errors);
        return {
          content: null,
          error: `Invalid input: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ")}`,
        };
      }

      // Handle unexpected errors
      console.error(`Unexpected error crawling ${args.url}:`, error);
      return {
        content: null,
        error: error instanceof Error ? error.message : "Unknown error occurred during crawling",
      };
    }
  },
});