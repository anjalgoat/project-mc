import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { createStreamableValue } from "ai/rsc";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { ChartDataResponse } from "../../lib/types";

// Input validation schema
const GenerateDiagramCodeInputSchema = z.object({
  chartData: ChartDataResponse, // Assumes ChartDataResponse is defined in lib/types.ts
  diagramType: z.enum(["bar", "matrix"]).default("bar"),
});

// Output validation schema
const GenerateDiagramCodeOutputSchema = z.string().min(1, "Diagram code must not be empty");

// System prompt adapted from diagram_agent.py
const systemPrompt = `
You are an AI that generates diagram code in Mermaid syntax based on structured market research data for betting apps. Your task is to:

1. Analyze the provided chart data (bar_chart_data and gap_matrix_data).
2. Generate Mermaid diagram code for the specified diagram type ('bar' or 'matrix').
   - For 'bar', create a bar chart (e.g., comparing competitors by review_count or rating).
   - For 'matrix', create a table or flowchart showing feature gaps across competitors.
3. Return only the Mermaid code as a string, wrapped in \`\`\`mermaid\n...\n\`\`\`.

**Important:**
- Use the exact field names from the input (e.g., bar_chart_data, gap_matrix_data).
- Do not include explanations or additional text outside the Mermaid code block.
- Ensure the code is valid Mermaid syntax compatible with Mermaid.js.
`;

// Action to generate Mermaid diagram code using LLM
export const generateDiagramCode = internalAction({
  args: {
    chartData: v.any(), // Will be validated by Zod
    diagramType: v.optional(v.union([v.literal("bar"), v.literal("matrix")])),
  },
  handler: async (ctx, args) => {
    console.log("Starting diagram code generation");

    // Validate input
    const inputParseResult = GenerateDiagramCodeInputSchema.safeParse(args);
    if (!inputParseResult.success) {
      console.error("Input validation failed:", inputParseResult.error);
      throw new Error(`Invalid input: ${inputParseResult.error.message}`);
    }

    const { chartData, diagramType } = inputParseResult.data;

    // Configure OpenRouter client (assumes OPENROUTER_API_KEY is set)
    const openRouterClient = openai({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });

    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY environment variable is missing");
      throw new Error("OpenRouter API key is required");
    }

    try {
      // Generate Mermaid code using LLM
      const result = await streamText({
        model: openRouterClient("gpt-4o-mini"),
        system: systemPrompt,
        prompt: JSON.stringify({ chartData, diagramType }, null, 2),
      });

      let diagramCode = "";
      for await (const chunk of result.textStream) {
        diagramCode += chunk;
      }

      // Validate output
      const outputParseResult = GenerateDiagramCodeOutputSchema.safeParse(diagramCode);
      if (!outputParseResult.success) {
        console.error("Output validation failed:", outputParseResult.error);
        throw new Error(`Invalid output: ${outputParseResult.error.message}`);
      }

      console.log("Successfully generated Mermaid diagram code");
      return diagramCode;
    } catch (error) {
      console.error("Error generating diagram code:", error);
      throw new Error("Failed to generate diagram code");
    }
  },
});