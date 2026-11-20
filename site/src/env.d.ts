/// <reference types="vite/client" />

// The bindings in wrangler.jsonc.
declare global {
  namespace Cloudflare {
    interface Env {
      ASSETS: Fetcher;
    }
  }
}

export {};
