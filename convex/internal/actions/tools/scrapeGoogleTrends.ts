import { internalAction } from "../../../_generated/server"; // Corrected path
import { v } from "convex/values";
import { z } from "zod";
import * as cheerio from "cheerio";
import { GoogleTrendsResultSchema, RelatedQuerySchema } from "../../../lib/types"; // Import from lib
import fetch from 'node-fetch'; // Using node-fetch

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


// Helper function to encode URL parameters safely (redundant if using URLSearchParams but good practice)
const encodeKeyword = (keyword: string): string => {
  return encodeURIComponent(keyword);
};

export const scrapeGoogleTrends = internalAction({
  args: {
    keyword: v.string(),
    country: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<z.infer<typeof GoogleTrendsResultSchema>> => { // Use _ctx, return validated type
    const keyword = args.keyword.trim();
    const country = args.country?.trim() || "US"; // Default to US
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;

    // Initialize result object structure based on Zod schema
    const result: z.infer<typeof GoogleTrendsResultSchema> = {
      keyword: keyword,
      // Initialize arrays/fields as defined in the schema
      related_queries_top: [],
      related_queries_rising: [],
      errors: [],
      // Ensure all fields from GoogleTrendsResultSchema are initialized if needed
      // e.g., interestOverTime: [], topRegions: [] if they are part of the schema
    };

    // --- Input Validation ---
    if (!keyword) {
        result.errors.push("Input validation failed: Keyword cannot be empty.");
        // Use .parse() to ensure the returned object matches the schema, even in error cases
        return GoogleTrendsResultSchema.parse(result);
    }

    // --- Check Configuration ---
    if (!scrapflyApiKey) {
      console.error("SCRAPFLY_API_KEY is missing. Check environment variables.");
      result.errors.push("Configuration error: Scrapfly API Key (SCRAPFLY_API_KEY) not configured.");
      return GoogleTrendsResultSchema.parse(result);
    }

    console.info(`Attempting to scrape Google Trends for keyword: '${keyword}' in country: ${country}`);

    // --- Construct URLs ---
    const trendsUrl = `https://trends.google.com/trends/explore?q=${encodeKeyword(keyword)}&geo=${country}&hl=en`;
    const scrapflyUrl = `https://api.scrapfly.io/scrape?key=${scrapflyApiKey}&url=${encodeURIComponent(trendsUrl)}&render_js=true&asp=true&country=${country}`; // Enable JS rendering

    console.info(`Scraping URL via Scrapfly: ${trendsUrl}`);

    // --- Perform Scraping ---
    try {
      const response = await fetch(scrapflyUrl, {
        method: "GET",
        headers: { Accept: "text/html" }, // Expecting HTML
        timeout: 25000, // Increase timeout for JS rendering
      });

      // Check Scrapfly response status
      if (!response.ok) {
        const errorMsg = `Scrapfly request failed. URL: ${trendsUrl}, Status: ${response.status} ${response.statusText}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
        try {
            // Attempt to get more info from the response body if possible
            const errorBody = await response.text();
            const $error = cheerio.load(errorBody);
            const errorTitle = $error("title").text() || "No Title Found";
            result.errors.push(`Scraped error page title: ${errorTitle.slice(0,100)}`);
        } catch (e) {
            console.warn("Failed to parse error page content.");
        }
        return GoogleTrendsResultSchema.parse(result);
      }

      const scrapflyResult: ScrapflyResponse = await response.json() as ScrapflyResponse;

      // Check Scrapfly success flag and content
      if (!scrapflyResult?.result?.success || !scrapflyResult?.result?.content) {
         const reason = scrapflyResult?.result?.error || scrapflyResult?.error || "Unknown Scrapfly error or no content";
         console.warn(`Scrapfly reported failure or no content for ${trendsUrl}. Reason: ${reason}`);
         result.errors.push(`Scraping failed: ${reason}`);
         return GoogleTrendsResultSchema.parse(result);
      }

      console.info(`Scrapfly request successful. Parsing content...`);
      const html = scrapflyResult.result.content;
      const $ = cheerio.load(html);

      // --- Extract Related Queries ---
      // Refined selectors (these might still need adjustment based on Google's current HTML)
      const relatedQueryWidgets = $("widget[widget-name='RELATED_QUERIES'], div.details-widgets-container:has(div:contains('Related queries'))");

      if (relatedQueryWidgets.length === 0) {
          console.warn("Could not find related queries widgets (Selectors might be outdated).");
          result.errors.push("Parsing warning: Could not find related queries widgets.");
          // Check for explicit "no data" message from Google Trends
          const noDataElement = $(".widget-error-title:contains('interest'), .feed-item.no-data:contains('enough data')");
          if (noDataElement.length) {
              const noDataText = noDataElement.first().text().trim();
              console.warn(`Google Trends reported no data: '${noDataText}'`);
              result.errors.push(`Google Trends reported no data: ${noDataText}`);
          }
      } else {
          console.info(`Found ${relatedQueryWidgets.length} related queries widget(s). Processing...`);

          relatedQueryWidgets.each((index, widget) => {
              const $widget = $(widget);
              console.debug(`Processing widget ${index + 1}`);

              // Process Top queries section
              const topSection = $widget.find("div.widget-top-entities, div:has(> .widget-title-label:contains('Top'))");
              if (topSection.length) {
                  console.debug("  Processing 'Top' queries section.");
                  const queryItems = topSection.find(".item a .label-text, .entity-info-container .label a"); // More specific selectors
                  if (queryItems.length) {
                      queryItems.each((_, item) => {
                          const queryText = $(item).text().trim();
                          if (queryText && !result.related_queries_top.some(q => q.query === queryText)) { // Avoid duplicates
                              result.related_queries_top.push({ query: queryText });
                          }
                      });
                      console.debug(`    Found ${result.related_queries_top.length} unique 'Top' queries.`);
                  } else {
                      console.warn("    Found 'Top' section but no query items inside (check selectors).");
                  }
              }

              // Process Rising queries section
              const risingSection = $widget.find("div.widget-rising-entities, div:has(> .widget-title-label:contains('Rising'))");
              if (risingSection.length) {
                  console.debug("  Processing 'Rising' queries section.");
                  const queryItems = risingSection.find(".item a .label-text, .entity-info-container .label a"); // More specific selectors
                  if (queryItems.length) {
                      queryItems.each((_, item) => {
                          const queryText = $(item).text().trim();
                           if (queryText && !result.related_queries_rising.some(q => q.query === queryText)) { // Avoid duplicates
                              result.related_queries_rising.push({ query: queryText });
                           }
                      });
                      console.debug(`    Found ${result.related_queries_rising.length} unique 'Rising' queries.`);
                  } else {
                      console.warn("    Found 'Rising' section but no query items inside (check selectors).");
                  }
              }
          });
      }

      // Add a final check if no queries were found despite finding widgets
      if (relatedQueryWidgets.length > 0 && result.related_queries_top.length === 0 && result.related_queries_rising.length === 0 && result.errors.length === 0) {
          console.warn("Widgets found, but no specific Top/Rising queries extracted (check item selectors).");
          result.errors.push("Parsing warning: Widgets found, but failed to extract specific queries.");
      }

    } catch (e) {
      const errorMsg = `An error occurred during scraping or parsing: ${e instanceof Error ? e.message : String(e)}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    console.info(
      `Finished scraping Google Trends for '${keyword}'. Found ${result.related_queries_top.length} top, ${result.related_queries_rising.length} rising queries. Errors: ${result.errors.length}`
    );

    // Validate and return the final result using Zod schema
    try {
        return GoogleTrendsResultSchema.parse(result);
    } catch (validationError) {
        console.error("Final result validation failed:", validationError);
        // Attempt to return the result anyway but add a validation error message
        result.errors.push(`Internal validation failed: ${validationError instanceof z.ZodError ? validationError.message : String(validationError)}`);
        // Re-parse with the added error, although this might fail if the structure is fundamentally wrong
        try {
             return GoogleTrendsResultSchema.parse(result);
        } catch {
            // Fallback: Return a minimal valid structure if re-parsing fails
             return GoogleTrendsResultSchema.parse({
                 keyword: keyword,
                 related_queries_top: [],
                 related_queries_rising: [],
                 errors: result.errors.length > 0 ? result.errors : ["Unknown validation error on fallback"],
             });
        }
    }
  },
});