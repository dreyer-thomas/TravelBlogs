import { vi } from "vitest";

// `next/og`'s ImageResponse loads its yoga/resvg wasm binaries via the global
// `fetch` (as a `file://` URL). Only intercept calls to this app's own API
// routes; let those internal wasm loads fall through to the real fetch.
const realFetch = globalThis.fetch;

const toUrlString = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

export const mockAppFetch = (
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) =>
  vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = toUrlString(input);
    if (!url.includes("/api/")) {
      return realFetch(input, init);
    }
    return handler(url, init);
  });
