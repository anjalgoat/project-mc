import { internalAction } from "../../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
// Removed unused import: import { createStreamableValue } from "ai/rsc";
import { createOpenAI } from "@ai-sdk/openai"; // Use createOpenAI factory
import { streamText } from "ai";
import { ChartDataResponseSchema } from "../../../lib/types"; // Ensure this matches your types file

// Input validation schema
const GenerateDiagramCodeInputSchema = z.object({
  chartData: ChartDataResponseSchema, // Use the imported Zod schema directly
  diagramType: z.enum(["bar", "matrix"]).default("bar"),
});

// Output validation schema
const GenerateDiagramCodeOutputSchema = z.string().min(10, "Diagram code must not be empty and likely includes ```mermaid"); // Basic check

// System prompt adapted from Python
const systemPrompt = `
You are an AI that generates diagram code in Mermaid syntax based on structured market research data.
The input contains 'bar_chart_data' (list of objects with competitor stats like name, review_count, rating)
and 'gap_matrix_data' (list of objects with feature, unmet_need, and competitor_status per feature).

Your task is to:
1. Analyze the provided chart data (\`bar_chart_data\` and \`gap_matrix_data\`).
2. Generate Mermaid diagram code for the specified \`diagramType\` ('bar' or 'matrix').
   - For 'bar', create a bar chart (e.g., \`xychart-beta\`). Prioritize using \`suggested_bar_chart_metric\` if provided in input \`chartData\`, otherwise default to 'rating' or 'review_count'. Title the chart appropriately.
   - For 'matrix', create a visual representation (like a flowchart, mindmap, or potentially a simple table using markdown within Mermaid if complex) showing feature gaps across competitors. Clearly label features and competitor support ('Yes'/'No'/'Unknown').
3. Return ONLY the Mermaid code as a single raw string, wrapped correctly in \`\`\`mermaid\n...\n\`\`\`.
4. Ensure the code is valid Mermaid syntax compatible with standard Mermaid rendering tools.
5. Do NOT include any explanations, comments (outside mermaid comments), or other text outside the main Mermaid code block.
`;

// Action to generate Mermaid diagram code using LLM
export const generateDiagramCode = internalAction({
  args: {
    // Use v.any() and let Zod handle detailed validation inside the handler
    chartData: v.any(),
    diagramType: v.optional(v.union([v.literal("bar"), v.literal("matrix")])),
  },
  handler: async (_ctx, args) => { // Use _ctx as context is unused
    console.log(`Starting diagram code generation for type: ${args.diagramType || 'bar'}`);

    // Validate input rigorously using Zod
    const inputParseResult = GenerateDiagramCodeInputSchema.safeParse({
        chartData: args.chartData,
        diagramType: args.diagramType // Zod handles default
    });
    if (!inputParseResult.success) {
      console.error("Input validation failed:", inputParseResult.error.format());
      // Provide more detail in the error message
      const errorMessages = inputParseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`Invalid input for diagram generation: ${errorMessages}`);
    }

    const { chartData, diagramType } = inputParseResult.data;

    // Configure OpenRouter client
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const openRouterBaseUrl = process.env.OPENROUTER_BASE_URL || "[https://openrouter.ai/api/v1](https://openrouter.ai/api/v1)";
    const modelName = process.env.OPENAI_MODEL || "openai/gpt-4o-mini"; // Use consistent model

    if (!openRouterApiKey) {
      console.error("OPENROUTER_API_KEY environment variable is missing");
      throw new Error("Configuration error: OpenRouter API key is required");
    }

    try {
      // Create the AI SDK client instance configured for OpenRouter
      const openRouterClient = createOpenAI({
        apiKey: openRouterApiKey,
        baseURL: openRouterBaseUrl,
      });

      // Generate Mermaid code using LLM streamText
      console.log(`Calling LLM (${modelName}) for Mermaid code generation...`);
      const result = await streamText({
        model: openRouterClient(modelName),
        system: systemPrompt,
        // Provide the structured data directly in the prompt for the LLM to analyze
        prompt: `Generate Mermaid code for a '${diagramType}' diagram using the following data:\n\n${JSON.stringify(chartData, null, 2)}`,
      });

      // Accumulate the streamed response
      let diagramCode = "";
      for await (const chunk of result.textStream) {
        diagramCode += chunk;
      }

      console.log("LLM response received, validating output...");

      // Basic validation: check if it looks like a Mermaid block
      if (!diagramCode.includes("```mermaid") || !diagramCode.endsWith("```")) {
          console.warn("LLM output doesn't seem to be a valid Mermaid block:", diagramCode);
          // Optionally try to wrap it if missing, or just throw error
          // diagramCode = "```mermaid\n" + diagramCode.trim() + "\n```"; // Example fix attempt
          throw new Error("LLM did not return code wrapped in ```mermaid ... ```");
      }

      // Validate output using Zod schema
      const outputParseResult = GenerateDiagramCodeOutputSchema.safeParse(diagramCode);
      if (!outputParseResult.success) {
        console.error("Output validation failed:", outputParseResult.error.format());
        const errorMessages = outputParseResult.error.errors.map(e => e.message).join('; ');
        throw new Error(`Invalid diagram code generated: ${errorMessages}`);
      }

      console.log("Successfully generated and validated Mermaid diagram code.");
      return outputParseResult.data; // Return the validated code string

    } catch (error) {
      console.error("Error generating diagram code:", error);
      throw new Error(`Failed to generate diagram code: ${error instanceof Error ? error.message : 'Unknown LLM or streaming error'}`);
    }
  },
});