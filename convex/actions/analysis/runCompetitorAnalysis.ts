import { action } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { CompetitorResponseSchema, CompetitorSchema } from "../../lib/types";
import { getAgentClient } from "../../agents/definitions";
import { internal } from "../../_generated/api";

export const runCompetitorAnalysis = action({
  args: {
    query: v.string(),
    threadId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`Running competitor analysis for query: ${args.query}`);

    // Validate input arguments
    const inputSchema = z.object({
      query: z.string().min(1, "Query cannot be empty"),
      threadId: z.string().min(1, "Thread ID cannot be empty"),
      userId: z.string().optional(),
    });

    try {
      inputSchema.parse(args);
    } catch (error) {
      console.error(`Input validation failed: ${error}`);
      return CompetitorResponseSchema.parse({
        query: args.query,
        competitors: [
          { name: "Unknown 1" },
          { name: "Unknown 2" },
          { name: "Unknown 3" },
        ],
        error: "Invalid input parameters",
      });
    }

    const isAppQuery = args.query.toLowerCase().includes("app");
    const agentClient = await getAgentClient();

    // System prompt for LLM
    const systemPrompt = `
      You are an AI agent designed to identify top competitors based on a user's query. Your task is to:
      1. Analyze the query to determine if it’s an app-related request (e.g., 'app for music') or a local business request (e.g., 'restaurant for Nepali cuisine in London').
      2. Identify exactly 3 top competitors based on the query.
      3. For apps: Include their Google Play Store and App Store URLs (to be validated later).
      4. For local businesses: Only provide competitor names, no URLs.
      5. Return the results in a structured JSON format.

      Guidelines:
      - If the query is unclear, return 3 placeholder competitors (e.g., 'Unknown 1', 'Unknown 2', 'Unknown 3').
      - Do not fabricate competitor names unless the query is unclear—rely on common knowledge or search-like logic.
      - For apps, provide initial URL guesses; they will be validated later.
    `;

    // Make initial LLM call to get competitor names and possible URLs
    let llmResponse;
    try {
      llmResponse = await agentClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.query },
        ],
        response_format: { type: "json_object" },
      });

      const llmOutput = JSON.parse(llmResponse.choices[0].message.content || "{}");
      console.log(`LLM response: ${JSON.stringify(llmOutput)}`);

      // Validate LLM output
      const llmSchema = z.object({
        competitors: z.array(
          z.object({
            name: z.string().min(1),
            app_store_url: z.string().optional(),
            google_play_url: z.string().optional(),
          })
        ),
      });

      const parsedLLMOutput = llmSchema.safeParse(llmOutput);
      if (!parsedLLMOutput.success) {
        console.error(`LLM output validation failed: ${parsedLLMOutput.error}`);
        throw new Error("Invalid LLM response structure");
      }

      let competitors = parsedLLMOutput.data.competitors.map((comp) =>
        CompetitorSchema.parse({
          name: comp.name,
          app_store_url: comp.app_store_url,
          google_play_url: comp.google_play_url,
        })
      );

      // Ensure exactly 3 competitors
      if (competitors.length !== 3) {
        console.warn(`LLM returned ${competitors.length} competitors, expected 3. Falling back to web scrape.`);
        const searchQuery = args.query
          .toLowerCase()
          .replace("app for", "")
          .replace("restaurant for", "")
          .trim();
        const scrapedNames = await ctx.runAction(internal.actions.tools.scrapeWeb, {
          query: searchQuery,
        });

        competitors = scrapedNames.slice(0, 3).map((name) => CompetitorSchema.parse({ name }));
        if (competitors.length < 3) {
          competitors.push(
            ...Array(3 - competitors.length)
              .fill(null)
              .map((_, i) => CompetitorSchema.parse({ name: `Unknown ${i + 1}` }))
          );
        }
      }

      // For app queries, fetch and validate URLs concurrently
      if (isAppQuery) {
        const urlPromises = competitors.map(async (competitor) => {
          const [appStoreUrl, googlePlayUrl] = await Promise.all([
            ctx.runAction(internal.actions.tools.findAppStoreUrl, { competitorName: competitor.name }),
            ctx.runAction(internal.actions.tools.findGooglePlayUrl, { competitorName: competitor.name }),
          ]);

          // Validate URLs
          const validatedAppStoreUrl =
            appStoreUrl && appStoreUrl.includes("apple.com") ? appStoreUrl : null;
          const validatedGooglePlayUrl =
            googlePlayUrl && googlePlayUrl.includes("play.google.com") ? googlePlayUrl : null;

          if (!validatedAppStoreUrl && appStoreUrl) {
            console.warn(`Invalid App Store URL for ${competitor.name}: ${appStoreUrl}`);
          }
          if (!validatedGooglePlayUrl && googlePlayUrl) {
            console.warn(`Invalid Google Play URL for ${competitor.name}: ${googlePlayUrl}`);
          }

          return CompetitorSchema.parse({
            name: competitor.name,
            app_store_url: validatedAppStoreUrl,
            google_play_url: validatedGooglePlayUrl,
          });
        });

        competitors = await Promise.all(urlPromises);
      } else {
        // For non-app queries, ensure no URLs
        competitors = competitors.map((comp) =>
          CompetitorSchema.parse({
            name: comp.name,
            app_store_url: null,
            google_play_url: null,
          })
        );
      }

      // Construct and validate final response
      const finalResponse = CompetitorResponseSchema.safeParse({
        query: args.query,
        competitors,
      });

      if (!finalResponse.success) {
        console.error(`Final response validation failed: ${finalResponse.error}`);
        return CompetitorResponseSchema.parse({
          query: args.query,
          competitors: [
            { name: "Unknown 1" },
            { name: "Unknown 2" },
            { name: "Unknown 3" },
          ],
          error: "Failed to construct valid response",
        });
      }

      console.log(`Final competitor analysis result: ${JSON.stringify(finalResponse.data)}`);
      return finalResponse.data;
    } catch (error) {
      console.error(`Error in competitor analysis: ${error}`);
      return CompetitorResponseSchema.parse({
        query: args.query,
        competitors: [
          { name: "Unknown 1" },
          { name: "Unknown 2" },
          { name: "Unknown 3" },
        ],
        error: `Analysis failed: ${error}`,
      });
    }
  },
});