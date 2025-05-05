import { z } from "zod";

// Competitor-related schemas (from competitor.py and dummy_reviews.py)
export const CompetitorSchema = z.object({
  name: z.string().min(1, "Competitor name is required"),
  app_store_url: z.string().url().optional(),
  google_play_url: z.string().url().optional(),
});
export type Competitor = z.infer<typeof CompetitorSchema>;

export const CompetitorResponseSchema = z.object({
  query: z.string().min(1, "Query is required"),
  competitors: z.array(CompetitorSchema).min(3, "At least 3 competitors required").max(3, "Exactly 3 competitors required"),
});
export type CompetitorResponse = z.infer<typeof CompetitorResponseSchema>;

// Review-related schemas (from dummy_reviews.py, diagram_agent.py, summarizer.py)
export const ReviewItemSchema = z.object({
  rating: z.number().int().gte(1).lte(5).optional().nullable(),
  text: z.string().min(1, "Review text is required"),
});
export type ReviewItem = z.infer<typeof ReviewItemSchema>;

export const AppReviewDataSchema = z.object({
  competitor_name: z.string().min(1, "Competitor name is required"),
  app_store_reviews: z.array(ReviewItemSchema).default([]),
  google_play_reviews: z.array(ReviewItemSchema).default([]),
});
export type AppReviewData = z.infer<typeof AppReviewDataSchema>;

export const CompetitorReviewsSchema = z.object({
  competitor_name: z.string().min(1, "Competitor name is required"),
  app_store_reviews: z.array(ReviewItemSchema).default([]),
  google_play_reviews: z.array(ReviewItemSchema).default([]),
});
export type CompetitorReviews = z.infer<typeof CompetitorReviewsSchema>;

// Trend-related schemas (from trend_analyzer.py, summarizer.py)
export const RelatedQuerySchema = z.object({
  query: z.string().min(1, "Related query text is required"),
});
export type RelatedQuery = z.infer<typeof RelatedQuerySchema>;

export const GoogleTrendsResultSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  related_queries_top: z.array(RelatedQuerySchema).default([]),
  related_queries_rising: z.array(RelatedQuerySchema).default([]),
  errors: z.array(z.string()).default([]),
});
export type GoogleTrendsResult = z.infer<typeof GoogleTrendsResultSchema>;

export const TrendItemSchema = z.object({
  description: z.string().min(1, "Trend description is required"),
  source: z.string().min(1, "Source is required"),
  metric: z.string().optional().nullable(),
  timestamp: z.string().optional().nullable(),
});
export type TrendItem = z.infer<typeof TrendItemSchema>;

export const TrendsInputSchema = z.object({
  trends: z.array(TrendItemSchema),
});
export type TrendsInput = z.infer<typeof TrendsInputSchema>;

// Webpage-related schemas (from summarizer.py, diagram_agent.py)
export const WebpageResultSchema = z.object({
  url: z.string().url("URL must be a valid URL"),
  title: z.string().min(1, "Title is required"),
  summary: z.string().min(1, "Summary is required"),
  insight: z.string().min(1, "Insight is required"),
  relevance: z.string().min(1, "Relevance verdict is required"),
});
export type WebpageResult = z.infer<typeof WebpageResultSchema>;

export const WebpageInsightsInputSchema = z.object({
  results: z.array(WebpageResultSchema),
});
export type WebpageInsightsInput = z.infer<typeof WebpageInsightsInputSchema>;

// Market input schema (from summarizer.py, diagram_agent.py)
export const FullMarketInputSchema = z.object({
  user_query: z.string().min(1, "User query is required"),
  trends: TrendsInputSchema.optional(),
  webpage_insights: WebpageInsightsInputSchema.optional(),
  reviews: z.array(CompetitorReviewsSchema).optional(),
});
export type FullMarketInput = z.infer<typeof FullMarketInputSchema>;

// Chart-related schemas (from diagram_agent.py)
export const BarChartDataItemSchema = z.object({
  name: z.string().min(1, "Competitor name is required"),
  review_count: z.number().int().gte(0, "Review count must be non-negative"),
  rating: z.number().optional().nullable(),
  market_share: z.number().optional().nullable(),
});
export type BarChartDataItem = z.infer<typeof BarChartDataItemSchema>;

export const GapMatrixDataItemSchema = z.object({
  feature: z.string().min(1, "Feature name is required"),
  unmet_need: z.enum(["High", "Medium", "Low"], { message: "Unmet need must be 'High', 'Medium', or 'Low'" }),
  competitor_status: z.record(z.string(), z.enum(["Yes", "No", "Unknown"], { message: "Competitor status must be 'Yes', 'No', or 'Unknown'" })),
});
export type GapMatrixDataItem = z.infer<typeof GapMatrixDataItemSchema>;

export const ChartDataResponseSchema = z.object({
  bar_chart_data: z.array(BarChartDataItemSchema),
  gap_matrix_data: z.array(GapMatrixDataItemSchema),
  suggested_bar_chart_metric: z.string().optional().nullable(),
});
export type ChartDataResponse = z.infer<typeof ChartDataResponseSchema>;

// Market summary report schema (from summarizer.py)
export const MarketSummaryReportSchema = z.object({
  original_query: z.string().min(1, "Original query is required"),
  overall_market_summary: z.string().min(1, "Market summary is required"),
  key_market_trends: z.array(z.string().min(1)).min(1, "At least one market trend is required"),
  competitor_positioning_summary: z.string().min(1, "Competitor positioning summary is required"),
  identified_gaps: z.array(z.string().min(1)).min(1, "At least one gap is required"),
  strategic_opportunities: z.array(z.string().min(1)).min(1, "At least one opportunity is required"),
});
export type MarketSummaryReport = z.infer(typeof MarketSummaryReportSchema);

// Scrape-related schemas (from craw4ai.py)
export const UrlInputSchema = z.object({
  url: z.string().url("URL must be a valid URL"),
  title: z.string().min(1, "Title is required"),
});
export type UrlInput = z.infer<typeof UrlInputSchema>;

export const ScrapeResultSchema = z.object({
  url: z.string().min(1, "URL is required"),
  title: z.string().min(1, "Title is required"),
  summary: z.string().min(1, "Summary is required"),
  insight: z.string().min(1, "Insight is required"),
  relevance: z.string().min(1, "Relevance verdict is required"),
});
export type ScrapeResult = z.infer<typeof ScrapeResultSchema>;

export const ScrapeResponseSchema = z.object({
  results: z.array(ScrapeResultSchema).min(1, "At least one scrape result is required"),
});
export type ScrapeResponse = z.infer<typeof ScrapeResponseSchema>;

export const InitialScrapeResponseSchema = z.object({
  urls: z.array(UrlInputSchema).min(1, "At least one URL is required"),
});
export type InitialScrapeResponse = z.infer<typeof InitialScrapeResponseSchema>;