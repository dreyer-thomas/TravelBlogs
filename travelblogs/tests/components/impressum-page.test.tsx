// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import ImpressumContent from "../../src/components/legal/impressum-content";
import type { SiteOperator } from "../../src/utils/site-operator";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const configuredOperator: SiteOperator = {
  name: "Kontron Travel Stories",
  legalForm: null,
  representative: null,
  street: "Musterweg 7",
  postalCode: "01234",
  city: "Musterstadt",
  country: "Germany",
  email: "operator@example.invalid",
  phone: "+49 351 0000000",
  register: null,
  vatId: null,
  contentResponsible: "Alex Muster",
  contentResponsibleAddress: null,
};

const emptyOperator: SiteOperator = {
  name: null,
  legalForm: null,
  representative: null,
  street: null,
  postalCode: null,
  city: null,
  country: null,
  email: null,
  phone: null,
  register: null,
  vatId: null,
  contentResponsible: null,
  contentResponsibleAddress: null,
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ImpressumContent", () => {
  it("renders the configured operator values in English", () => {
    render(<ImpressumContent operator={configuredOperator} locale="en" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Legal Notice" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Kontron Travel Stories")).toBeInTheDocument();
    expect(screen.getByText("Musterweg 7")).toBeInTheDocument();
    expect(screen.getByText("01234 Musterstadt")).toBeInTheDocument();
    expect(screen.getByText("Germany")).toBeInTheDocument();
    expect(screen.getByText("Alex Muster")).toBeInTheDocument();
    expect(screen.getByText("+49 351 0000000")).toBeInTheDocument();

    const mail = screen.getByRole("link", { name: "operator@example.invalid" });
    expect(mail).toHaveAttribute("href", "mailto:operator@example.invalid");
  });

  it("renders headings and labels from the German catalog", () => {
    render(<ImpressumContent operator={configuredOperator} locale="de" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Impressum" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Anbieter")).toBeInTheDocument();
    expect(screen.getByText("Kontakt")).toBeInTheDocument();
    expect(screen.getByText("Verantwortlich für den Inhalt")).toBeInTheDocument();
    expect(screen.getByText("E-Mail")).toBeInTheDocument();
    expect(screen.getByText("Telefon")).toBeInTheDocument();
  });

  it("renders an explicit not-configured state with no invented data", () => {
    const { container } = render(
      <ImpressumContent operator={emptyOperator} locale="en" />,
    );

    expect(
      screen.getByText("Operator details are not configured"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/has not entered their details yet/i),
    ).toBeInTheDocument();

    // No placeholder name, address, phone number or email may ship.
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.textContent).not.toMatch(/@/);
    expect(container.textContent).not.toMatch(/\d{4,}/);
    expect(container.textContent).not.toMatch(
      /example|muster|placeholder|lorem|str(a|aß)e \d/i,
    );
  });

  it("renders the German not-configured state", () => {
    render(<ImpressumContent operator={emptyOperator} locale="de" />);

    expect(
      screen.getByText("Betreiberangaben sind nicht hinterlegt"),
    ).toBeInTheDocument();
  });

  it("omits optional fields that are not set", () => {
    render(
      <ImpressumContent
        operator={{
          ...configuredOperator,
          country: null,
          phone: null,
          contentResponsible: null,
        }}
        locale="en"
      />,
    );

    expect(screen.queryByText("Phone")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Responsible for the content"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Kontron Travel Stories")).toBeInTheDocument();
  });

  it("renders the company fields only when they are set", () => {
    render(
      <ImpressumContent
        operator={{
          ...configuredOperator,
          legalForm: "GmbH",
          representative: "Alex Muster",
          register: "Amtsgericht Dresden HRB 00000",
          vatId: "DE000000000",
          contentResponsibleAddress: "Musterweg 7, 01234 Musterstadt",
        }}
        locale="en"
      />,
    );

    expect(screen.getByText("GmbH")).toBeInTheDocument();
    expect(screen.getByText("Authorized representative")).toBeInTheDocument();
    expect(screen.getByText("Register entry")).toBeInTheDocument();
    expect(
      screen.getByText("VAT identification number"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Musterweg 7, 01234 Musterstadt"),
    ).toBeInTheDocument();
  });

  it("omits the company fields on the private-individual default", () => {
    render(<ImpressumContent operator={configuredOperator} locale="en" />);

    expect(
      screen.queryByText("Authorized representative"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Register entry")).not.toBeInTheDocument();
    expect(
      screen.queryByText("VAT identification number"),
    ).not.toBeInTheDocument();
  });

  it("leaks no partial data when a required field is missing", () => {
    const { container } = render(
      <ImpressumContent
        operator={{ ...configuredOperator, email: null }}
        locale="en"
      />,
    );

    expect(
      screen.getByText("Operator details are not configured"),
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain("Kontron Travel Stories");
    expect(container.textContent).not.toContain("Musterweg 7");
    expect(container.querySelector("dl")).toBeNull();
  });

  it("shows the not-configured state for a non-address email value", () => {
    const { container } = render(
      <ImpressumContent
        operator={{ ...configuredOperator, email: "tbd" }}
        locale="en"
      />,
    );

    expect(
      screen.getByText("Operator details are not configured"),
    ).toBeInTheDocument();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it("makes no external requests and renders no view beacon", () => {
    const { container } = render(
      <ImpressumContent operator={configuredOperator} locale="en" />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    const externalLinks = Array.from(container.querySelectorAll("a")).filter(
      (anchor) => /^https?:/i.test(anchor.getAttribute("href") ?? ""),
    );
    expect(externalLinks).toHaveLength(0);
  });
});

describe("/impressum page", () => {
  const loadPage = async (acceptLanguage: string | null) => {
    vi.resetModules();
    vi.doMock("next/headers", () => ({
      headers: async () => new Headers(
        acceptLanguage ? { "accept-language": acceptLanguage } : {},
      ),
    }));
    const mod = await import("../../src/app/impressum/page");
    return mod.default;
  };

  it("reads the operator details from the environment", async () => {
    vi.stubEnv("SITE_OPERATOR_NAME", "Kontron Travel Stories");
    vi.stubEnv("SITE_OPERATOR_STREET", "Musterweg 7");
    vi.stubEnv("SITE_OPERATOR_POSTAL_CODE", "01234");
    vi.stubEnv("SITE_OPERATOR_CITY", "Musterstadt");
    vi.stubEnv("SITE_OPERATOR_EMAIL", "operator@example.invalid");

    const Page = await loadPage("en-US,en;q=0.9");
    render(await Page());

    expect(screen.getByText("Kontron Travel Stories")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Legal Notice" }),
    ).toBeInTheDocument();
  });

  it("picks the locale from the accept-language header", async () => {
    vi.stubEnv("SITE_OPERATOR_NAME", "");
    vi.stubEnv("SITE_OPERATOR_STREET", "");
    vi.stubEnv("SITE_OPERATOR_POSTAL_CODE", "");
    vi.stubEnv("SITE_OPERATOR_CITY", "");
    vi.stubEnv("SITE_OPERATOR_EMAIL", "");

    const Page = await loadPage("de-DE,de;q=0.9");
    render(await Page());

    expect(
      screen.getByRole("heading", { level: 1, name: "Impressum" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Betreiberangaben sind nicht hinterlegt"),
    ).toBeInTheDocument();
  });
});
