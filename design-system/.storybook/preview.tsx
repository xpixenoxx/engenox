// design-system/.storybook/preview.tsx
import type { Preview } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import '../tailwind.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0a0a0b' },
        { name: 'surface', value: '#fafafa' },
      ],
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
    chromatic: {
      viewports: [320, 768, 1280],
      diffThreshold: 0.2,
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider defaultTheme="light" enableSystem={false}>
        <div className="min-h-screen p-4">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;