import { describe, it, expect } from "vitest";
import { parseDateLabel } from "./dateParser.ts";

const YEAR = 2026;

describe("parseDateLabel", () => {
  describe("Early labels", () => {
    it("parses 'Early March'", () => {
      const result = parseDateLabel("Early March", YEAR);
      expect(result).toEqual({ start: "2026-03-01", end: "2026-03-10" });
    });

    it("parses 'Early April'", () => {
      const result = parseDateLabel("Early April", YEAR);
      expect(result).toEqual({ start: "2026-04-01", end: "2026-04-10" });
    });

    it("parses abbreviated month 'Early Mar'", () => {
      const result = parseDateLabel("Early Mar", YEAR);
      expect(result).toEqual({ start: "2026-03-01", end: "2026-03-10" });
    });
  });

  describe("Mid labels", () => {
    it("parses 'Mid March'", () => {
      const result = parseDateLabel("Mid March", YEAR);
      expect(result).toEqual({ start: "2026-03-11", end: "2026-03-20" });
    });

    it("parses 'Mid Feb'", () => {
      const result = parseDateLabel("Mid Feb", YEAR);
      expect(result).toEqual({ start: "2026-02-11", end: "2026-02-20" });
    });
  });

  describe("Late labels", () => {
    it("parses 'Late Feb'", () => {
      const result = parseDateLabel("Late Feb", YEAR);
      expect(result).toEqual({ start: "2026-02-20", end: "2026-02-28" });
    });

    it("parses 'Late March'", () => {
      const result = parseDateLabel("Late March", YEAR);
      expect(result).toEqual({ start: "2026-03-20", end: "2026-03-31" });
    });

    it("handles leap year for Late Feb", () => {
      const result = parseDateLabel("Late Feb", 2028);
      expect(result).toEqual({ start: "2028-02-20", end: "2028-02-29" });
    });

    it("parses 'Late April' (30-day month)", () => {
      const result = parseDateLabel("Late April", YEAR);
      expect(result).toEqual({ start: "2026-04-20", end: "2026-04-30" });
    });
  });

  describe("Specific date ranges", () => {
    it("parses 'Apr 20-27'", () => {
      const result = parseDateLabel("Apr 20-27", YEAR);
      expect(result).toEqual({ start: "2026-04-20", end: "2026-04-27" });
    });

    it("parses 'March 1-15'", () => {
      const result = parseDateLabel("March 1-15", YEAR);
      expect(result).toEqual({ start: "2026-03-01", end: "2026-03-15" });
    });

    it("returns null for invalid day range", () => {
      const result = parseDateLabel("Feb 30-31", YEAR);
      expect(result).toBeNull();
    });
  });

  describe("Compound ranges", () => {
    it("parses 'Late Feb-Early March'", () => {
      const result = parseDateLabel("Late Feb-Early March", YEAR);
      expect(result).toEqual({ start: "2026-02-20", end: "2026-03-10" });
    });

    it("parses 'Early March-Mid April'", () => {
      const result = parseDateLabel("Early March-Mid April", YEAR);
      expect(result).toEqual({ start: "2026-03-01", end: "2026-04-20" });
    });

    it("parses with extra spaces around hyphen", () => {
      const result = parseDateLabel("Late Feb - Early March", YEAR);
      expect(result).toEqual({ start: "2026-02-20", end: "2026-03-10" });
    });
  });

  describe("Edge cases", () => {
    it("returns null for empty string", () => {
      expect(parseDateLabel("", YEAR)).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      expect(parseDateLabel("   ", YEAR)).toBeNull();
    });

    it("returns null for unrecognized label", () => {
      expect(parseDateLabel("Sometime in spring", YEAR)).toBeNull();
    });

    it("returns null for invalid month name", () => {
      expect(parseDateLabel("Early Smarch", YEAR)).toBeNull();
    });

    it("is case-insensitive", () => {
      const result = parseDateLabel("LATE FEB", YEAR);
      expect(result).toEqual({ start: "2026-02-20", end: "2026-02-28" });
    });

    it("trims leading/trailing whitespace", () => {
      const result = parseDateLabel("  Early March  ", YEAR);
      expect(result).toEqual({ start: "2026-03-01", end: "2026-03-10" });
    });
  });
});
