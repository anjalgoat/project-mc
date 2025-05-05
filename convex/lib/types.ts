// FILE: convex/lib/types.ts
import { z } from "zod";

// --- Competitor Schemas ---
export const CompetitorSchema = z.object({
  name: z.string().min(1, "Competitor name is required"),
  // URLs are optional strings that must be valid URLs if present
  app_store_url: z.string().url("Invalid App Store URL format").optional().nullable(),
  google_play_url: z.string().url("Invalid Google Play URL format").optional().nullable(),
});
export type Competitor = z.infer<typeof CompetitorSchema>;

export const CompetitorResponseSchema = z.object({
  query: z.string().min(1, "Query is required"),
  // Expects exactly 3 competitors
  competitors: z.array(CompetitorSchema).length(3, "Exactly 3 competitors required"),
  // Optional error field
  error: z.string().optional().nullable(),
});
export type CompetitorResponse = z.infer<typeof CompetitorResponseSchema>;

// --- Review Schemas ---
export const ReviewItemSchema = z.object({
  rating: z.number().int().gte(1).lte(5).optional().nullable(), // Rating 1-5, optional
  text: z.string().min(1, "Review text is required"),
  // Optional: Add platform if needed per review item
  // platform: z.enum(["App Store", "Google Play"]).optional(),
});
export type ReviewItem = z.infer<typeof ReviewItemSchema>;

// Schema for data returned by generateFakeReviews tool
export const AppReviewDataSchema = z.object({
  competitor_name: z.string().min(1, "Competitor name is required"),
  app_store_reviews: z.array(ReviewItemSchema).default([]),
  google_play_reviews: z.array(ReviewItemSchema).default([]),
  // Optional: Add fields based on actual LLM analysis/generation if needed
  // pros: z.array(z.string()).default([]),
  // cons: z.array(z.string()).default([]),
  // commonRequests: z.array(z.string()).default([]),
  // emergingThemes: z.array(z.string()).default([]),
});
export type AppReviewData = z.infer<typeof AppReviewDataSchema>;

// Schema specifically for passing review data into summarizer/diagram creator
export const CompetitorReviewsSchema = z.object({
    competitor_name: z.string().min(1),
    app_store_reviews: z.array(ReviewItemSchema).default([]),
    google_play_reviews: z.array(ReviewItemSchema).default([]),
});
export type CompetitorReviews = z.infer<typeof CompetitorReviewsSchema>;


// --- Trend Schemas ---
export const RelatedQuerySchema = z.object({
  query: z.string().min(1, "Related query text is required"),
});
export type RelatedQuery = z.infer<typeof RelatedQuerySchema>;

// Schema for data returned by scrapeGoogleTrends tool
export const GoogleTrendsResultSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  related_queries_top: z.array(RelatedQuerySchema).default([]),
  related_queries_rising: z.array(RelatedQuerySchema).default([]),
  errors: z.array(z.string()).default([]), // Capture errors during scraping
  // Optional: Add interest_over_time if scraped
  // interestOverTime: z.array(z.object({ date: z.string(), value: z.number() })).default([]),
  // topRegions: z.array(z.string()).default([]),
});
export type GoogleTrendsResult = z.infer<typeof GoogleTrendsResultSchema>;

// Schema for passing trend data into summarizer/diagram creator
export const TrendItemSchema = z.object({
    description: z.string().min(1),
    source: z.string().min(1),
    metric: z.string().optional().nullable(),
    timestamp: z.string().optional().nullable(),
});
export type TrendItem = z.infer<typeof TrendItemSchema>;

export const TrendsInputSchema = z.object({
    trends: z.array(TrendItemSchema),
});
export type TrendsInput = z.infer<typeof TrendsInputSchema>;


// --- Webpage/Scrape Schemas ---
export const UrlInputSchema = z.object({
  url: z.string().url("URL must be a valid URL"),
  // Optional: title might not always be available before scraping
  // title: z.string().min(1, "Title is required").optional(),
});
export type UrlInput = z.infer<typeof UrlInputSchema>;

