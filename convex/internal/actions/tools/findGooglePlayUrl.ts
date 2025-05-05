import { internalAction } from "../../../_generated/server";
import { v } from "convex/values";
import * as cheerio from "cheerio";
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

export const findGooglePlayUrl = internalAction({
  args: {
    competitorName: v.string(),
  },
  handler: async (_ctx, args): Promise<string | null> => { // Use _ctx as context is unused
    const { competitorName } = args;

    // Validate input
    if (!competitorName || competitorName.trim().length === 0) {
      console.warn("findGooglePlayUrl: Invalid competitor name - Empty or undefined");
      return null;
    }
    const searchTerm = competitorName.trim();
    console.log(`Workspaceing Google Play URL for: "${searchTerm}"`);

    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
    if (!scrapflyApiKey) {
      console.error("SCRAPFLY_API_KEY environment variable is required for Google Play search");
      return null; // Cannot proceed without API key
    }

    try {
      // Construct the Google Play search URL to be scraped by Scrapfly
      const playSearchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(searchTerm)}&c=apps&hl=en`;

      // Construct the Scrapfly API URL
      const scrapflyUrl = `https://api.scrapfly.io/scrape?key=${scrapflyApiKey}&url=${encodeURIComponent(playSearchUrl)}&render_js=true&asp=true&country=US`; // Use JS rendering for Play Store

      console.log(`Querying Scrapfly for Google Play search: ${playSearchUrl}`);

      const response = await fetch(scrapflyUrl, { timeout: 20000 }); // 20s timeout for rendering

      if (!response.ok) {
        console.warn(`Scrapfly API request failed with status: ${response.status} ${response.statusText}`);
        return null;
      }

      const result: ScrapflyResponse = await response.json() as ScrapflyResponse;

      // Check Scrapfly result structure and success
      if (!result?.result?.success || !result?.result?.content) {
         const errorReason = result?.result?.error || result?.error || "Unknown Scrapfly error or no content";
         console.warn(`Scrapfly failed to get Google Play content for "${searchTerm}". Reason: ${errorReason}`);
         return null;
      }

      const html = result.result.content;

      // Parse HTML with cheerio
      const $ = cheerio.load(html);

      // Find the first link that points to an app details page
      // Selectors might need adjustment if Google Play changes structure
      let foundLink: cheerio.Cheerio | null = null;
      const potentialLinks = $("a[href*='/store/apps/details?id=']");

      console.log(`Found ${potentialLinks.length} potential app links in search results.`);

      potentialLinks.each((_, elem) => {
          const linkElement = $(elem);
          // Try to find the title associated with this link card
          // Selectors are estimates and might need refinement
          const titleElement = linkElement.find('div[title]').first(); // Try finding element with title attribute
          let appTitle = titleElement.attr('title') || '';

          if (!appTitle) {
              // Fallback: Find nearest prominent text, often the title
              appTitle = linkElement.find('div').filter((i, el) => $(el).text().trim().length > 0).first().text().trim();
          }

          appTitle = appTitle.toLowerCase();

          console.debug(`Checking link: ${linkElement.attr('href')}, Title found: "${appTitle}"`);

          // Check if the found title seems relevant to the search term
          if (appTitle.includes(searchTerm.toLowerCase())) {
              foundLink = linkElement;
              console.log(`Found relevant link with title "${appTitle}"`);
              return false; // Stop .each loop once a relevant link is found
          }
      });


      if (!foundLink) {
        console.warn(`No relevant Google Play app link found for "${searchTerm}" based on title match.`);
        return null;
      }

      const href = foundLink.attr("href");

      if (!href || !href.includes("id=")) {
        console.warn(`Invalid Google Play link format found: "${href}"`);
        return null;
      }

      // Construct the canonical URL
      const urlParts = href.split("?");
      const path = urlParts[0];
      const params = new URLSearchParams(urlParts[1] || '');
      const packageId = params.get('id');

      if (!packageId) {
          console.warn(`Could not extract package ID from href: "${href}"`);
          return null;
      }

      const canonicalUrl = `https://play.google.com${path}?id=${packageId}&hl=en`; // Add hl=en for consistency

      console.log(`Google Play URL found and validated for "${searchTerm}": ${canonicalUrl}`);
      return canonicalUrl;

    } catch (error) {
      console.error(`Error fetching Google Play URL for "${searchTerm}":`, error instanceof Error ? error.message : error);
      return null;
    }
  },
});