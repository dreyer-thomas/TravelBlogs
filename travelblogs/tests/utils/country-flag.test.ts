import { describe, expect, it } from "vitest";

import { countryCodeToFlag, countryCodeToName } from "../../src/utils/country-flag";

const buildFlag = (...codePoints: number[]) =>
  String.fromCodePoint(...codePoints);

describe("countryCodeToFlag", () => {
  it("returns a flag for valid country codes", () => {
    expect(countryCodeToFlag("US")).toBe(buildFlag(0x1f1fa, 0x1f1f8));
    expect(countryCodeToFlag("de")).toBe(buildFlag(0x1f1e9, 0x1f1ea));
    expect(countryCodeToFlag(" jp ")).toBe(buildFlag(0x1f1ef, 0x1f1f5));
  });

  it("returns null for invalid or empty inputs", () => {
    expect(countryCodeToFlag("")).toBeNull();
    expect(countryCodeToFlag("U")).toBeNull();
    expect(countryCodeToFlag("USA")).toBeNull();
    expect(countryCodeToFlag("1A")).toBeNull();
    expect(countryCodeToFlag("u$")).toBeNull();
    expect(countryCodeToFlag("  ")).toBeNull();
  });
});

describe("countryCodeToName", () => {
  it("returns a localized name for valid country codes", () => {
    const enName = countryCodeToName("US", "en");
    const deName = countryCodeToName("DE", "de");

    expect(typeof enName).toBe("string");
    expect(enName && enName.length > 0).toBe(true);
    expect(typeof deName).toBe("string");
    expect(deName && deName.length > 0).toBe(true);
  });

  it("returns null for invalid country codes", () => {
    expect(countryCodeToName("", "en")).toBeNull();
    expect(countryCodeToName("U", "en")).toBeNull();
    expect(countryCodeToName("USA", "en")).toBeNull();
    expect(countryCodeToName("1A", "en")).toBeNull();
  });
});
