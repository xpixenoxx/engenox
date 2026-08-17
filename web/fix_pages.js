const fs = require('fs');
const path = require('path');

const files = [
  'src/app/(admin)/page.tsx',
  'src/app/(dashboard)/conflicts/page.tsx',
  'src/app/(dashboard)/consent/page.tsx',
  'src/app/(dashboard)/interventions/page.tsx',
  'src/app/(dashboard)/settings/page.tsx',
  'src/app/(onboarding)/onboarding/page.tsx'
];

files.forEach(file => {
  const fullPath = path.join('D:/Engenox/web', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf-8');
    
    // Remove Metadata import
    content = content.replace(/import type \{ Metadata \} from 'next';\n?/g, '');
    content = content.replace(/import \{ type Metadata \} from 'next';\n?/g, '');
    
    // Remove export const metadata block
    // Matches export const metadata: Metadata = { ... };
    content = content.replace(/export const metadata: Metadata = \{[\s\S]*?\};\n?/g, '');
    
    // Add use client
    if (!content.includes("'use client'")) {
      content = "'use client';\n" + content;
    }
    
    // Remove async from page component
    // export default async function
    content = content.replace(/export default async function/g, 'export default function');
    // async function [Name]Content
    content = content.replace(/async function (\w+)Content/g, 'function $1Content');
    
    fs.writeFileSync(fullPath, content);
    console.log('Fixed ' + file);
  }
});
