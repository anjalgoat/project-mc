import { internalAction } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";
import fetch from "node-fetch";

// Input validation schema using Zod
const CrawlInputSchema = z.object({
  url: z.string().url("Must be a valid URL"),
});

// Output type (for clarity, though Convex doesn't enforce return types)
type CrawlOutput = {
  content: string | null;
  error?: string;
};

// Internal action for crawling web content
export const crawlContent = internalAction({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args): Promise<CrawlOutput> => {
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
          error: "Missing SCRAPFLY_API_KEY",
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
        console.warn(`Scrapfly request failed for ${url} with status: ${status}`);
        return {
          content: null,
          error: `Scrapfly request failed with status ${status}`,
        };
      }

      // Parse JSON response
      const result = await response.json();
      if (!result.result?.success || !result.result?.content) {
        console.warn(`Scrapfly returned no content or failed for ${url}. Success: ${result.result?.success}`);
        return {
          content: null,
          error: `Scrapfly returned no content or failed: ${result.result?.reason || "Unknown"}`,
        };
      }

      // Extract raw HTML content
      const htmlContent = result.result.content;
      console.log(`Successfully crawled ${url}. Content length: ${htmlContent.length} characters`);

      return {
        content: htmlContent,
        error: undefined,
      };
    } catch (error) {
      // Handle Zod validation errors or fetch errors
      if (error instanceof z.ZodError) {
        console.error(`Input validation failed for URL: ${args.url}`, error.errors);
        return {
          content: null,
          error: `Invalid input: ${error.errors.map(e => e.message).join(", ")}`,
        };
      }

      // Handle unexpected errors
      console.error(`Unexpected error crawling ${args.url}:`, error);
      return {
        content: null,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});