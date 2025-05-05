import { internalAction } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";
import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { openai } from "@ai-sdk/openai";
import { ScrapeAndAnalyzeInput, ScrapeResult, ScrapeResultSchema } from "../../lib/types";

export const scrapeAndAnalyzeUrl = internalAction({
  args: {
    url: v.string(),
    title: v.string(),
    threadId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate inputs using Zod
    let validatedInput: z.infer<typeof ScrapeAndAnalyzeInput>;
    try {
      validatedInput = ScrapeAndAnalyzeInput.parse(args);
    } catch (error) {
      console.error("Input validation failed:", error);
      return ScrapeResultSchema.parse({
        url: args.url,
        title: args.title,
        summary: "Failed: Invalid input provided.",
        insight: "No insight available due to invalid input.",
        relevance: "Not relevant - invalid input.",
      });
    }

    const { url, title } = validatedInput;

    // Initialize Scrapfly API key
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
    if (!scrapflyApiKey) {
      console.error("SCRAPFLY_API_KEY environment variable is missing.");
      return ScrapeResultSchema.parse({
        url,
        title,
        summary: "Failed: Missing Scrapfly API key.",
        insight: "No insight available.",
        relevance: "Not relevant - configuration error.",
      });
    }

    let extractedText = "";
    try {
      console.log(`Scraping ${url} using Scrapfly`);

      // Make HTTP request to Scrapfly
      const scrapflyUrl = `https://api.scrapfly.io/scrape?key=${scrapflyApiKey}&url=${encodeURIComponent(url)}&asp=true`;
      const response = await fetch(scrapflyUrl);
      const result = await response.json();

      // Check Scrapfly response
      if (!result.result?.success || !result.result?.content) {
        const statusCode = result.result?.status_code || "N/A";
        console.warn(`Scrapfly failed for ${url}. Success: ${result.result?.success}, Status: ${statusCode}`);
        return ScrapeResultSchema.parse({
          url,
          title,
          summary: `Failed to retrieve content via Scrapfly (Success=${result.result?.success}, Status=${statusCode}).`,
          insight: "No insight available.",
          relevance: "Not relevant - content not retrieved.",
        });
      }

      const htmlContent = result.result.content;

      // Parse HTML and extract readable content
      const { document } = parseHTML(htmlContent);
      const reader = new Readability(document);
      const readable = reader.parse();
      extractedText = readable?.textContent || "";

      // Fallback to Cheerio if Readability extracts minimal content
      if (!extractedText || extractedText.length < 50) {
        console.warn(`Readability extracted minimal text (${extractedText.length} chars) from ${url}, trying Cheerio.`);
        const $ = cheerio.load(htmlContent);
        const bodyText = $("body").text().replace(/\s+/g, " ").trim();
        extractedText = bodyText || "No content extracted.";
        if (extractedText.length < 50) {
          console.error(`Could not extract significant text from ${url}.`);
          return ScrapeResultSchema.parse({
            url,
            title,
            summary: "Failed: No significant text content extracted.",
            insight: "No insight available.",
            relevance: "Not relevant - no text content.",
          });
        }
      }

      console.log(`Extracted ~${extractedText.length} characters from ${url}`);
    } catch (error) {
      console.error(`Scraping error for ${url}:`, error);
      return ScrapeResultSchema.parse({
        url,
        title,
        summary: `Failed to retrieve content: ${error instanceof Error ? error.message : "Unknown error"}.`,
        insight: "No insight available.",
        relevance: "Not relevant - scraping error.",
      });
    }

    // Limit content for LLM analysis
    const contentToAnalyze = extractedText.slice(0, 4000);

    // Prepare LLM prompt
    const prompt = `
Summarize the following content in 4-5 sentences, focusing on betting app market research:

${contentToAnalyze}

Then, provide one actionable insight and assess relevance to 'app for betting app market research' (Highly relevant, Partially relevant, Not relevant, with explanation).
Return as:
Summary: ...
Insight: ...
Relevance: ...
`;

    try {
      console.log(`Analyzing content for ${url} with OpenAI`);
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      if (!response.choices?.[0]?.message?.content) {
        console.error(`Invalid OpenAI response for ${url}`);
        return ScrapeResultSchema.parse({
          url,
          title,
          summary: "Scraped successfully, but OpenAI analysis failed.",
          insight: "No insight available.",
          relevance: "Not relevant - analysis failed.",
        });
      }

      const responseText = response.choices[0].message.content;

      // Parse LLM response
      let summary = "";
      let insight = "";
      let relevance = "";
      let currentField: "summary" | "insight" | "relevance" | null = null;

      for (const line of responseText.split("\n")) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith("Summary:")) {
          currentField = "summary";
          summary = trimmedLine.replace("Summary:", "").trim();
        } else if (trimmedLine.startsWith("Insight:")) {
          currentField = "insight";
          insight = trimmedLine.replace("Insight:", "").trim();
        } else if (trimmedLine.startsWith("Relevance:")) {
          currentField = "relevance";
          relevance = trimmedLine.replace("Relevance:", "").trim();
        } else if (currentField) {
          if (currentField === "summary") summary += " " + trimmedLine;
          else if (currentField === "insight") insight += " " + trimmedLine;
          else if (currentField === "relevance") relevance += " " + trimmedLine;
        }
      }

      // Ensure fields are populated
      summary = summary || "Summary parsing failed.";
      insight = insight || "Insight parsing failed.";
      relevance = relevance || "Relevance parsing failed.";

      // Construct and validate result
      const result: ScrapeResult = {
        url,
        title,
        summary,
        insight,
        relevance,
      };

      try {
        return ScrapeResultSchema.parse(result);
      } catch (error) {
        console.error("Output validation failed:", error);
        return ScrapeResultSchema.parse({
          url,
          title,
          summary: "Analysis completed but output validation failed.",
          insight: "No insight available.",
          relevance: "Not relevant - validation error.",
        });
      }
    } catch (error) {
      console.error(`OpenAI analysis failed for ${url}:`, error);
      return ScrapeResultSchema.parse({
        url,
        title,
        summary: `Scraped successfully, but OpenAI analysis failed: ${error instanceof Error ? error.message : "Unknown error"}.`,
        insight: "No insight available.",
        relevance: "Not relevant - analysis failed.",
      });
    }
  },
});