// Schema for data returned by scrapeAndAnalyzeUrl tool
export const ScrapeResultSchema = z.object({
  url: z.string().url("URL must be a valid URL"),
  // Optional: Title might be extracted during scraping or analysis
  title: z.string().optional().nullable(),
  success: z.boolean(),
  content: z.string().nullable(), // Raw content (optional)
  // Optional: Refined analysis results
  summary: z.string().optional().nullable(),
  insight: z.string().optional().nullable(),
  relevance: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
  // Optional: Extracted metadata
  // metadata: z.record(z.string(), z.any()).optional(),
  // marketTrends: z.array(z.string()).default([]),
  // keyFindingsSummary: z.string().optional().nullable(),
  // potentialOpportunities: z.array(z.string()).default([]),
  // competitiveLandscapeNotes: z.array(z.string()).default([]),
});
export type ScrapeResult = z.infer<typeof ScrapeResultSchema>;

// Schema for passing webpage insights into summarizer/diagram creator
export const WebpageInsightsInputSchema = z.object({
    results: z.array(ScrapeResultSchema), // Use the detailed ScrapeResultSchema
});
export type WebpageInsightsInput = z.infer<typeof WebpageInsightsInputSchema>;

// --- Combined Input Schemas ---
// Schema for combined input to summarizer/diagram creator
export const FullMarketInputSchema = z.object({
  user_query: z.string().min(1, "User query is required"),
  trends: GoogleTrendsResultSchema.optional().nullable(), // Use the direct result schema
  webpage_insights: z.array(ScrapeResultSchema).optional().nullable(), // Use the direct result schema
  reviews: z.array(AppReviewDataSchema).optional().nullable(), // Use the direct result schema
});
export type FullMarketInput = z.infer<typeof FullMarketInputSchema>;

// --- Chart Schemas ---
export const BarChartDataItemSchema = z.object({
  name: z.string().min(1, "Competitor name is required"),
  review_count: z.number().int().gte(0).optional().nullable(),
  rating: z.number().gte(0).lte(5).optional().nullable(),
  market_share: z.number().gte(0).lte(100).optional().nullable(), // Assuming percentage
});
export type BarChartDataItem = z.infer<typeof BarChartDataItemSchema>;

export const GapMatrixCompetitorStatusSchema = z.record(
  z.string(), // Competitor name as key
  z.enum(["Yes", "No", "Unknown"], { message: "Competitor status must be 'Yes', 'No', or 'Unknown'" })
);

export const GapMatrixDataItemSchema = z.object({
  feature: z.string().min(1, "Feature name is required"),
  unmet_need: z.enum(["High", "Medium", "Low"], { message: "Unmet need must be 'High', 'Medium', or 'Low'" }).optional().nullable(),
  competitor_status: GapMatrixCompetitorStatusSchema,
});
export type GapMatrixDataItem = z.infer<typeof GapMatrixDataItemSchema>;

// Schema for data returned by runDiagramCreation action
export const ChartDataResponseSchema = z.object({
  bar_chart_data: z.array(BarChartDataItemSchema).default([]),
  gap_matrix_data: z.array(GapMatrixDataItemSchema).default([]),
  suggested_bar_chart_metric: z.string().optional().nullable(),
  error: z.string().optional().nullable(), // Add error field
});
export type ChartDataResponse = z.infer<typeof ChartDataResponseSchema>;

// --- Summarization Schema ---
// Schema for data returned by runSummarization action (assuming plain text summary)
export const MarketSummaryReportSchema = z.string().min(1, "Summary report cannot be empty");
export type MarketSummaryReport = z.infer<typeof MarketSummaryReportSchema>;

// --- Tool Input/Output Specific ---
export const ScrapeAndAnalyzeInput = z.object({
    url: z.string().url(),
    title: z.string().optional(), // Title might be optional input
    threadId: z.string(),
    userId: z.string().optional(),
});