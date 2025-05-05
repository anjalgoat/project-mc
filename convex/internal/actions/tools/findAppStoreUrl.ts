import { internalAction } from "../../_generated/server";
import { v } from "convex/values";

export const findAppStoreUrl = internalAction({
  args: {
    competitorName: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const { competitorName } = args;

    // Validate input
    if (!competitorName || competitorName.trim() === "") {
      console.warn("Invalid or empty competitor name provided");
      return null;
    }

    console.log(`Fetching App Store URL for: ${competitorName}`);

    try {
      // Construct iTunes Search API URL
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
        competitorName
      )}&entity=software`;

      // Perform the API request using fetch
      const response = await fetch(itunesUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status !== 200) {
        console.warn(
          `Failed to fetch App Store data for ${competitorName}: Status ${response.status}`
        );
        return null;
      }

      const data = await response.json();

      // Check if results are present
      if (!data.results || data.results.length === 0) {
        console.warn(`No App Store results found for ${competitorName}`);
        return null;
      }

      // Get the first result's trackViewUrl
      const appStoreUrl = data.results[0]?.trackViewUrl;
      const foundName = data.results[0]?.trackName?.toLowerCase();

      // Validate the URL and name match
      if (!appStoreUrl || !appStoreUrl.includes("apple.com")) {
        console.warn(`Invalid App Store URL for ${competitorName}: ${appStoreUrl}`);
        return null;
      }

      if (!foundName || !foundName.includes(competitorName.toLowerCase())) {
        console.warn(
          `App Store result name "${foundName}" does not match query "${competitorName}"`
        );
        return null;
      }

      console.log(`App Store URL found: ${appStoreUrl}`);
      return appStoreUrl;
    } catch (error) {
      console.error(
        `Error fetching App Store URL for ${competitorName}:`,
        error
      );
      return null;
    }
  },
});