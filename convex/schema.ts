// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values"; // v helps define data types

export default defineSchema({
  // Define the 'reports' table
  reports: defineTable({
    // Store the Clerk userId to link the report to the user
    // This ID comes from Clerk via the authentication context.
    userId: v.string(),

    // The user's query that generated this report
    query: v.string(),

    // The content of the generated report
    response: v.string(),

    // Optional: Add other fields if needed
    // title: v.optional(v.string()),
    // status: v.optional(v.union(v.literal("processing"), v.literal("complete"))),

  })
  // IMPORTANT: Define an index on the 'userId' field.
  // This makes fetching reports *for a specific user* very fast.
  // The name "by_user" is conventional but can be anything descriptive.
  .index("by_user", ["userId"]),

  // You generally don't need a separate 'users' table if Clerk
  // holds all the user profile info you need. Only add one if you
  // need to store app-specific user data not in Clerk.
});