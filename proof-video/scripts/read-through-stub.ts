// Stands in for the upstream services the backend calls: reads pass through to a real environment,
// writes are answered here, so a demo can click real buttons without changing shared data.
// usage: bun --env-file=<backend env with the real upstream URLs and credentials> read-through-stub.ts
// then start the backend with each upstream URL pointed at http://localhost:<port> below.
type Upstream = { port: number; url?: string; user?: string; pass?: string };
const env = process.env;
// Edit for your stack: one port per upstream, with the env vars that hold its real URL and Basic-auth login.
const UPSTREAMS: Upstream[] = [
  { port: 4010, url: env.UPSTREAM_A_URL, user: env.UPSTREAM_A_USER, pass: env.UPSTREAM_A_PASS },
  { port: 4011, url: env.UPSTREAM_B_URL, user: env.UPSTREAM_B_USER, pass: env.UPSTREAM_B_PASS },
];
// POSTs that only read (search and query endpoints) still pass through.
const READ_POSTS = new Set<string>(["/search", "/query"]);
// Writes get this answer; return whatever shape the caller parses.
const answerWrite = (_request: Request, _path: string) => Response.json({ ok: true });
// Synthesise reads the screen needs when the real environment has no matching record (e.g. rows for local ids).
const synthesise: Record<string, (search: URLSearchParams) => Response> = {};

for (const { port, url, user, pass } of UPSTREAMS) {
  Bun.serve({
    port,
    idleTimeout: 60,
    async fetch(request) {
      const { pathname, search, searchParams } = new URL(request.url);
      const body = request.method === "GET" ? undefined : await request.arrayBuffer();
      console.log(`:${port} ${request.method} ${pathname}${search}`);
      if (synthesise[pathname]) return synthesise[pathname](searchParams);
      if (request.method !== "GET" && !READ_POSTS.has(pathname)) {
        console.log(`  -> answered locally (write, ${body?.byteLength ?? 0} B)`);
        return answerWrite(request, pathname);
      }
      const headers = new Headers(request.headers);
      if (user) headers.set("authorization", `Basic ${btoa(`${user}:${pass ?? ""}`)}`);
      headers.delete("host");
      return fetch(`${url}${pathname}${search}`, { method: request.method, headers, body });
    },
  });
}
console.log(`read-through stub on ${UPSTREAMS.map((u) => `:${u.port}`).join(" ")}`);
