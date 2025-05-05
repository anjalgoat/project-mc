import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { ScrapflyClient, ScrapeConfig } from "scrapfly-sdk";
import cheerio from "cheerio";

// Input validation schema
const ScrapeWebInputSchema = z.object({
  query: z.string().min(1, "Query must not be empty"),
});

// Output validation schema
const ScrapeWebOutputSchema = z.array(z.string().url());

// Action to perform a generic web search and extract relevant URLs
export const scrapeWeb = internalAction({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Starting web scrape for query: ${args.query}`);

    // Validate input
    const inputParseResult = ScrapeWebInputSchema.safeParse(args);
    if (!inputParseResult.success) {
      console.error("Input validation failed:", inputParseResult.error);
      throw new Error(`Invalid input: ${inputParseResult.error.message}`);
    }

    // Access Scrapfly API key
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
    if (!scrapflyApiKey) {
      console.error("SCRAPFLY_API_KEY environment variable is missing");
      throw new Error("Scrapfly API key is required");
    }

    try {
      // Initialize Scrapfly client
      const client = new ScrapflyClient({ key: scrapflyApiKey });

      // Perform Google search via Scrapfly
      const scrapeResult = await client.scrape(
        new ScrapeConfig({
          url: `https://www.google.com/search?q=${encodeURIComponent(args.query)}`,
          render_js: true,
          asp: true, // Enable anti-scraping protection
        })
      );

      // Check if scrape was successful
      if (!scrapeResult.success || !scrapeResult.result.content) {
        console.error("Scrapfly scrape failed:", scrapeResult.error || "No content");
        return [];
      }

      // Parse HTML content with Cheerio
      const $ = cheerio.load(scrapeResult.result.content);
      const urls: string[] = [];

      // Extract URLs from search result links
      $("a[href]").each((_, element) => {
        const href = $(element).attr("href");
        if (
          href &&
          (href.startsWith("http://") || href.startsWith("https://")) &&
          !href.includes("google.com") // Exclude Google-related URLs
        ) {
          urls.push(href);
        }
      });

      // Deduplicate and limit to top 5 URLs
      const uniqueUrls = [...new Set(urls)].slice(0, 5);

      // Validate output
      const outputParseResult = ScrapeWebOutputSchema.safeParse(uniqueUrls);
      if (!outputParseResult.success) {
        console.error("Output validation failed:", outputParseResult.error);
        throw new Error(`Invalid output: ${outputParseResult.error.message}`);
      }

      console.log(`Successfully scraped ${uniqueUrls.length} URLs for query: ${args.query}`);
      return uniqueUrls;
    } catch (error) {
      console.error(`Error during web scrape for query "${args.query}":`, error);
      return [];
    }
  },
});