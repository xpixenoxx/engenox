// design-system/src/tokens/index.ts
// Main tokens export — consumed by Tailwind v4 @theme

export { colorTokens } from './color';
export { radiusTokens } from './radius';
export { motionTokens, semanticMotion } from './motion';
export { shadowTokens, semanticShadow } from './shadow';
export { zIndexTokens } from './zIndex';
export { spacingTokens, semanticSpacing } from './spacing';
export { typeTokens, fontFamilies } from './type';

// Token types for consumers
export type { ColorTokens } from './color';
export type { RadiusTokens } from './radius';
export type { MotionTokens, SemanticMotion } from './motion';
export type { ShadowTokens, SemanticShadow } from './shadow';
export type { ZIndexTokens } from './zIndex';
export type { SpacingTokens, SemanticSpacing } from './spacing';
export type { TypeTokens, FontFamilies } from './type';