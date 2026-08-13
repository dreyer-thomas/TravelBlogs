import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom's `Blob` implements only `slice`/`size`/`type` and omits the
// `arrayBuffer()`/`text()`/`bytes()` readers that browsers have shipped since 2019.
// Under Node 20 this stayed hidden because `Response.blob()` returned undici's own
// `Blob`, which carries those readers; from Node 24 on it returns the jsdom `Blob`,
// so component code doing `await (await fetch(url)).blob()).arrayBuffer()` throws in
// tests while working fine in a real browser. Shim the missing readers so the test
// DOM matches browser behavior instead of weakening the tests that rely on them.
const blobPrototype = typeof Blob === "undefined" ? undefined : Blob.prototype;

if (blobPrototype && typeof blobPrototype.arrayBuffer !== "function") {
  const readAsArrayBuffer = (blob: Blob) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });

  Object.defineProperties(blobPrototype, {
    arrayBuffer: {
      configurable: true,
      writable: true,
      value: function arrayBuffer(this: Blob) {
        return readAsArrayBuffer(this);
      },
    },
    bytes: {
      configurable: true,
      writable: true,
      value: async function bytes(this: Blob) {
        return new Uint8Array(await readAsArrayBuffer(this));
      },
    },
    text: {
      configurable: true,
      writable: true,
      value: async function text(this: Blob) {
        return new TextDecoder().decode(await readAsArrayBuffer(this));
      },
    },
  });
}

afterEach(() => {
  cleanup();
});
