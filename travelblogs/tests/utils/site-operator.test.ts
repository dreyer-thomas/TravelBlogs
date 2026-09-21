import { describe, expect, it } from "vitest";

import {
  isSiteOperatorConfigured,
  isValidOperatorEmail,
  readSiteOperator,
  type SiteOperator,
} from "../../src/utils/site-operator";

const fullEnv = {
  SITE_OPERATOR_NAME: "Example Operator",
  SITE_OPERATOR_STREET: "Example Street 1",
  SITE_OPERATOR_POSTAL_CODE: "12345",
  SITE_OPERATOR_CITY: "Example City",
  SITE_OPERATOR_COUNTRY: "Germany",
  SITE_OPERATOR_EMAIL: "operator@example.com",
  SITE_OPERATOR_PHONE: "+49 123 456789",
  SITE_OPERATOR_LEGAL_FORM: "GmbH",
  SITE_OPERATOR_REPRESENTATIVE: "Example Representative",
  SITE_OPERATOR_REGISTER: "Amtsgericht Example HRB 12345",
  SITE_OPERATOR_VAT_ID: "DE123456789",
  SITE_OPERATOR_CONTENT_RESPONSIBLE: "Example Person",
  SITE_OPERATOR_CONTENT_RESPONSIBLE_ADDRESS: "Example Street 1, 12345 Example City",
};

describe("readSiteOperator", () => {
  it("reads every field from the environment", () => {
    expect(readSiteOperator(fullEnv)).toEqual<SiteOperator>({
      name: "Example Operator",
      legalForm: "GmbH",
      representative: "Example Representative",
      street: "Example Street 1",
      postalCode: "12345",
      city: "Example City",
      country: "Germany",
      email: "operator@example.com",
      phone: "+49 123 456789",
      register: "Amtsgericht Example HRB 12345",
      vatId: "DE123456789",
      contentResponsible: "Example Person",
      contentResponsibleAddress: "Example Street 1, 12345 Example City",
    });
  });

  it("trims surrounding whitespace", () => {
    const operator = readSiteOperator({
      ...fullEnv,
      SITE_OPERATOR_NAME: "  Example Operator  ",
    });
    expect(operator.name).toBe("Example Operator");
  });

  it("maps missing and blank values to null instead of inventing defaults", () => {
    const operator = readSiteOperator({
      SITE_OPERATOR_NAME: "",
      SITE_OPERATOR_PHONE: "   ",
    });

    expect(operator).toEqual<SiteOperator>({
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
    });
  });

  it("defaults to process.env when no environment is provided", () => {
    process.env.SITE_OPERATOR_NAME = "From process.env";
    try {
      expect(readSiteOperator().name).toBe("From process.env");
    } finally {
      delete process.env.SITE_OPERATOR_NAME;
    }
    expect(readSiteOperator().name).toBeNull();
  });
});

describe("isSiteOperatorConfigured", () => {
  it("is configured when all required fields are present", () => {
    expect(isSiteOperatorConfigured(readSiteOperator(fullEnv))).toBe(true);
  });

  it("is configured without the optional fields", () => {
    const operator = readSiteOperator({
      ...fullEnv,
      SITE_OPERATOR_COUNTRY: "",
      SITE_OPERATOR_PHONE: "",
      SITE_OPERATOR_CONTENT_RESPONSIBLE: "",
    });
    expect(isSiteOperatorConfigured(operator)).toBe(true);
  });

  it.each([
    "SITE_OPERATOR_NAME",
    "SITE_OPERATOR_STREET",
    "SITE_OPERATOR_POSTAL_CODE",
    "SITE_OPERATOR_CITY",
    "SITE_OPERATOR_EMAIL",
  ])("is not configured when %s is missing", (missingKey) => {
    const env = { ...fullEnv, [missingKey]: "" };
    expect(isSiteOperatorConfigured(readSiteOperator(env))).toBe(false);
  });

  it("is not configured when nothing is set", () => {
    expect(isSiteOperatorConfigured(readSiteOperator({}))).toBe(false);
  });
});

describe("isValidOperatorEmail", () => {
  it.each([
    "operator@example.com",
    "first.last+tag@sub.example.co.uk",
  ])("accepts %s", (email) => {
    expect(isValidOperatorEmail(email)).toBe(true);
  });

  it.each([
    ["null", null],
    ["a bare word", "tbd"],
    ["a value with no domain dot", "operator@example"],
    ["a value containing a space", "operator name@example.com"],
    ["a mailto header injection", "operator@example.com?subject=x&cc=y"],
    ["an address with a stray comma", "operator@example.com,other@example.com"],
  ])("rejects %s", (_label, email) => {
    expect(isValidOperatorEmail(email)).toBe(false);
  });

  it("gates isSiteOperatorConfigured so a junk address never renders a mailto", () => {
    const operator = readSiteOperator({ ...fullEnv, SITE_OPERATOR_EMAIL: "tbd" });

    expect(operator.email).toBe("tbd");
    expect(isSiteOperatorConfigured(operator)).toBe(false);
  });
});
