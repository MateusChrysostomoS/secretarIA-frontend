import { describe, it, expect, afterEach, vi } from "vitest";

import { stripQueryParamFromUrl, urlWithoutParam } from "../url-token";

describe("urlWithoutParam", () => {
  it("removes the parameter and its value", () => {
    expect(urlWithoutParam("/convite/?token=abc123", "token")).toBe("/convite/");
  });

  it("returns null when the parameter is not there, so callers can skip the rewrite", () => {
    expect(urlWithoutParam("/convite/", "token")).toBeNull();
    expect(urlWithoutParam("/convite/?outro=1", "token")).toBeNull();
  });

  it("keeps the other query parameters and the hash", () => {
    expect(
      urlWithoutParam("/esqueci_senha/atualizar_senha/?token=abc&next=%2Finicio#topo", "token"),
    ).toBe("/esqueci_senha/atualizar_senha/?next=%2Finicio#topo");
  });

  it("returns a root-relative URL when given an absolute one, so the origin is never rewritten", () => {
    expect(urlWithoutParam("https://exemplo.test/convite/?token=abc", "token")).toBe("/convite/");
  });

  it("drops an empty-valued parameter too — ?token= is still a parameter", () => {
    expect(urlWithoutParam("/convite/?token=", "token")).toBe("/convite/");
  });
});

describe("stripQueryParamFromUrl", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = originalWindow;
    vi.restoreAllMocks();
  });

  function stubWindow(href: string, state: unknown = { __NA: 1 }) {
    const replaceState = vi.fn();
    (globalThis as { window?: unknown }).window = {
      location: { href },
      history: { state, replaceState },
    };
    return replaceState;
  }

  it("rewrites the current history entry without the token", () => {
    const replaceState = stubWindow("https://exemplo.test/convite/?token=abc123");
    stripQueryParamFromUrl();
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState.mock.calls[0][2]).toBe("/convite/");
  });

  it("passes the existing history.state through instead of clobbering it with null", () => {
    // Next's App Router keeps its routing state in history.state; replacing it
    // with null breaks the browser's back button for the rest of the session.
    const state = { __NA: 1, tree: ["deep"] };
    const replaceState = stubWindow("https://exemplo.test/convite/?token=abc", state);
    stripQueryParamFromUrl();
    expect(replaceState.mock.calls[0][0]).toBe(state);
  });

  it("does nothing when there is no token to strip", () => {
    const replaceState = stubWindow("https://exemplo.test/convite/");
    stripQueryParamFromUrl();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("survives a webview that refuses replaceState", () => {
    const replaceState = stubWindow("https://exemplo.test/convite/?token=abc");
    replaceState.mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => stripQueryParamFromUrl()).not.toThrow();
  });

  it("is a no-op outside the browser, so it can sit in a module that gets prerendered", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(() => stripQueryParamFromUrl()).not.toThrow();
  });
});
