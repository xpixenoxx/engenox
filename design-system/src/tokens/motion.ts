// design-system/src/tokens/motion.ts
// Tokenized motion — no vanity, no count-ups, reduced-motion compliant

export const motionTokens = {
  duration: {
    instant: '0ms',
    fast: '120ms',
    normal: '200ms',
    slow: '320ms',
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',  // ease-out-cubic
    in: 'cubic-bezier(0.4, 0, 1, 1)',          // ease-in
    out: 'cubic-bezier(0, 0, 0.2, 1)',         // ease-out
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',     // quick transitions
  },
  // Reduced motion: durations collapse to near-zero
  reducedMotion: {
    durationMultiplier: 0.01,
    easing: 'linear',
  },
} as const;

export type MotionTokens = typeof motionTokens;

// Semantic motion aliases
export const semanticMotion = {
  // Panel expand/collapse, accordion
  panel: { duration: 'normal', easing: 'standard' },
  // Chips resolving, badges appearing
  chip: { duration: 'fast', easing: 'out' },
  // Hover lifts, provenance hover
  lift: { duration: 'fast', easing: 'out' },
  // Modal/dialog
  modal: { duration: 'normal', easing: 'standard' },
  // Toast appear/dismiss
  toast: { duration: 'fast', easing: 'out' },
  // Provenance hover expand
  provenance: { duration: 'fast', easing: 'out' },
  // SSE fill animations (probe partials streaming in)
  sseFill: { duration: 'normal', easing: 'standard' },
} as const;

export type SemanticMotion = typeof semanticMotion;