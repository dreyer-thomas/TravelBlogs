// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import TripsExportDashboard from "../../../src/components/admin/trips-export-dashboard";
import { LocaleProvider } from "../../../src/utils/locale-context";

describe("TripsExportDashboard", () => {
  it("shows export actions for trips", () => {
    render(
      <LocaleProvider>
        <TripsExportDashboard
          trips={[
            {
              id: "trip-1",
              title: "Everest Journey",
              startDate: "2025-05-01T00:00:00.000Z",
              endDate: "2025-05-10T00:00:00.000Z",
              ownerId: "owner-1",
              ownerName: "Owner Name",
              ownerEmail: "owner@example.com",
            },
          ]}
          showOwner
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("Everest Journey")).toBeInTheDocument();
    expect(
      screen.getByText("Owner: Owner Name (owner@example.com)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Export trip" }),
    ).toHaveAttribute("href", "/api/trips/trip-1/export");
  });

  it("shows empty state when there are no trips", () => {
    render(
      <LocaleProvider>
        <TripsExportDashboard trips={[]} showOwner={false} />
      </LocaleProvider>,
    );

    expect(
      screen.getByText("No trips available for export."),
    ).toBeInTheDocument();
  });
});
