import { internalAction } from "../../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { ScrapflyClient, ScrapeConfig, ScrapeResult } from "scrapfly-sdk"; // Import necessary types
import * as cheerio from "cheerio"; // Use cheerio

// Input validation schema
const ScrapeWebInputSchema = z.object({
  query: z.string().min(1, "Query must not be empty"),
});

// Output validation schema (array of valid URLs)
const ScrapeWebOutputSchema = z.array(z.string().url("Extracted item must be a valid URL"));

// Action to perform a generic web search and extract relevant URLs
export const scrapeWeb = internalAction({
  args: {
    query: v.string(),
  },
  handler: async (_ctx, args): Promise<string[]> => { // Return type string[]
    console.log(`Starting web scrape for query: "${args.query}"`);

    // Validate input
    const inputParseResult = ScrapeWebInputSchema.safeParse(args);
    if (!inputParseResult.success) {
      const message = inputParseResult.error.errors.map(e => e.message).join(', ');
      console.error("Input validation failed:", message);
      throw new Error(`Invalid input for web scrape: ${message}`);
    }
    const { query } = inputParseResult.data;

    // Access Scrapfly API key
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
    if (!scrapflyApiKey) {
      console.error("SCRAPFLY_API_KEY environment variable is missing");
      throw new Error("Configuration error: Scrapfly API key is required");
    }

    try {
      // Initialize Scrapfly client
      console.log("Initializing Scrapfly client...");
      const client = new ScrapflyClient({ key: scrapflyApiKey });

      // Perform Google search via Scrapfly
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`; // Add hl=en for consistency
      console.log(`Performing Scrapfly scrape for: ${searchUrl}`);

      const scrapeConfig = new ScrapeConfig({
        url: searchUrl,
        render_js: true, // Enable JS rendering for modern search result pages
        asp: true,       // Enable anti-scraping protection
        country: 'US',   // Specify country for consistency
        // Add more options if needed, e.g., proxy_pool
      });

      const scrapeResult: ScrapeResult = await client.scrape(scrapeConfig);

      // Check if scrape was successful and content exists
      if (!scrapeResult.success || !scrapeResult.result?.content) {
        const errorReason = scrapeResult.error || scrapeResult.result?.error || "No content returned";
        console.error(`Scrapfly scrape failed for query "${query}": ${errorReason}`);
        // Return empty array on failure, as per original logic
        return [];
      }

      console.log(`Scrape successful for query "${query}". Parsing content...`);

      // Parse HTML content with Cheerio
      const $ = cheerio.load(scrapeResult.result.content);
      const urls: string[] = [];
      const seenUrls = new Set<string>();

      // Extract URLs from search result links (refine selectors)
      // Common selectors for Google organic results' main link
      const resultSelectors = [
          'div.g a[href][data-ved]', // Standard organic result links
          'div[data-hveid] a[href]', // Another common container pattern
          'a[jsname][href]', // Links with specific JS attributes
      ];

      resultSelectors.forEach(selector => {
          $(selector).each((_, element) => {
              const href = $(element).attr('href');
              if (href) {
                  let cleanUrl = href;

                  // Clean Google redirect URLs (/url?q=...)
                  if (cleanUrl.startsWith('/url?')) {
                      try {
                          const urlParams = new URLSearchParams(cleanUrl.split('?')[1]);
                          const targetUrl = urlParams.get('q');
                           if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
                              cleanUrl = targetUrl;
                           } else {
                               return; // Skip if '/url?q=' doesn't contain a valid target URL
                           }
                      } catch (e) {
                          console.warn(`Could not parse Google redirect URL params: ${cleanUrl}`);
                          return; // Skip potentially malformed URLs
                      }
                  }

                  // Basic URL validation and filtering
                  if (
                    (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) &&
                    !seenUrls.has(cleanUrl) &&
                    !cleanUrl.includes("google.com") &&     // Exclude Google domains
                    !cleanUrl.includes("google.ad") &&      // Exclude Google Ads domains
                    !cleanUrl.includes("accounts.google") && // Exclude login pages
                    !cleanUrl.includes("support.google") && // Exclude support pages
                    !cleanUrl.includes("webcache.googleusercontent") && // Exclude cache links
                    !cleanUrl.includes("translate.google") // Exclude translate links
                  ) {
                      urls.push(cleanUrl);
                      seenUrls.add(cleanUrl);
                  }
              }
          });
      });


      // Limit to top N unique URLs (e.g., 5)
      const uniqueUrls = urls.slice(0, 5); // Already unique due to Set, just slice

      // Validate output array of URLs
      const outputParseResult = ScrapeWebOutputSchema.safeParse(uniqueUrls);
      if (!outputParseResult.success) {
        console.error("Output validation failed:", outputParseResult.error.format());
        // Decide whether to return potentially invalid URLs or empty array
        // Returning empty might be safer if downstream expects valid URLs
        return [];
        // throw new Error(`Invalid output URLs generated: ${outputParseResult.error.message}`);
      }

      console.log(`Successfully scraped and validated ${outputParseResult.data.length} URLs for query: "${query}"`);
      return outputParseResult.data; // Return validated array

    } catch (error) {
      console.error(`Error during web scrape for query "${query}":`, error instanceof Error ? error.message : error);
      // Return empty array on unexpected errors
      return [];
    }
  },
});