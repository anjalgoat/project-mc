import { internalAction } from "../../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { CompetitorSchema, AppReviewDataSchema, ReviewItemSchema } from "../../lib/types"; // Ensure ReviewItemSchema is imported
import { llmClient } from "../../../agents/definitions"; // Import the configured llmClient directly

// System prompt for generating fake reviews
const reviewAgentSystemPrompt = `
You are an AI assistant specialized in generating realistic fake app reviews.
You will receive the name of an application and information about which platforms (App Store, Google Play) it's available on.
Your task is to generate exactly 3 distinct, plausible-sounding reviews for EACH requested platform.
Each review MUST include:
1. A star 'rating' (integer between 1 and 5).
2. Review 'text' (1-3 sentences long).
The reviews should vary in tone and content (e.g., some positive, some negative, mentioning features, bugs, usability, performance, etc.).
Ensure the generated reviews are appropriate for the specified app name.
Output the results in a structured JSON format. The top level object should have keys 'app_store_reviews' and 'google_play_reviews'. Each key should map to an array of review objects, where each object has 'rating' and 'text'. Example: {"app_store_reviews": [{"rating": 5, "text": "Great app!"}, ...], "google_play_reviews": [{"rating": 1, "text": "Doesn't work."}, ...]}.
`;

// Zod schema for the expected LLM JSON output structure
const LlmReviewOutputSchema = z.object({
    app_store_reviews: z.array(ReviewItemSchema).optional().default([]),
    google_play_reviews: z.array(ReviewItemSchema).optional().default([]),
});

// Define the action
export const generateFakeReviews = internalAction({
  args: {
    // Use v.any() and let Zod handle detailed validation inside
    competitor: v.any(),
  },
  handler: async (_ctx, args): Promise<z.infer<typeof AppReviewDataSchema> | null> => { // Return validated type or null

    // Validate input competitor object using Zod
    let competitor: z.infer<typeof CompetitorSchema>;
    try {
      competitor = CompetitorSchema.parse(args.competitor);
      console.log(`Generating fake reviews for validated competitor: ${competitor.name}`);
    } catch (error) {
      const message = error instanceof z.ZodError ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') : 'Unknown validation error';
      console.error(`Input validation failed for competitor: ${message}`);
      // Returning null as per original logic, could also throw
      return null;
    }

    // Determine which platforms to generate reviews for
    const platforms: ("App Store" | "Google Play")[] = [];
    if (competitor.app_store_url) {
      platforms.push("App Store");
    }
    if (competitor.google_play_url) {
      platforms.push("Google Play");
    }

    if (platforms.length === 0) {
      console.log(`No App Store or Google Play URL found for ${competitor.name}. Skipping review generation.`);
      return null; // Return null if no platforms specified
    }

    // Construct the prompt for the LLM
    const platformString = platforms.join(" and ");
    const prompt = `
Generate exactly 3 fake reviews for the '${competitor.name}' app for EACH of the following platform(s): ${platformString}.
Follow the JSON output format specified in the system prompt (keys: 'app_store_reviews', 'google_play_reviews').
Each review object within the arrays must have 'rating' (1-5) and 'text' (1-3 sentences).
`;

    try {
      // Use the shared llmClient (configured OpenAI provider instance)
      console.log(`Calling LLM (${llmClient.modelId}) for review generation...`); // Log model being used
      const response = await llmClient.chat.completions.create({
        // model: llmClient.modelId, // Model is usually part of the client instance
        messages: [
          { role: "system", content: reviewAgentSystemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000, // Set a reasonable token limit
      });

      // Extract and parse the LLM output
      const rawOutput = response.choices[0]?.message?.content;
      if (!rawOutput) {
        console.error(`No content returned from LLM for ${competitor.name}`);
        return null;
      }

      console.log(`LLM raw output for ${competitor.name}:`, rawOutput);

      let parsedLlmJson;
      try {
        parsedLlmJson = JSON.parse(rawOutput);
      } catch (error) {
        console.error(`Failed to parse LLM JSON output for ${competitor.name}: ${error instanceof Error ? error.message : error}`);
        console.error(`Raw output was: ${rawOutput}`);
        return null;
      }

      // Validate the structure received from the LLM
      const llmValidationResult = LlmReviewOutputSchema.safeParse(parsedLlmJson);
      if (!llmValidationResult.success) {
          console.error(`LLM output structure validation failed for ${competitor.name}: ${llmValidationResult.error.format()}`);
          return null;
      }
      const llmResult = llmValidationResult.data;

      // Construct the final result conforming to AppReviewDataSchema
      const finalResultData = {
        competitor_name: competitor.name,
        // Use reviews from LLM result only if the platform was requested
        app_store_reviews: platforms.includes("App Store") ? llmResult.app_store_reviews : [],
        google_play_reviews: platforms.includes("Google Play") ? llmResult.google_play_reviews : [],
      };

      // Final validation using AppReviewDataSchema before returning
      const finalValidationResult = AppReviewDataSchema.safeParse(finalResultData);
       if (!finalValidationResult.success) {
           console.error(`Final output validation failed for ${competitor.name}: ${finalValidationResult.error.format()}`);
           return null;
       }

      console.log(`Successfully generated and validated reviews for ${competitor.name}.`);
      return finalValidationResult.data; // Return the fully validated data

    } catch (error) {
      console.error(`Failed to generate reviews for ${competitor.name} due to LLM error:`, error instanceof Error ? error.message : error);
      return null;
    }
  },
});