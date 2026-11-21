import { env } from "cloudflare:workers";
import { renderPage } from "vike/server";
import type { Server } from "vike/types";
import { createEdgeHandler } from "./src/edge";

// Vike renders the page; the Worker answers the rest of the requests itself.
async function render(request: Request): Promise<Response> {
  const { httpResponse } = await renderPage({
    urlOriginal: request.url,
    headersOriginal: Object.fromEntries(request.headers),
  });
  if (!httpResponse) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  return new Response(httpResponse.getReadableWebStream(), {
    status: httpResponse.statusCode,
    headers: httpResponse.headers,
  });
}

export default {
  fetch: createEdgeHandler({
    assets: (request) => env.ASSETS.fetch(request),
    render,
  }),
} satisfies Server;
