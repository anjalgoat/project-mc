import { action } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { GoogleTrendsResultSchema } from "../../lib/types";
import { internal } from "../../_generated/api";

// Define input schema for validation
const RunMarketAnalysisInputSchema = z.object({
  keyword: z.string().min(1, "Keyword cannot be empty"),
  country: z.string().optional().default("US"),
  threadId: z.string().min(1, "Thread ID cannot be empty"),
  userId: z.string().optional(),
});

// Define output schema for validation
const RunMarketAnalysisOutputSchema = z.object({
  success: z.boolean(),
  googleTrendsResult: GoogleTrendsResultSchema.nullable(),
  error: z.string().nullable(),
});

export const runMarketAnalysis = action({
  args: {
    keyword: v.string(),
    country: v.optional(v.string()),
    threadId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Validate input arguments
      const validatedInput = RunMarketAnalysisInputSchema.parse({
        keyword: args.keyword,
        country: args.country,
        threadId: args.threadId,
        userId: args.userId,
      });
      console.log(`Starting market analysis for keyword: ${validatedInput.keyword}, country: ${validatedInput.country}`);

      // Call the scrapeGoogleTrends internal tool
      const googleTrendsResult = await ctx.runAction(
        internal.actions.tools.scrapeGoogleTrends,
        {
          keyword: validatedInput.keyword,
          country: validatedInput.country,
        }
      );

      // Validate the result from the tool
      const validatedTrendsResult = GoogleTrendsResultSchema.parse(googleTrendsResult);
      console.log(`Successfully retrieved Google Trends data for ${validatedInput.keyword}`);

      // Prepare the final output
      const output = {
        success: true,
        googleTrendsResult: validatedTrendsResult,
        error: null,
      };

      // Validate the final output
      const validatedOutput = RunMarketAnalysisOutputSchema.parse(output);
      console.log("Market analysis completed successfully");
      return validatedOutput;

    } catch (error) {
      // Handle and log errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.log(`Error in market analysis: ${errorMessage}`);

      const errorOutput = {
        success: false,
        googleTrendsResult: null,
        error: errorMessage,
      };

      // Validate the error output
      const validatedErrorOutput = RunMarketAnalysisOutputSchema.parse(errorOutput);
      return validatedErrorOutput;
    }
  },
});