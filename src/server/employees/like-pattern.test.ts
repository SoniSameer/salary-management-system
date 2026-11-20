import { describe, expect, it } from "vitest";
import { escapeLikePattern } from "./like-pattern";

describe("escapeLikePattern", () => {
  it("leaves ordinary text alone", () => {
    expect(escapeLikePattern("Ada Lovelace")).toBe("Ada Lovelace");
  });

  it("escapes the percent wildcard", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
  });

  it("escapes the underscore wildcard", () => {
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });

  it("escapes the escape character itself first, so it is not doubled up", () => {
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
    expect(escapeLikePattern("\\%")).toBe("\\\\\\%");
  });

  it("escapes every occurrence", () => {
    expect(escapeLikePattern("%_%_")).toBe("\\%\\_\\%\\_");
  });
});
