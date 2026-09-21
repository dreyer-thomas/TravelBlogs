// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { render } from "@testing-library/react";

import ViewBeacon from "../../src/components/trips/view-beacon";

describe("ViewBeacon", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const stubFetch = () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { counted: true }, error: null }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("posts exactly one trip beacon per mount", () => {
    const fetchMock = stubFetch();

    render(<ViewBeacon token="abc123" />);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/trips/share/abc123/view");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(init.body)).toEqual({});
  });

  it("includes the entry id when one is given", () => {
    const fetchMock = stubFetch();

    render(<ViewBeacon token="abc123" entryId="entry-1" />);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      entryId: "entry-1",
    });
  });

  it("posts only once under React Strict Mode's double effect", () => {
    const fetchMock = stubFetch();

    render(
      <StrictMode>
        <ViewBeacon token="abc123" />
      </StrictMode>,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not post twice when the effect runs again on re-render", () => {
    const fetchMock = stubFetch();

    const { rerender } = render(<ViewBeacon token="abc123" />);
    rerender(<ViewBeacon token="abc123" />);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("touches no cookie, localStorage or sessionStorage", () => {
    stubFetch();

    const localSet = vi.spyOn(Storage.prototype, "setItem");
    const cookieSetter = vi.fn();
    const originalCookie = Object.getOwnPropertyDescriptor(
      Document.prototype,
      "cookie",
    );
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: cookieSetter,
    });

    try {
      render(<ViewBeacon token="abc123" entryId="entry-1" />);

      expect(localSet).not.toHaveBeenCalled();
      expect(cookieSetter).not.toHaveBeenCalled();
    } finally {
      // Restored in a finally so a failed expectation above does not leave
      // cookie access stubbed for every test that follows in this file.
      delete (document as unknown as { cookie?: unknown }).cookie;
      if (originalCookie) {
        Object.defineProperty(Document.prototype, "cookie", originalCookie);
      }
    }
  });

  it("swallows network errors", async () => {
    const rejection = Promise.reject(new Error("offline"));
    const fetchMock = vi.fn().mockReturnValue(rejection);
    vi.stubGlobal("fetch", fetchMock);
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    try {
      expect(() => render(<ViewBeacon token="abc123" />)).not.toThrow();

      // Flush the microtask queue so the component's `.catch()` has actually
      // run; without it this assertion would pass even if the catch were
      // deleted, which is the bug this test is meant to guard.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("posts again when the reader navigates to another entry", () => {
    stubFetch();

    // Prev/next links move between two `[entryId]` pages in the same route
    // segment, where the App Router reuses this component instance instead of
    // remounting it. Each entry must still be counted.
    const { rerender } = render(<ViewBeacon token="abc123" entryId="entry-1" />);
    rerender(<ViewBeacon token="abc123" entryId="entry-2" />);

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;

    expect(calls).toHaveLength(2);
    expect(JSON.parse(String((calls[0][1] as RequestInit).body))).toEqual({
      entryId: "entry-1",
    });
    expect(JSON.parse(String((calls[1][1] as RequestInit).body))).toEqual({
      entryId: "entry-2",
    });
  });
});
