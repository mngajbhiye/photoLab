# PhotoLab Studio

**Professional photo editing and passport-sized image generator with AI background removal**

PhotoLab Studio is a modern, responsive web application for editing photos, generating passport-sized images, and creating print-ready sheets. Featuring real-time adjustments, AI-powered background removal, and a smooth, intuitive user interface.

---

## ✨ Features

- **📷 Photo Cropping**: Precise crop with zoom, pan, and aspect ratio control
- **🎨 Image Adjustments**: 
  - Brightness, Contrast, Exposure, Saturation
  - Advanced Skin Smoothing filter for portrait enhancement
  - Real-time filter preview with CSS-based transformations

- **🤖 AI Background Removal**: One-click background removal powered by `rembg`
- **🎭 Background Customization**: 
  - Solid color backgrounds with preset color swatches
  - Custom color picker support
  - Smooth color transitions

- **🖼️ Border Styling**: Automatic or manual border application with adjustable thickness (0–32px)

- **📄 Passport Photo Generation**: 
  - Multiple region presets (India, US, UK, EU)
  - Automatic sizing and cropping
  - Adjustments applied before layout

- **📑 Print Sheet Layout**: 
  - Generate multi-copy sheets (A4, A5, Letter)
  - PDF export with jsPDF integration
  - Optimized spacing for professional printing

- **🔐 Authentication**: Firebase Google Sign-in integration
- **⏱️ Daily Quotas**: Per-user background removal quotas tracked via Firestore
- **📱 Fully Responsive**: Optimized for desktop, iPad (portrait & landscape), and mobile

---

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast build and dev server
- **Tailwind CSS** & **Custom CSS** for styling
- **React Router** for navigation
- **react-easy-crop** for image cropping
- **jsPDF** for PDF generation
- **Firebase Auth & Firestore** for authentication and user data
- **react-icons** & **lucide-react** for UI icons

### Backend
- **FastAPI** (Python) for REST API
- **rembg** for AI background removal
- **CORS middleware** for cross-origin requests

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+) and npm
- **Python** (3.8+) and pip
- Firebase project credentials

### Frontend Setup

```bash
cd frontend/photoLab

# Install dependencies
npm install

# Set up environment variables
# Create .env file with Firebase config (see src/lib/firebaseConfig.ts)

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install "fastapi[standard]" rembg python-multipart

# Start development server
uvicorn main:app --reload

# Server runs at http://localhost:8000
```

---

## 📁 Project Structure

```
photoLab/
├── frontend/photoLab/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── PhotoStudio.tsx # Main editor component
│   │   │   ├── Navbar.tsx      # Navigation bar
│   │   │   ├── Footer.tsx      # Footer with links
│   │   │   └── Ads.tsx         # Google AdSense component
│   │   ├── pages/              # Route pages
│   │   │   ├── Studio.tsx      # Editor page
│   │   │   └── Contact.tsx     # Contact form
│   │   ├── utils/
│   │   │   └── photoLabUtils.ts # Core image processing functions
│   │   ├── context/
│   │   │   └── AuthContext.tsx # Firebase auth provider
│   │   ├── hooks/
│   │   │   └── useRemoveBgQuota.ts # Daily quota tracking
│   │   ├── lib/
│   │   │   └── firebaseConfig.ts # Firebase initialization
│   │   └── App.tsx             # Root component
│   └── vite.config.ts          # Vite configuration
│
├── backend/                     # FastAPI backend
│   ├── main.py                 # API endpoints
│   └── requirements.txt        # Python dependencies
│
└── README.md                   # This file
```

---

## 🔑 Key Functions

### Image Processing Pipeline (`photoLabUtils.ts`)

```typescript
// Crop image to passport size with adjustments
getCroppedImg(imageSrc, pixelCrop, region, adjustments)

// Remove background via FastAPI endpoint
removeBackground(blob)

// Add solid background color
addSolidBackground(noBgBlob, hexColor)

// Apply border
addBorderToImage(inputBlob, borderPx, color)

// Generate print sheet PDF
layoutOnSheetPDF(copies, region, sheetSize, imageBlob)

// Apply CSS filters
toFilterString(adjustments)

// Pixel-level skin smoothing
applySkinSmoothing(imageData, intensity)
```

### API Endpoints (`backend/main.py`)

```
POST /photolab/remove-bg/
  - Input: Image file (multipart/form-data)
  - Output: PNG image with transparent background
  - CORS: Enabled for localhost:5173
```

---

## 🎨 Responsive Design

| Breakpoint | Device | Layout | Features |
|-----------|--------|--------|----------|
| >1400px | Desktop | Side-by-side with ads | Full 3-column editor |
| 1025–1400px | Large tablet | Compact horizontal | Reduced ad sizes |
| 950–1024px | iPad landscape (wider) | Horizontal + ads | Optimized grid |
| 900–949px | iPad landscape (narrower) | Vertical stack | Full-width ads |
| 768–899px | iPad portrait | Vertical stack | Mobile-optimized |
| 600–767px | Tablet | Vertical stack | Compact layout |
| <600px | Mobile | Full-screen | Single column |

---

## 🔐 Authentication & Quotas

- **Firebase Google Sign-in**: Users authenticate via Google
- **Daily Quota**: 50 background removal requests per user per day
- **Quota Tracking**: Stored in Firestore at `users/{uid}/quota/{YYYY-MM-DD}`
- **Firestore Rules**: Only authenticated users can access their own data

---

## 📊 Performance Tips

- Images are converted to JPEG (0.95 quality) for faster processing
- Skin smoothing is optional to reduce computation
- PDF generation happens client-side for instant download
- Quota checks prevent excessive API calls

---

## 📜 License

MIT License

Copyright (c) 2026 Mohit Gajbhiye

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- [rembg](https://github.com/danielgatis/rembg) - Background removal library
- [react-easy-crop](https://github.com/ricardo-ch/react-easy-crop) - Cropping component
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation
- [Firebase](https://firebase.google.com/) - Authentication & database
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

---

**Made with ❤️ by Mohit Gajbhiye**
