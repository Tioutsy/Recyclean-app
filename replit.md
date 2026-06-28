# Recyclean

A mobile-first recycling tracker app built with React + Vite.

## What it does
- **Scan tab**: Take a photo or scan a barcode of a recyclable item, then classify it into one of four categories (PET Plastic, HDPE Plastic, Glass, Paper & Carton)
- **Guide tab**: Browse recycling rules per category — what's accepted and what's not
- **History tab**: View all logged items with filters by category, delete entries, and export to CSV
- **Database stats**: Live count of items per category shown in the header dashboard

## Tech
- React 19 + Vite 8
- localStorage for persistence (`recyclean_db_v3`)
- Native browser APIs: `navigator.mediaDevices` for camera, `BarcodeDetector` for barcode scanning
- Google Fonts: Syne + DM Sans

## User preferences
- Mobile-first layout (max-width 520px)
- Brand colors: darkGreen #1B5E20, midGreen #2E7D32, brightGreen #66BB6A, lightBg #F1F8E9
