// design-system/src/tokens/spacing.ts
// 4px base scale — no magic numbers

export const spacingTokens = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  7: '1.75rem',   // 28px
  8: '2rem',      // 32px
  9: '2.25rem',   // 36px
  10: '2.5rem',   // 40px
  11: '2.75rem',  // 44px
  12: '3rem',     // 48px
  13: '3.25rem',  // 52px
  14: '3.5rem',   // 56px
  15: '3.75rem',  // 60px
  16: '4rem',     // 64px
  18: '4.5rem',   // 72px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  28: '7rem',     // 112px
  32: '8rem',     // 128px
} as const;

export type SpacingTokens = typeof spacingTokens;

// Semantic spacing aliases (prefer these in components)
export const semanticSpacing = {
  // Inset / padding
  inset: {
    none: '0',
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
  },
  // Stack / gap
  stack: {
    none: '0',
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
  },
  // Inline gap
  inline: {
    none: '0',
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
  },
  // Section spacing (pages, major sections)
  section: {
    sm: '2rem',       // 32px
    md: '3rem',       // 48px
    lg: '4rem',       // 64px
    xl: '6rem',       // 96px
  },
} as const;

export type SemanticSpacing = typeof semanticSpacing;