// design-system/src/tokens/type.ts
// Modular type scale — each token binds size, line-height, tracking together

export const typeTokens = {
  // Display scale (headlines, hero numbers)
  'display-xl': {
    size: 'clamp(2.5rem, 5vw, 4rem)',     // 40px–64px
    lineHeight: '1.05',
    letterSpacing: '-0.03em',
    fontWeight: '700',
  },
  'display-lg': {
    size: 'clamp(2rem, 4vw, 3rem)',       // 32px–48px
    lineHeight: '1.1',
    letterSpacing: '-0.02em',
    fontWeight: '700',
  },
  'display-md': {
    size: 'clamp(1.75rem, 3vw, 2.25rem)', // 28px–36px
    lineHeight: '1.15',
    letterSpacing: '-0.01em',
    fontWeight: '600',
  },
  'display-sm': {
    size: 'clamp(1.5rem, 2.5vw, 1.875rem)', // 24px–30px
    lineHeight: '1.2',
    letterSpacing: '0',
    fontWeight: '600',
  },

  // Heading scale (section headers)
  'heading-xl': {
    size: '1.5rem',      // 24px
    lineHeight: '1.25',
    letterSpacing: '-0.01em',
    fontWeight: '600',
  },
  'heading-lg': {
    size: '1.25rem',     // 20px
    lineHeight: '1.3',
    letterSpacing: '0',
    fontWeight: '600',
  },
  'heading-md': {
    size: '1.125rem',    // 18px
    lineHeight: '1.35',
    letterSpacing: '0',
    fontWeight: '600',
  },
  'heading-sm': {
    size: '1rem',        // 16px
    lineHeight: '1.4',
    letterSpacing: '0',
    fontWeight: '600',
  },

  // Body scale (prose, UI text)
  'body-lg': {
    size: '1.125rem',    // 18px
    lineHeight: '1.6',
    letterSpacing: '0',
    fontWeight: '400',
  },
  'body-md': {
    size: '1rem',        // 16px
    lineHeight: '1.5',
    letterSpacing: '0',
    fontWeight: '400',
  },
  'body-sm': {
    size: '0.875rem',    // 14px
    lineHeight: '1.5',
    letterSpacing: '0',
    fontWeight: '400',
  },
  'body-xs': {
    size: '0.75rem',     // 12px
    lineHeight: '1.5',
    letterSpacing: '0',
    fontWeight: '400',
  },

  // Label scale (form labels, chip text, metadata)
  'label-lg': {
    size: '0.875rem',    // 14px
    lineHeight: '1.4',
    letterSpacing: '0.01em',
    fontWeight: '500',
  },
  'label-md': {
    size: '0.75rem',     // 12px
    lineHeight: '1.4',
    letterSpacing: '0.02em',
    fontWeight: '500',
  },
  'label-sm': {
    size: '0.625rem',    // 10px
    lineHeight: '1.4',
    letterSpacing: '0.03em',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
  },

  // Code / mono (trace IDs, event IDs, audit data)
  'code-sm': {
    size: '0.75rem',     // 12px
    lineHeight: '1.5',
    letterSpacing: '0',
    fontWeight: '400',
  },
  'code-md': {
    size: '0.875rem',    // 14px
    lineHeight: '1.5',
    letterSpacing: '0',
    fontWeight: '400',
  },

  // Numeric / tabular (lift numbers, metrics — tabular-nums)
  'numeric-lg': {
    size: '2rem',        // 32px
    lineHeight: '1.1',
    letterSpacing: '-0.01em',
    fontWeight: '700',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  'numeric-md': {
    size: '1.5rem',      // 24px
    lineHeight: '1.2',
    letterSpacing: '0',
    fontWeight: '600',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  'numeric-sm': {
    size: '1rem',        // 16px
    lineHeight: '1.3',
    letterSpacing: '0',
    fontWeight: '600',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  'numeric-xs': {
    size: '0.875rem',    // 14px
    lineHeight: '1.4',
    letterSpacing: '0',
    fontWeight: '500',
    fontVariantNumeric: 'tabular-nums' as const,
  },

  // Prose (candor explainer, contrarian block)
  prose: {
    size: '1rem',        // 16px
    lineHeight: '1.7',
    letterSpacing: '0',
    fontWeight: '400',
    maxWidth: '65ch',
  },
  'prose-sm': {
    size: '0.875rem',    // 14px
    lineHeight: '1.65',
    letterSpacing: '0',
    fontWeight: '400',
    maxWidth: '65ch',
  },
} as const;

export type TypeTokens = typeof typeTokens;

// Font families (referenced by components, not used directly as tokens)
export const fontFamilies = {
  // Primary sans — variable font for UI performance + metrics
  sans: '"Geist Variable", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  // Mono — audit provenance pointers, trace IDs
  mono: '"Geist Mono Variable", "Geist Mono", "SF Mono", "Fira Code", monospace',
  // Numeric — tabular figures for charts, metrics tables
  numeric: '"Geist Variable", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;

export type FontFamilies = typeof fontFamilies;