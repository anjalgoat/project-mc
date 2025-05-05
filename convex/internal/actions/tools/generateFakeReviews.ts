import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { CompetitorSchema, AppReviewDataSchema } from "../../lib/types";
import { getLLMClient } from "../../agents/definitions";

// System prompt for generating fake reviews (translated from Python)
const reviewAgentSystemPrompt = `
You are an AI assistant specialized in generating realistic fake app reviews. 
You will receive the name of an application and information about which platforms (App Store, Google Play) it's available on. 
Your task is to generate exactly 3 distinct, plausible-sounding reviews for EACH requested platform. 
Each review MUST include:
1. A star rating (integer between 1 and 5).
2. Review text (1-3 sentences long).
The reviews should vary in tone and content (e.g., some positive, some negative, mentioning features, bugs, usability, performance, etc.). 
Ensure the generated reviews are appropriate for the specified app name. 
Output the results in a structured JSON format matching the AppReviewData schema.
`;

// Define the action
export const generateFakeReviews = internalAction({
  args: {
    competitor: v.object({
      name: v.string(),
      app_store_url: v.union(v.string(), v.null()),
      google_play_url: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    console.log(`Generating fake reviews for: ${args.competitor.name}`);

    // Validate input using Zod
    let competitor;
    try {
      competitor = CompetitorSchema.parse(args.competitor);
    } catch (error) {
      console.error(`Input validation failed for competitor: ${error}`);
      return null;
    }

    // Determine which platforms to generate reviews for
    const platforms: string[] = [];
    if (competitor.app_store_url) {
      platforms.push("App Store");
    }
    if (competitor.google_play_url) {
      platforms.push("Google Play");
    }

    if (!platforms.length) {
      console.log(`No App Store or Google Play URL found for ${competitor.name}. Skipping review generation.`);
      return null;
    }

    // Construct the prompt for the LLM
    const platformString = platforms.join(" and ");
    const prompt = `
Generate 3 fake reviews for the '${competitor.name}' app 
for the following platform(s): ${platformString}. 
Remember to include realistic ratings (1-5) and text for each review.
Output the result as JSON matching the following schema:
{
  "competitor_name": string,
  "app_store_reviews": Array<{rating: number, text: string}>,
  "google_play_reviews": Array<{rating: number, text: string}>
}
`;

    try {
      // Get the shared LLM client
      const llmClient = getLLMClient();

      // Run the LLM with the prompt
      const response = await llmClient.chat.completions.create({
        model: "mistralai/mistral-7b-instruct",
        messages: [
          { role: "system", content: reviewAgentSystemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      // Extract and parse the LLM output
      const rawOutput = response.choices[0]?.message?.content;
      if (!rawOutput) {
        console.error(`No content returned from LLM for ${competitor.name}`);
        return null;
      }

      let result;
      try {
        result = JSON.parse(rawOutput);
      } catch (error) {
        console.error(`Failed to parse LLM output for ${competitor.name}: ${error}`);
        return null;
      }

      // Validate and transform the output using Zod
      let validatedResult;
      try {
        validatedResult = AppReviewDataSchema.parse({
          ...result,
          competitor_name: competitor.name, // Ensure correct name
        });
      } catch (error) {
        console.error(`Output validation failed for ${competitor.name}: ${error}`);
        return null;
      }

      // Filter reviews based on requested platforms
      if (!platforms.includes("App Store")) {
        validatedResult.app_store_reviews = [];
      }
      if (!platforms.includes("Google Play")) {
        validatedResult.google_play_reviews = [];
      }

      console.log(`Successfully generated reviews for ${competitor.name}`);
      return validatedResult;

    } catch (error) {
      console.error(`Failed to generate reviews for ${competitor.name}: ${error}`);
      return null;
    }
  },
});