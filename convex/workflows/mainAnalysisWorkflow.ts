import { workflow } from "@convex-dev/workflow";
import { v } from "convex/values";
import * as api from "../_generated/api";

// Define the main analysis workflow
export const mainAnalysisWorkflow = workflow({
  args: {
    userQuery: v.string(),
    threadId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async ({ step }, { userQuery, threadId, userId }) => {
    console.log(`Starting main analysis workflow for query: "${userQuery}" with threadId: ${threadId}`);

    // Validate inputs
    if (!userQuery || userQuery.trim().length === 0) {
      console.error("Invalid userQuery provided");
      throw new Error("userQuery cannot be empty");
    }
    if (!threadId || threadId.trim().length === 0) {
      console.error("Invalid threadId provided");
      throw new Error("threadId cannot be empty");
    }

    // Step 1: Run parallel initial data collection (Competitor, Blog URLs, Trends)
    console.log("Initiating parallel data collection: Competitor, Blog URLs, Trends");
    const [competitorResult, blogUrlsResult, trendsResult] = await Promise.all([
      step.runAction(api.actions.analysis.runCompetitorAnalysis, {
        userQuery,
        threadId,
        userId,
      }).catch((error) => {
        console.error(`Competitor analysis failed: ${error}`);
        return null;
      }),
      step.runAction(api.actions.analysis.runWebpageInsights, {
        userQuery,
        threadId,
        userId,
      }).catch((error) => {
        console.error(`Blog URLs collection failed: ${error}`);
        return null;
      }),
      step.runAction(api.actions.analysis.runMarketAnalysis, {
        userQuery,
        threadId,
        userId,
      }).catch((error) => {
        console.error(`Trends analysis failed: ${error}`);
        return null;
      }),
    ]);

    // Step 2: Run Reviews Extraction if Competitor data is available
    let reviewsResult = null;
    if (competitorResult && competitorResult.competitors?.length > 0) {
      console.log("Running Reviews Extraction based on Competitor data");
      reviewsResult = await step.runAction(api.actions.analysis.runReviewsExtraction, {
        userQuery,
        threadId,
        userId,
        competitors: competitorResult.competitors,
      }).catch((error) => {
        console.error(`Reviews extraction failed: ${error}`);
        return null;
      });
    } else {
      console.warn("Skipping Reviews Extraction: No valid competitor data");
    }

    // Step 3: Run Webpage Insights (Crawling) if Blog URLs are available
    let webpageInsightsResult = null;
    if (blogUrlsResult && blogUrlsResult.urls?.length > 0) {
      console.log("Running Webpage Insights crawling based on Blog URLs");
      webpageInsightsResult = await step.runAction(api.actions.analysis.runWebpageInsights, {
        userQuery,
        threadId,
        userId,
        urls: blogUrlsResult.urls,
      }).catch((error) => {
        console.error(`Webpage insights crawling failed: ${error}`);
        return null;
      });
    } else {
      console.warn("Skipping Webpage Insights: No valid blog URLs");
    }

    // Step 4: Run Summarization (depends on Trends, Reviews, Webpage Insights)
    console.log("Running Summarization");
    const summarizationResult = await step.runAction(api.actions.analysis.runSummarization, {
      userQuery,
      threadId,
      userId,
      trends: trendsResult,
      reviews: reviewsResult,
      webpageInsights: webpageInsightsResult,
    }).catch((error) => {
      console.error(`Summarization failed: ${error}`);
      return null;
    });

    // Step 5: Run Diagram Creation (depends on Trends, Reviews, Webpage Insights)
    console.log("Running Diagram Creation");
    const diagramResult = await step.runAction(api.actions.analysis.runDiagramCreation, {
      userQuery,
      threadId,
      userId,
      trends: trendsResult,
      reviews: reviewsResult,
      webpageInsights: webpageInsightsResult,
    }).catch((error) => {
      console.error(`Diagram creation failed: ${error}`);
      return null;
    });

    // Step 6: Save final results to the database
    console.log("Saving final results to database");
    await step.runAction(api.actions.analysis.saveAnalysisResults, {
      threadId,
      userId,
      userQuery,
      competitorData: competitorResult,
      blogUrls: blogUrlsResult,
      trends: trendsResult,
      reviews: reviewsResult,
      webpageInsights: webpageInsightsResult,
      summaryReport: summarizationResult,
      chartData: diagramResult,
    }).catch((error) => {
      console.error(`Failed to save analysis results: ${error}`);
      throw error; // Critical step, propagate error
    });

    console.log(`Main analysis workflow completed for threadId: ${threadId}`);
  },
});