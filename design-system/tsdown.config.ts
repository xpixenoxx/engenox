import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/tokens/index.ts',
    'src/primitives/index.ts',
    'src/patterns/index.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  platform: 'browser',
  target: 'ES2022',
  external: ['react', 'react-dom', 'tailwindcss'],
  // CSS is handled via global.css export in package.json exports
});