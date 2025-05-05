import { action } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { ScrapeResultSchema, UrlInputSchema } from "../../lib/types";
import { internal } from "../../_generated/api";

// Action to extract insights from a list of webpages
export const runWebpageInsights = action({
  args: {
    urls: v.array(v.string()),
    threadId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate input URLs using Zod
    const validatedInput = z
      .array(UrlInputSchema)
      .parse(args.urls.map((url) => ({ url })));

    console.log(`Processing ${validatedInput.length} URLs for threadId: ${args.threadId}`);

    // Process URLs in parallel using the scrapeAndAnalyzeUrl internal tool
    const scrapePromises = validatedInput.map(async (input) => {
      try {
        const result = await ctx.runAction(internal.actions.tools.scrapeAndAnalyzeUrl, {
          url: input.url,
          threadId: args.threadId,
          userId: args.userId,
        });
        return result;
      } catch (error) {
        console.error(`Error processing URL ${input.url}:`, error);
        return {
          url: input.url,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          content: null,
          insights: [],
          metadata: {},
        };
      }
    });

    // Wait for all scrape and analyze operations to complete
    const results = await Promise.all(scrapePromises);

    // Validate output using Zod
    const validatedResults = z.array(ScrapeResultSchema).parse(results);

    console.log(`Completed processing for threadId: ${args.threadId}, ${validatedResults.length} results`);

    return validatedResults;
  },
});