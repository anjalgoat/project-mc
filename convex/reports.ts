// convex/reports.ts
import { query, mutation } from "./_generated/server"; // Import query/mutation builders
import { v } from "convex/values"; // Import validators

// --- Mutation to Create a New Report ---
// Mutations are used for functions that modify data.
export const createReport = mutation({
  // Define the arguments this mutation expects from the client (frontend)
  args: {
    query: v.string(),
    response: v.string(),
    // Add other arguments if you added fields to the schema
    // title: v.optional(v.string()),
  },
  // The handler function contains the logic that runs on the Convex backend
  handler: async (ctx, args) => {
    // 1. Get the identity of the user making the request.
    //    Convex automatically verifies the Clerk token passed from the frontend.
    const identity = await ctx.auth.getUserIdentity();

    // 2. Check if the user is actually logged in.
    if (!identity) {
      // If not authenticated, throw an error. The frontend should handle this.
      throw new Error("User must be logged in to create a report.");
    }

    // 3. Extract the Clerk userId (subject identifier) from the identity.
    //    This is the crucial link between the report and the Clerk user.
    const userId = identity.subject; // 'subject' usually holds the Clerk User ID

    // 4. Insert the new report document into the 'reports' table in the database.
    //    `ctx.db` provides access to the database.
    const newReportId = await ctx.db.insert("reports", {
      userId: userId, // Associate report with the logged-in user
      query: args.query,
      response: args.response,
      // Include other fields from args if needed
      // title: args.title,
    });

    // 5. Optionally, return the unique ID (_id) of the newly created report.
    return newReportId;
  },
});

// --- Query to Get Reports for the Current User ---
// Queries are used for functions that only read data.
export const getMyReports = query({
  // This query doesn't need arguments from the client, as the user
  // is determined automatically from the authentication context.
  args: {},
  handler: async (ctx) => {
    // 1. Get the user's identity, same as in the mutation.
    const identity = await ctx.auth.getUserIdentity();

    // 2. If the user isn't logged in, we can't fetch their reports.
    //    Returning an empty array is often better for UI lists than throwing an error.
    if (!identity) {
      return [];
    }

    // 3. Get the Clerk userId.
    const userId = identity.subject;

    // 4. Query the 'reports' table.
    const userReports = await ctx.db
      // Start query on the 'reports' table
      .query("reports")
      // Use the index we defined in schema.ts for efficiency.
      // Filter reports where the 'userId' field matches the current user's ID.
      .withIndex("by_user", (q) => q.eq("userId", userId))
      // Optional: Order the results. '.order("desc")' sorts by '_creationTime' descending (newest first).
      .order("desc")
      // Execute the query and retrieve the results as an array.
      .collect();

    // 5. Return the array of report documents.
    return userReports;
  },
});