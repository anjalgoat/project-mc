import { internalAction } from "../../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import fetch from "node-fetch"; // Using node-fetch

// Input validation schema
const RenderDiagramInputSchema = z.object({
  diagramCode: z.string()
                 .min(1, "Diagram code must not be empty")
                 .refine(code => code.includes("```mermaid"), { message: "Diagram code should contain '```mermaid'" }),
  format: z.enum(["png", "svg"]).default("png"),
});

// Output validation schema (checks for data URI structure)
const RenderDiagramOutputSchema = z.string()
                                   .startsWith("data:image/", "Output must be a data URI (image)")
                                   .contains(";base64,", "Output must be base64 encoded");


// Action to render Mermaid diagram code into an image
export const renderDiagram = internalAction({
  args: {
    diagramCode: v.string(),
    format: v.optional(v.union([v.literal("png"), v.literal("svg")])),
  },
  handler: async (_ctx, args) => { // Use _ctx as context is unused

    // Validate input rigorously using Zod
    const inputParseResult = RenderDiagramInputSchema.safeParse({
        diagramCode: args.diagramCode,
        format: args.format // Zod applies default if undefined
    });
    if (!inputParseResult.success) {
      console.error("Input validation failed:", inputParseResult.error.format());
      const errorMessages = inputParseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`Invalid input for diagram rendering: ${errorMessages}`);
    }

    const { diagramCode, format } = inputParseResult.data;
    console.log(`Starting diagram rendering for format: ${format}`);

    // Extract code *within* the mermaid block if present
    let mermaidCode = diagramCode;
    const match = diagramCode.match(/```mermaid\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        mermaidCode = match[1].trim();
        console.log("Extracted Mermaid code from block.");
    } else {
        console.warn("Input diagram code was not wrapped in ```mermaid ... ```, using raw input.");
        // Decide if you want to proceed or throw an error if wrapping is mandatory
        // throw new Error("Diagram code must be wrapped in ```mermaid ... ```");
    }

    if (mermaidCode.length === 0) {
        throw new Error("Extracted Mermaid code is empty.");
    }

    // Access rendering service API details
    const renderingServiceUrl = process.env.MERMAID_RENDERING_SERVICE_URL || "[https://kroki.io](https://kroki.io)"; // Default to Kroki
    console.log(`Using rendering service: ${renderingServiceUrl}`);

    try {
      // Prepare request to external rendering service (e.g., Kroki)
      const targetUrl = `${renderingServiceUrl}/mermaid/${format}`;
      console.log(`Sending code to: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain", // Send raw Mermaid code
          "Accept": `image/${format}`,    // Indicate desired response type
        },
        body: mermaidCode, // Send only the code inside the block
        timeout: 15000, // 15 second timeout
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Rendering service returned status ${response.status}: ${response.statusText}`);
        console.error(`Rendering service error body: ${errorBody}`);
        throw new Error(`Failed to render diagram: Service returned status ${response.status}. ${errorBody.slice(0, 200)}`);
      }

      // Convert response (image) to buffer then base64
      const buffer = await response.buffer();
      const base64Output = buffer.toString("base64");

      // Construct the data URI
      const output = `data:image/${format};base64,${base64Output}`;

      // Validate output using Zod schema
      const outputParseResult = RenderDiagramOutputSchema.safeParse(output);
      if (!outputParseResult.success) {
        console.error("Output validation failed:", outputParseResult.error.format());
        const errorMessages = outputParseResult.error.errors.map(e => e.message).join('; ');
        // Don't throw here if the image *was* generated, maybe just log warning
        console.warn(`Generated image data URI failed strict validation: ${errorMessages}`);
        // return output; // Return potentially valid but non-schema-compliant URI? Or throw?
        throw new Error(`Invalid diagram output format: ${errorMessages}`); // Throwing for stricter control
      }

      console.log(`Successfully rendered diagram in ${format} format (Output length: ${output.length})`);
      return outputParseResult.data; // Return validated data URI string

    } catch (error) {
      console.error("Error rendering diagram:", error);
      throw new Error(`Failed to render diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});