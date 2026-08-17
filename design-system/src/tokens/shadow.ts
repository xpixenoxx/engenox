// design-system/src/tokens/shadow.ts
// Flat-leaning elevation — border-delimited, not shadow-delimited

export const shadowTokens = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.06)',
  // Focus ring (border + shadow combined via box-shadow)
  focus: '0 0 0 2px var(--color-border-focus)',
  // Provenance hover — lifts with shadow-md
  provenance: '0 4px 12px 0 rgb(0 0 0 / 0.08)',
  // Modal overlay
  modal: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
} as const;

export type ShadowTokens = typeof shadowTokens;

// Semantic shadow aliases
export const semanticShadow = {
  panel: 'none',           // Panels use borders, not shadows
  card: 'none',            // Cards use borders
  hover: 'sm',             // Subtle lift on hover
  provenance: 'provenance', // Provenance hover lift
  dropdown: 'lg',          // Dropdowns, popovers
  modal: 'modal',          // Modal backdrop + panel
  toast: 'lg',             // Toast
  focus: 'focus',          // Focus ring
} as const;

export type SemanticShadow = typeof semanticShadow;