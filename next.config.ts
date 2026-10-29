import type { NextConfig } from "next";
import { SERVER_ACTION_BODY_LIMIT_BYTES } from "./src/lib/ingestions/file-validation";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // O OFX passa pela Server Action (o token nunca vai ao navegador); o padrao e 1 MB.
      bodySizeLimit: SERVER_ACTION_BODY_LIMIT_BYTES,
    },
  },
};

export default nextConfig;
