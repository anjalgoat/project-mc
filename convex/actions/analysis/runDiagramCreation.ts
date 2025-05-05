import { action } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { createAgent } from "@convex-dev/agent";
import { zValidator } from "@convex-dev/agent/zod";
import { RawMarketDataInputSchema, ChartDataResponseSchema } from "../../lib/types";

// Define the input schema for the action
const RunDiagramCreationInput = z.object({
  marketData: RawMarketDataInputSchema,
  threadId: z.string(),
  userId: z.string().optional(),
});

// Define the diagram agent
const diagramAgent = createAgent({
  client: openai("gpt-3.5-turbo"), // Using OpenAI client via AI SDK
  systemPrompt: `
You are an AI agent that processes market research data for betting apps and structures it into JSON format
suitable for frontend charting libraries like Recharts (used by Shadcn Charts).

You will receive structured input data about competitors and market gaps. Your task is to:

1. Analyze the \`competitor_data\` input.
2. Determine the most relevant metric for a primary comparison (usually 'review_count' if available and significant, otherwise 'rating'). If possible, record this metric's name in the \`suggested_bar_chart_metric\` field.
3. Format the competitor data into a JSON list for a bar chart, where each object contains the competitor's name, review_count, rating, and market_share (if available). This list should be assigned to the \`bar_chart_data\` field.
4. Analyze the \`market_gap_data\` input.
5. Determine the full list of unique competitors present across all features.
6. Format the market gap data into a JSON list for a feature matrix/table. Each object in the list should represent a feature and contain:
   - The \`feature\` name.
   - The \`unmet_need\` level.
   - A \`competitor_status\` dictionary where keys are the unique competitor names and values are 'Yes' or 'No' indicating support for that feature.
   This list should be assigned to the \`gap_matrix_data\` field.

**IMPORTANT:** Do NOT generate Python code, matplotlib code, seaborn code, or any executable code.
Your sole output must be a JSON object conforming to the \`ChartDataResponse\` schema, containing only the structured data for the charts.
Use the exact field names specified in the schema (\`bar_chart_data\`, \`gap_matrix_data\`, \`suggested_bar_chart_metric\`).
`,
});

// Define the action
export default action({
  args: {
    marketData: v.any(), // Will be validated with Zod
    threadId: v.string(),
    userId: v.string({ optional: true }),
  },
  handler: async (ctx, args) => {
    console.log("Starting diagram creation action");

    try {
      // Validate input
      const validatedInput = RunDiagramCreationInput.parse(args);
      const { marketData, threadId, userId } = validatedInput;

      // Prepare input for the agent
      const agentInput = {
        competitor_data: marketData.competitor_data,
        market_gap_data: marketData.market_gap_data,
      };

      console.log("Running diagram agent with input:", JSON.stringify(agentInput, null, 2));

      // Run the agent to generate chart data
      const response = await diagramAgent.run(
        ctx,
        {
          input: agentInput,
          threadId,
          userId,
        },
        {
          resultValidator: zValidator(ChartDataResponseSchema),
        }
      );

      // Check if the agent execution was successful
      if (response && response.data) {
        console.log("Diagram agent execution successful. Generated Chart Data:");
        console.log(JSON.stringify(response.data, null, 2));

        // Log suggested metric if provided
        if (response.data.suggested_bar_chart_metric) {
          console.log(`LLM suggested metric: ${response.data.suggested_bar_chart_metric}`);
        } else {
          console.log("LLM did not provide 'suggested_bar_chart_metric'. Frontend should use a default.");
        }

        // Validate and return the output
        const validatedOutput = ChartDataResponseSchema.parse(response.data);
        return validatedOutput;
      } else {
        // Log detailed error info
        const errorDetails = response?.error || "Unknown error";
        const rawOutput = response?.rawOutput || "N/A";
        console.error(
          `Diagram agent execution failed. Error: ${errorDetails}. Raw Output: ${rawOutput}`
        );
        return {
          bar_chart_data: [],
          gap_matrix_data: [],
          suggested_bar_chart_metric: null,
          error: `Agent execution failed: ${errorDetails}`,
        };
      }
    } catch (error) {
      console.error("Error in diagram creation action:", error);
      return {
        bar_chart_data: [],
        gap_matrix_data: [],
        suggested_bar_chart_metric: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});