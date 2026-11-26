import dns from "node:dns";
import https from "node:https";
import http from "node:http";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

/**
 * Resilient HTTP client for Liate Layer [L].
 * Falls back to public DNS (8.8.8.8) with TLS SNI when local ISP DNS fails on branch hosts.
 */
export async function resilientFetch(urlStr: string, options: any = {}): Promise<any> {
  try {
    return await fetch(urlStr, options);
  } catch (err: any) {
    if (err.message?.includes("ENOTFOUND") || err.code === "ENOTFOUND") {
      try {
        const u = new URL(urlStr);
        const ips = await dns.promises.resolve4(u.hostname);
        if (ips && ips.length > 0) {
          return await new Promise((resolve, reject) => {
            const isHttps = u.protocol === "https:";
            const transport = isHttps ? https : http;
            const port = u.port || (isHttps ? 443 : 80);

            const req = transport.request({
              host: ips[0],
              servername: u.hostname,
              port,
              path: `${u.pathname}${u.search}`,
              method: options.method || "GET",
              headers: {
                ...(options.headers || {}),
                Host: u.hostname
              }
            }, (res) => {
              let data = "";
              res.on("data", (chunk) => data += chunk);
              res.on("end", () => {
                resolve({
                  ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
                  status: res.statusCode || 200,
                  statusText: res.statusMessage || "",
                  headers: {
                    get: (name: string) => {
                      const val = res.headers[name.toLowerCase()];
                      return Array.isArray(val) ? val.join(", ") : (val ?? null);
                    }
                  },
                  text: async () => data,
                  json: async () => JSON.parse(data)
                });
              });
            });

            req.on("error", reject);
            if (options.body) {
              req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
            }
            req.end();
          });
        }
      } catch {}
    }
    throw err;
  }
}
