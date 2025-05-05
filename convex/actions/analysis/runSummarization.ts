import { action } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { getAgent } from "../../agents/definitions";
import {
  AppReviewDataSchema,
  WebpageResultSchema,
  GoogleTrendsResultSchema,
} from "../../lib/types";

// Define input schema using Zod
const RunSummarizationInputSchema = z.object({
  threadId: z.string(),
  userId: z.string().optional(),
  reviewsData: z.array(AppReviewDataSchema),
  webInsightsData: z.array(WebpageResultSchema),
  trendsData: GoogleTrendsResultSchema,
});

// Define output schema for the summary
const RunSummarizationOutputSchema = z.string().min(1, "Summary cannot be empty");

// Summarizer Action
export const runSummarization = action({
  args: {
    threadId: v.string(),
    userId: v.optional(v.string()),
    reviewsData: v.array(v.any()), // Will be validated with Zod
    webInsightsData: v.array(v.any()), // Will be validated with Zod
    trendsData: v.any(), // Will be validated with Zod
  },
  handler: async (ctx, args) => {
    console.log("Starting Summarization Action...");

    // Validate inputs using Zod
    let validatedInput;
    try {
      validatedInput = RunSummarizationInputSchema.parse(args);
    } catch (error) {
      console.error("Input validation failed:", error);
      throw new Error(`Invalid input data: ${error}`);
    }

    const { threadId, userId, reviewsData, webInsightsData, trendsData } =
      validatedInput;

    // Get the LLM agent
    const agent = getAgent();

    // Construct the prompt for the LLM
    const prompt = `
You are an expert Market Analysis Summarizer AI. Your task is to synthesize information from three sources:
1. User reviews of competitor apps.
2. Webpage insights from market reports and articles.
3. Google Trends data for market interest.

Your goal is to create a concise Market Summary Report that includes:
- An overall market summary synthesizing key takeaways.
- Key market trends identified across inputs.
- Competitor positioning summary based on reviews and web insights.
- Identified gaps between user needs and current offerings.
- Actionable strategic opportunities for a new or existing player.

---

### Input Data:

#### 1. User Reviews
${reviewsData.length} reviews analyzed for competitors: ${reviewsData
      .map((r) => r.competitorName)
      .join(", ")}.

Summary of reviews:
${reviewsData
  .map(
    (review) => `
**${review.competitorName}**:
- Pros: ${review.pros.join("; ")}
- Cons: ${review.cons.join("; ")}
- Common Requests: ${review.commonRequests.join("; ")}
`
  )
  .join("\n")}

Emerging themes from reviews: ${reviewsData
      .flatMap((r) => r.emergingThemes)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .join("; ")}

#### 2. Webpage Insights
Sources analyzed: ${webInsightsData.map((w) => w.sourceUrl).join(", ")}.

Market trends:
${webInsightsData
  .flatMap((w) => w.marketTrends)
  .filter((t, i, arr) => arr.indexOf(t) === i)
  .join("; ")}

Key findings:
${webInsightsData
  .map((w) => w.keyFindingsSummary)
  .filter((s, i, arr) => arr.indexOf(s) === i)
  .join("; ")}

Potential opportunities:
${webInsightsData
  .flatMap((w) => w.potentialOpportunities)
  .filter((o, i, arr) => arr.indexOf(o) === i)
  .join("; ")}

Competitive landscape notes:
${webInsightsData
  .flatMap((w) => w.competitiveLandscapeNotes)
  .filter((n, i, arr) => arr.indexOf(n) === i)
  .join("; ")}

#### 3. Google Trends Data
Search term: ${trendsData.searchTerm}
Interest over time (last 12 months): ${trendsData.interestOverTime
      .map((i) => `${i.date}: ${i.value}`)
      .join("; ")}
Top regions: ${trendsData.topRegions.join(", ")}
Related queries: ${trendsData.relatedQueries.join(", ")}

---

### Task
Based *only* on the information provided above, generate a concise Market Summary Report as a single string. The report should:
1. Synthesize key takeaways into an overall market summary.
2. List the most significant market trends.
3. Summarize competitor positioning based on pros, cons, and market notes.
4. Identify specific gaps where user needs are unmet by current offerings.
5. Propose actionable strategic opportunities based on gaps and trends.

Ensure the output is clear, concise, and professional. Structure it with clear headings for each section.
`;

    try {
      // Call the LLM via the agent
      const response = await agent.run({
        prompt,
        threadId,
        userId,
      });

      // Validate the output
      const validatedOutput = RunSummarizationOutputSchema.parse(response);

      console.log("Summarization Action completed successfully.");
      return validatedOutput;
    } catch (error) {
      console.error("Error during summarization:", error);
      throw new Error(`Summarization failed: ${error}`);
    }
  },
});