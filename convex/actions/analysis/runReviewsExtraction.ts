import { action } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { CompetitorSchema, AppReviewDataSchema } from "../../lib/types";
import { internal } from "../../_generated/api";

// Define the input schema using Zod
const RunReviewsExtractionInputSchema = z.object({
  competitors: z.array(CompetitorSchema).min(0),
  threadId: z.string(),
  userId: z.string().optional(),
});

// Define the action
export const runReviewsExtraction = action({
  args: {
    competitors: v.array(
      v.object({
        name: v.string(),
        app_store_url: v.union(v.string(), v.null()),
        google_play_url: v.union(v.string(), v.null()),
      })
    ),
    threadId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("Starting reviews extraction action for thread:", args.threadId);

    // Validate input using Zod
    let validatedInput;
    try {
      validatedInput = RunReviewsExtractionInputSchema.parse(args);
    } catch (error) {
      console.error("Input validation failed:", error);
      throw new Error("Invalid input for reviews extraction");
    }

    const { competitors } = validatedInput;

    // Log the number of competitors to process
    console.log(`Processing ${competitors.length} competitors for review generation`);

    // Create tasks for concurrent review generation
    const reviewTasks = competitors.map(async (competitor) => {
      console.log(`Generating reviews for competitor: ${competitor.name}`);
      try {
        const result = await ctx.runAction(
          internal.actions.tools.generateFakeReviews,
          {
            competitor,
            threadId: args.threadId,
          }
        );
        return result;
      } catch (error) {
        console.error(`Failed to generate reviews for ${competitor.name}:`, error);
        return null;
      }
    });

    // Execute tasks concurrently
    const results = await Promise.all(reviewTasks);

    // Filter out null results and validate output
    const validReviewData = results
      .filter((result): result is z.infer<typeof AppReviewDataSchema> => result !== null)
      .filter((result) => {
        try {
          AppReviewDataSchema.parse(result);
          return true;
        } catch (error) {
          console.error("Output validation failed for review data:", error);
          return false;
        }
      });

    // Log the summary
    console.log(`Successfully generated reviews for ${validReviewData.length} competitors`);

    // Return validated review data
    return validReviewData;
  },
});