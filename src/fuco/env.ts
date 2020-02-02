export const isBrowser = typeof window !== "undefined";

export const supportsAdoptedStyleSheets =
  isBrowser &&
  "adoptedStyleSheets" in Document.prototype &&
  "replace" in CSSStyleSheet.prototype;

export const supportsMessageChannel = isBrowser && "MessageChannel" in window;
