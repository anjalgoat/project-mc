import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import * as cheerio from "cheerio";
import { fetch } from "undici"; // Using undici for fetch in Node.js environment

export const findGooglePlayUrl = internalAction({
  args: {
    competitorName: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const { competitorName } = args;

    // Validate input
    if (!competitorName || competitorName.trim().length === 0) {
      console.warn("Invalid competitor name: Empty or undefined");
      return null;
    }

    console.log(`Fetching Google Play URL for: ${competitorName}`);

    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
    if (!scrapflyApiKey) {
      console.error("SCRAPFLY_API_KEY environment variable is required");
      return null;
    }

    try {
      const searchUrl = `https://api.scrapfly.io/scrape?key=${scrapflyApiKey}&url=${encodeURIComponent(
        `https://play.google.com/store/search?q=${encodeURIComponent(competitorName)}&c=apps`
      )}&render_js=true`;

      const response = await fetch(searchUrl);
      if (!response.ok) {
        console.warn(`Scrapfly API request failed with status: ${response.status}`);
        return null;
      }

      const result = await response.json() as { result: { content: string } };
      const html = result.result.content;

      // Parse HTML with cheerio
      const $ = cheerio.load(html);
      const link = $("a[href*='/store/apps/details?id=']").first();

      if (!link.length) {
        console.warn(`No Google Play app link found for ${competitorName}`);
        return null;
      }

      const href = link.attr("href");
      if (!href || !href.includes("id=")) {
        console.warn(`Invalid Google Play link format for ${competitorName}`);
        return null;
      }

      const packageId = href.split("id=")[1].split("&")[0];
      const url = `https://play.google.com/store/apps/details?id=${packageId}`;

      // Basic validation: Check if competitor name is loosely present in the app title
      const appTitle = link.find(".VfPpkd-vQzf8d")?.text().toLowerCase() || "";
      if (!appTitle.includes(competitorName.toLowerCase())) {
        console.warn(
          `App title "${appTitle}" does not match competitor name "${competitorName}"`
        );
        return null;
      }

      console.log(`Google Play URL found: ${url}`);
      return url;
    } catch (error) {
      console.error(`Error fetching Google Play URL for ${competitorName}: ${error}`);
      return null;
    }
  },
});