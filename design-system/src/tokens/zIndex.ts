// design-system/src/tokens/zIndex.ts

export const zIndexTokens = {
  base: 0,
  sticky: 10,
  dropdown: 100,
  tooltip: 200,
  'provenance-hover': 300,
  modal: 400,
  toast: 500,
  // WorkOS auth dialog, OAuth redirect
  auth: 600,
} as const;

export type ZIndexTokens = typeof zIndexTokens;