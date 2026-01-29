import { describe, expect, it } from "vitest";

import { getLocaleFromAcceptLanguage } from "@/lib/locales";

describe("getLocaleFromAcceptLanguage", () => {
  it("returns the first supported locale", () => {
    expect(getLocaleFromAcceptLanguage("ru-RU,kg;q=0.8")).toBe("ru");
  });

  it("maps ky to kg", () => {
    expect(getLocaleFromAcceptLanguage("ky-KG,ru;q=0.5")).toBe("kg");
  });

  it("returns undefined when no supported locale is present", () => {
    expect(getLocaleFromAcceptLanguage("en-US,en;q=0.9")).toBeUndefined();
  });
});
