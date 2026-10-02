# Producer Tools DSP Suite - Setup & Usage Guide

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**

---

## 1. Quick Start (Web Browser)

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/mkomorny/producer-tools-dsp-suite.git
   cd producer-tools-dsp-suite
   npm install
   ```

2. (Optional) Set up local environment:
   ```bash
   cp .env.example .env
   ```
   Add your optional Gemini / OpenAI / Anthropic keys for multimodal assistance, or enter them directly inside the app's settings dialog.

3. Launch development server:
   ```bash
   npm run dev
   ```
4. Navigate to `http://localhost:3000` in Chrome, Edge, or Brave.

---

## 2. Desktop Packaging (Electron)

To package as a standalone Windows desktop executable:
```bash
npm run build:electron
npm run package:win
```
The output executable will be created in `release/`.
