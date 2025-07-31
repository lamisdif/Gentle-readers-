# Dalton White Font Setup Instructions

## 🎯 What You Need to Do

### 1. **Place Your Font Files**
Put your Dalton White font files in the `public/fonts/` directory:
```
public/fonts/
├── DaltonWhite.woff2  (preferred - smallest file size)
├── DaltonWhite.woff   (fallback)
└── DaltonWhite.otf    (fallback)
```

### 2. **Font File Names**
Make sure your font files are named exactly:
- `DaltonWhite.woff2` (recommended)
- `DaltonWhite.woff` 
- `DaltonWhite.otf`

### 3. **What I've Already Done**
✅ Updated CSS to load fonts from `/fonts/DaltonWhite.woff2`
✅ Added preload links for performance
✅ Applied Dalton White to titles and headings (NOT the logo)
✅ Kept your bunny logo untouched
✅ Added fallback fonts for reliability

### 4. **Where Dalton White is Applied**
- Hero section title
- Section headers ("Latest books online")
- Book titles on cards
- Footer headings
- Sidebar headings

### 5. **What's NOT Touched**
- Your bunny logo (stays exactly as is)
- Language toggle buttons (AR/EN)
- Body text and navigation

## 🚀 After Uploading Font Files
Your site will automatically:
- Load Dalton White font for titles
- Use elegant fallbacks if font fails
- Work perfectly on Render.com
- Be responsive across all devices

## 📁 File Structure
```
public/
├── fonts/
│   ├── DaltonWhite.woff2  ← PUT YOUR FONT HERE
│   ├── DaltonWhite.woff   ← OPTIONAL
│   └── DaltonWhite.otf    ← OPTIONAL
├── index.html
├── index.css
└── index.js
```

**Your bunny logo stays completely untouched! 🐰** 