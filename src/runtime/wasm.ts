/**
 * Liate — WebAssembly / Edge Fetch Runtime Entrypoint
 *
 * Native Web Standards: Request, Response, Fetch API (Fastly Compute WASM / Workers).
 */
import { app } from "@/runtime/hono";

declare const addEventListener: (type: string, handler: (event: any) => void) => void;

if (typeof addEventListener !== "undefined") {
  try {
    addEventListener("fetch", (event: any) => {
      event.respondWith(app.fetch(event.request));
    });
  } catch {}
}

export default {
  fetch(request: Request, env?: any, ctx?: any) {
    return app.fetch(request, env, ctx);
  },
};

