// design-system/src/tokens/color.ts
// Semantic color tokens — light + dark are remappings of the same semantic keys

export const colorTokens = {
  // Base surfaces
  surface: {
    light: '#ffffff',
    dark: '#0a0a0b',
  },
  'surface-muted': {
    light: '#f4f4f5',
    dark: '#18181b',
  },
  'surface-raised': {
    light: '#ffffff',
    dark: '#141416',
  },
  'surface-overlay': {
    light: 'rgba(255, 255, 255, 0.95)',
    dark: 'rgba(10, 10, 11, 0.95)',
  },

  // Text
  text: {
    light: '#09090b',
    dark: '#fafafa',
  },
  'text-muted': {
    light: '#52525b',
    dark: '#a1a1aa',
  },
  'text-subtle': {
    light: '#71717a',
    dark: '#71717a',
  },
  'text-inverse': {
    light: '#fafafa',
    dark: '#09090b',
  },

  // Borders
  border: {
    light: '#e4e4e7',
    dark: '#27272a',
  },
  'border-strong': {
    light: '#d4d4d8',
    dark: '#3f3f46',
  },
  'border-focus': {
    light: '#2563eb',
    dark: '#3b82f6',
  },

  // Brand (Engenox identity — serious, technical, grounded)
  brand: {
    light: '#1e293b',
    dark: '#e2e8f0',
  },
  'brand-muted': {
    light: '#64748b',
    dark: '#94a3b8',
  },
  'brand-subtle': {
    light: '#f1f5f9',
    dark: '#1e293b',
  },

  // Semantic status (not-color-only — every status carries a redundant label)
  success: {
    light: '#059669',
    dark: '#10b981',
  },
  'success-bg': {
    light: '#ecfdf5',
    dark: '#064e3b',
  },
  warning: {
    light: '#d97706',
    dark: '#f59e0b',
  },
  'warning-bg': {
    light: '#fffbeb',
    dark: '#78350f',
  },
  critical: {
    light: '#dc2626',
    dark: '#ef4444',
  },
  'critical-bg': {
    light: '#fef2f2',
    dark: '#7f1d1d',
  },

  // Accent — selective use for meaning, focus, intelligence state, action hierarchy
  accent: {
    light: '#2563eb',
    dark: '#3b82f6',
  },
  'accent-muted': {
    light: '#dbeafe',
    dark: '#1e3a5f',
  },
  'accent-strong': {
    light: '#1d4ed8',
    dark: '#60a5fa',
  },

  // Intelligence-state accents (for probe status, dial levels, etc.)
  intelligence: {
    idle: { light: '#71717a', dark: '#71717a' },
    probing: { light: '#2563eb', dark: '#3b82f6' },
    complete: { light: '#059669', dark: '#10b981' },
    conflict: { light: '#d97706', dark: '#f59e0b' },
    fallback: { light: '#dc2626', dark: '#ef4444' },
  },

  // Surface-specific accents (5 surfaces — differentiable)
  'surface-brand': {
    chatgpt: { light: '#10a37f', dark: '#10a37f' },
    perplexity: { light: '#7c3aed', dark: '#a855f7' },
    gemini: { light: '#4285f4', dark: '#60a5fa' },
    grok: { light: '#000000', dark: '#ffffff' },
    claude: { light: '#d97706', dark: '#f59e0b' },
  },
} as const;

export type ColorTokens = typeof colorTokens;