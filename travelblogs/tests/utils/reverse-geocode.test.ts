import { afterEach, describe, expect, it, vi } from "vitest";
import { reverseGeocode } from "../../src/utils/reverse-geocode";

const createResponse = (ok: boolean, data: unknown) => ({
  ok,
  json: async () => data,
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("reverseGeocode", () => {
  it("returns an uppercased country code when available", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createResponse(true, { address: { country_code: "us" } }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const promise = reverseGeocode(40.7128, -74.006);

    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toBe("US");
  });

  it("sets the required User-Agent header", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createResponse(true, { address: { country_code: "de" } }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const promise = reverseGeocode(52.52, 13.405);
    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    const [, options] = fetchMock.mock.calls[0] ?? [];
    expect(options?.headers).toEqual({ "User-Agent": "TravelBlogs/1.0" });
  });

  it("returns null when the API response is not ok", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(createResponse(false, {}));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const promise = reverseGeocode(35.6762, 139.6503);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("returns null when the response has no country code", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(createResponse(true, { address: {} }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const promise = reverseGeocode(0, 0);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toBeNull();
  });

  it("waits at least one second before requesting", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createResponse(true, { address: { country_code: "jp" } }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const promise = reverseGeocode(35.6762, 139.6503);

    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await promise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
