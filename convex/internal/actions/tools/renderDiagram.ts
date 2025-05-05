import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import fetch from "node-fetch";

// Input validation schema
const RenderDiagramInputSchema = z.object({
  diagramCode: z.string().min(1, "Diagram code must not be empty"),
  format: z.enum(["png", "svg"]).default("png"),
});

// Output validation schema
const RenderDiagramOutputSchema = z.string().min(1, "Rendered diagram output must not be empty");

// Action to render Mermaid diagram code into an image
export const renderDiagram = internalAction({
  args: {
    diagramCode: v.string(),
    format: v.optional(v.union([v.literal("png"), v.literal("svg")])),
  },
  handler: async (ctx, args) => {
    console.log(`Starting diagram rendering for format: ${args.format || "png"}`);

    // Validate input
    const inputParseResult = RenderDiagramInputSchema.safeParse(args);
    if (!inputParseResult.success) {
      console.error("Input validation failed:", inputParseResult.error);
      throw new Error(`Invalid input: ${inputParseResult.error.message}`);
    }

    const { diagramCode, format } = inputParseResult.data;

    // Access rendering service API details
    const renderingServiceUrl = process.env.MERMAID_RENDERING_SERVICE_URL || "https://kroki.io";
    if (!renderingServiceUrl) {
      console.error("MERMAID_RENDERING_SERVICE_URL environment variable is missing");
      throw new Error("Mermaid rendering service URL is required");
    }

    try {
      // Prepare request to external rendering service (e.g., Kroki)
      const response = await fetch(`${renderingServiceUrl}/mermaid/${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: diagramCode,
      });

      if (!response.ok) {
        console.error(`Rendering service returned status ${response.status}: ${response.statusText}`);
        throw new Error("Failed to render diagram");
      }

      // Convert response to base64
      const buffer = await response.buffer();
      const base64Output = buffer.toString("base64");
      const output = `data:image/${format};base64,${base64Output}`;

      // Validate output
      const outputParseResult = RenderDiagramOutputSchema.safeParse(output);
      if (!outputParseResult.success) {
        console.error("Output validation failed:", outputParseResult.error);
        throw new Error(`Invalid output: ${outputParseResult.error.message}`);
      }

      console.log(`Successfully rendered diagram in ${format} format`);
      return output;
    } catch (error) {
      console.error("Error rendering diagram:", error);
      throw new Error("Failed to render diagram");
    }
  },
});