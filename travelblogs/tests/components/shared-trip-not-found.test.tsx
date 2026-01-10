// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import SharedTripNotFound from "../../src/app/trips/share/[token]/not-found";
import SharedEntryNotFound from "../../src/app/trips/share/[token]/entries/[entryId]/not-found";
import { LocaleProvider } from "../../src/utils/locale-context";

const message = "This share link is no longer valid.";

describe("shared trip not-found pages", () => {
  it("renders the revoked share message for trip overview", () => {
    render(
      <LocaleProvider>
        <SharedTripNotFound />
      </LocaleProvider>
    );

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("renders the revoked share message for entry view", () => {
    render(
      <LocaleProvider>
        <SharedEntryNotFound />
      </LocaleProvider>
    );

    expect(screen.getByText(message)).toBeInTheDocument();
  });
});
