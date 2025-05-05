import { internalAction } from "../../../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import * as cheerio from "cheerio";
import { GoogleTrendsResult, RelatedQuery, GoogleTrendsResultSchema } from "../../../../lib/types";

// Helper function to encode URL parameters safely
const encodeKeyword = (keyword: string): string => {
  return encodeURIComponent(keyword);
};

export const scrapeGoogleTrends = internalAction({
  args: {
    keyword: v.string(),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<z.infer<typeof GoogleTrendsResultSchema>> => {
    const keyword = args.keyword;
    const country = args.country || "US";
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;

    // Initialize result object
    const result: GoogleTrendsResult = {
      keyword,
      related_queries_top: [],
      related_queries_rising: [],
      errors: [],
    };

    // Check for Scrapfly API key
    if (!scrapflyApiKey) {
      console.error("SCRAPFLY_API_KEY is missing. Check environment variables.");
      result.errors.push("Scrapfly API Key (SCRAPFLY_API_KEY) not configured.");
      return GoogleTrendsResultSchema.parse(result);
    }

    console.info(`Attempting to scrape Google Trends for keyword: '${keyword}' in country: ${country}`);

    // Construct the Google Trends URL
    const encodedKeyword = encodeKeyword(keyword);
    const trendsUrl = `https://trends.google.com/trends/explore?q=${encodedKeyword}&geo=${country}&hl=en`;
    console.info(`Scraping URL: ${trendsUrl}`);

    try {
      // Make HTTP request using Scrapfly via Workspace API
      const response = await fetch(`https://api.scrapfly.io/scrape?key=${scrapflyApiKey}&url=${encodeURIComponent(trendsUrl)}&render_js=true&asp=true&country=${country}`, {
        method: "GET",
        headers: {
          Accept: "text/html",
        },
      });

      // Check response status
      if (!response.ok) {
        const errorMsg = `Scrapfly request failed. URL: ${trendsUrl}, Status: ${response.status}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
        try {
          const errorHtml = await response.text();
          const $error = cheerio.load(errorHtml);
          const errorTitle = $error("title").text() || "No Title Found";
          result.errors.push(`Scraped page title (potential error): ${errorTitle}`);
        } catch (e) {
          console.warn("Failed to parse error page title.");
        }
        return GoogleTrendsResultSchema.parse(result);
      }

      console.info(`Scrapfly request successful (Status: ${response.status}). Parsing content...`);

      // Parse HTML content with Cheerio
      const html = await response.text();
      const $ = cheerio.load(html);

      // Find related queries widgets
      const relatedQueryWidgets: cheerio.Cheerio[] = [];
      const allWidgets = $("div.details-widgets-container, div.widget.concepts-widget");
      console.debug(`Found ${allWidgets.length} potential widget containers.`);

      allWidgets.each((_, widget) => {
        const $widget = $(widget);
        const titleElement = $widget.find("div.widget-header-title, h2.LTR-title");
        if (titleElement.length && titleElement.text().trim().includes("Related queries")) {
          console.info("Found a 'Related queries' widget based on title.");
          relatedQueryWidgets.push($widget);
          return;
        }

        const topSection = $widget.find(".widget-top-entities, div:has(> .widget-title-label:contains('Top'))");
        const risingSection = $widget.find(".widget-rising-entities, div:has(> .widget-title-label:contains('Rising'))");
        if (topSection.length || risingSection.length) {
          console.info("Found a potential 'Related queries' widget based on Top/Rising sections.");
          relatedQueryWidgets.push($widget);
        }
      });

      if (relatedQueryWidgets.length === 0) {
        console.warn("Could not find any widgets definitively identified as 'Related queries'.");
        result.errors.push("Could not find 'Related queries' widgets (adjust selectors).");
      } else {
        console.info(`Processing ${relatedQueryWidgets.length} identified 'Related queries' widget(s)...`);
        relatedQueryWidgets.forEach(($widget, index) => {
          console.info(`Processing widget ${index + 1}/${relatedQueryWidgets.length}`);

          // Process Top queries
          const topSection = $widget.find("div:has(> .widget-title-label:contains('Top')), .widget-top-entities");
          if (topSection.length) {
            console.info("  Processing 'Top' queries section.");
            const queryItems = topSection.find(".item .label-text, .entity-info-container .label");
            if (queryItems.length) {
              let foundCount = 0;
              queryItems.each((_, item) => {
                const queryText = $(item).text().trim();
                if (queryText) {
                  result.related_queries_top.push({ query: queryText });
                  foundCount++;
                }
              });
              console.info(`    Found ${foundCount} 'Top' query items.`);
            } else {
              console.warn("    Found 'Top' section but no query items inside (check selectors).");
            }
          }

          // Process Rising queries
          const risingSection = $widget.find("div:has(> .widget-title-label:contains('Rising')), .widget-rising-entities");
          if (risingSection.length) {
            console.info("  Processing 'Rising' queries section.");
            const queryItems = risingSection.find(".item .label-text, .entity-info-container .label");
            if (queryItems.length) {
              let foundCount = 0;
              queryItems.each((_, item) => {
                const queryText = $(item).text().trim();
                if (queryText) {
                  result.related_queries_rising.push({ query: queryText });
                  foundCount++;
                }
              });
              console.info(`    Found ${foundCount} 'Rising' query items.`);
            } else {
              console.warn("    Found 'Rising' section but no query items inside (check selectors).");
            }
          }
        });
      }

      // Check for no-data scenarios
      if (
        result.related_queries_top.length === 0 &&
        result.related_queries_rising.length === 0 &&
        result.errors.length === 0
      ) {
        const noDataElement = $(".widget-error-title, .feed-item.no-data");
        if (noDataElement.length) {
          const noDataText = noDataElement.text().trim();
          console.warn(`Scraping finished, but Google Trends reported no data: '${noDataText}'`);
          result.errors.push(`Google Trends reported no data: ${noDataText}`);
        } else {
          console.warn("Scraping finished, but no related queries found (check selectors or page content).");
          result.errors.push("Scraping finished, but no related queries found (check selectors/content).");
        }
      }

    } catch (e) {
      const errorMsg = `An error occurred during scraping or parsing: ${e}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    console.info(
      `Finished scraping attempt for '${keyword}'. Found ${result.related_queries_top.length} top, ${result.related_queries_rising.length} rising queries. Errors: ${result.errors.length}`
    );

    // Validate and return the result
    return GoogleTrendsResultSchema.parse(result);
  },
});