const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!, // Should use the env var
      applicationID: "convex",
    },
  ]
};
export default authConfig;