import { internalAction } from "../../../_generated/server";
import { v } from "convex/values";
import fetch from 'node-fetch'; // Explicitly import fetch

// Define expected structure of iTunes Search API result item
interface ItunesSearchResult {
    trackViewUrl?: string;
    trackName?: string;
    // Add other relevant fields if needed, e.g., artistName, bundleId
}

// Define expected structure of the overall API response
interface ItunesSearchResponse {
    resultCount: number;
    results: ItunesSearchResult[];
}

export const findAppStoreUrl = internalAction({
  args: {
    competitorName: v.string(),
  },
  handler: async (_ctx, args): Promise<string | null> => { // Use _ctx as context is unused
    const { competitorName } = args;

    // Validate input
    if (!competitorName || competitorName.trim() === "") {
      console.warn("findAppStoreUrl: Invalid or empty competitor name provided.");
      return null;
    }

    const searchTerm = competitorName.trim();
    console.log(`Workspaceing App Store URL for: "${searchTerm}"`);

    try {
      // Construct iTunes Search API URL
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
        searchTerm
      )}&entity=software&limit=5`; // Limit results for efficiency

      console.log(`Querying iTunes API: ${itunesUrl}`);

      // Perform the API request using fetch
      const response = await fetch(itunesUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
      });

      if (!response.ok) { // Check response.ok instead of just status 200
        console.warn(
          `Failed to fetch App Store data for "${searchTerm}": Status ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = await response.json() as ItunesSearchResponse;

      // Check if results are present
      if (!data || typeof data !== 'object' || !Array.isArray(data.results) || data.results.length === 0) {
        console.warn(`No valid App Store results found for "${searchTerm}"`);
        return null;
      }

      console.log(`Found ${data.results.length} potential results.`);

      // Iterate through results to find the best match
      for (const result of data.results) {
        const appStoreUrl = result?.trackViewUrl;
        const foundName = result?.trackName?.toLowerCase();

        // Validate the URL
        if (!appStoreUrl || !appStoreUrl.startsWith("https://apps.apple.com/")) {
           console.debug(`Skipping result: Invalid App Store URL format (${appStoreUrl})`);
           continue; // Skip this result if URL is invalid
        }

        // Validate the name match (more lenient check)
        if (!foundName || !foundName.includes(searchTerm.toLowerCase())) {
          console.debug(`Skipping result: Name "${foundName}" doesn't sufficiently match query "${searchTerm}"`);
          continue; // Skip if name doesn't seem to match
        }

        // If checks pass, return the first valid URL found
        console.log(`App Store URL found and validated for "${searchTerm}": ${appStoreUrl}`);
        return appStoreUrl;
      }

      // If loop completes without finding a suitable match
      console.warn(`No suitable App Store match found for "${searchTerm}" after checking ${data.results.length} results.`);
      return null;

    } catch (error) {
      console.error(
        `Error fetching App Store URL for "${searchTerm}":`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  },
});