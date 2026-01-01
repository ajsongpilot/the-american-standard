#!/usr/bin/env node

/**
 * Icon Generation Script
 * 
 * This script provides instructions for generating PWA icons.
 * You'll need to use an image editor or online tool to create the PNG versions.
 * 
 * Required icons:
 * - icon-192.png (192x192)
 * - icon-512.png (512x512)
 * - icon-maskable-192.png (192x192, with safe zone padding)
 * - icon-maskable-512.png (512x512, with safe zone padding)
 * - apple-touch-icon.png (180x180)
 * - favicon.ico (multi-size: 16x16, 32x32, 48x48)
 * 
 * Design guidelines:
 * - Background: #1e40af (navy blue)
 * - Letters: "AS" in white, Georgia/serif font
 * - Accent stripe: Red (#dc2626), white, navy blue horizontal bars
 * 
 * Tools you can use:
 * - Figma (free, online)
 * - Canva (free, online)
 * - GIMP (free, desktop)
 * - https://realfavicongenerator.net/ (generates all sizes from one image)
 * - https://maskable.app/ (for testing maskable icons)
 */

console.log(`
🎨 Icon Generation Guide for The American Standard

The SVG icon template is located at: public/icon.svg

To generate PNG icons:

Option 1: Use an online converter
  1. Go to https://svgtopng.com or https://cloudconvert.com/svg-to-png
  2. Upload public/icon.svg
  3. Generate at sizes: 192x192, 512x512, 180x180
  4. Save to public/ folder with correct names

Option 2: Use ImageMagick (if installed)
  convert -background none -resize 192x192 public/icon.svg public/icon-192.png
  convert -background none -resize 512x512 public/icon.svg public/icon-512.png
  convert -background none -resize 180x180 public/icon.svg public/apple-touch-icon.png

Option 3: Use Real Favicon Generator
  1. Go to https://realfavicongenerator.net/
  2. Upload a 512x512 version of your icon
  3. Download the complete favicon package
  4. Extract to public/ folder

For maskable icons (required for Android):
  - Ensure important content is within the center 80% "safe zone"
  - Use https://maskable.app/ to preview and test

Required files:
  ✓ public/icon.svg (template - created)
  □ public/icon-192.png
  □ public/icon-512.png
  □ public/icon-maskable-192.png
  □ public/icon-maskable-512.png
  □ public/apple-touch-icon.png
  □ public/favicon.ico
`);
