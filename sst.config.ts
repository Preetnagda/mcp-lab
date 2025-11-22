// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "mcp-lab",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    
    const secrets = {
      DATABASE_URL: new sst.Secret("DATABASE_URL","postgresql://postgres:postgres@localhost:5432/mcp_registry"), 
      NEXTAUTH_SECRET: new sst.Secret("NEXTAUTH_SECRET"),
      EMAIL_API_KEY: new sst.Secret("EMAIL_API_KEY"),
      EMAIL_FROM: new sst.Secret("EMAIL_FROM"),
    }

    const allSecrets = Object.values(secrets);

    const domainName = $app.stage == "production" ? "mcp-lab.preetnagda.com" : "localhost:3000";
    const domainProtocol = $app.stage == "production" ? "https" : "http";

    new sst.aws.Nextjs("mcp-lab", {
      link: [...allSecrets],
      environment: {
        NEXTAUTH_SECRET: secrets.NEXTAUTH_SECRET.value,
        NEXTAUTH_URL: domainProtocol + "://" + domainName,
        AUTH_TRUST_HOST: domainProtocol + "://" + domainName
      },
      domain: {
        name: domainName
      }
    });
  },
});
