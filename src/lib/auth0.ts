import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
    scope: "openid profile email",
  },
  // O padrao do SDK e 5s. Em WSL a resolucao DNS do tenant chega a levar 5s
  // sozinha, o que abortava discovery e troca de codigo no /auth/callback.
  httpTimeout: 15000,
  // O access token nunca chega ao browser: a listagem e a criacao de contas
  // acontecem em Server Components e Server Actions.
  enableAccessTokenEndpoint: false,
});
