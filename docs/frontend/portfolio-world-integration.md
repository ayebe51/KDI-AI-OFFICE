# Portfolio Integration in 3D World: Interactive Kiosk & Showcase

## 1. Spatial Placement & Landmark
In the Ground Floor Reception Lobby, positioned adjacent to the soft neon "Koneksi Digital Inovasi" sign and reception desk, stands the **KDI Interactive Portfolio Display Kiosk**:
* **Visual Form**: A sleek, standing kiosk in warm white with a gently glowing widescreen display.
* **Proximity Trigger**: Walking within 3.6m displays the prompt: `[E] Jelajahi Portofolio Website KDI`.

---

## 2. In-Game Showcase Modal (`CozyPortfolioModal.tsx`)
Interacting with the kiosk launches an in-game modal showcasing KDI's client projects derived from the Phase 7 Portfolio System:

```
┌─────────────────────────────────────────────────────────────┐
│ 🌟 KDI AI PORTFOLIO SHOWCASE                              ✕ │
│ Featured Projects Built by KDI AI Organization              │
├─────────────────────────────────────────────────────────────┤
│  [ < ]               [ PROJECT PREVIEW ]              [ > ]  │
│                                                             │
│  🏷️ Jasa Website Toko Online Custom                         │
│  ⭐ Status: Live Production • Kategori: E-Commerce          │
│                                                             │
│  "Platform toko online custom performa tinggi terintegrasi  │
│   Payment Gateway (Midtrans), WhatsApp Order Notification,  │
│   dan AI Product Recommendation Engine."                    │
│                                                             │
│  🛠️ Tech: Next.js 14 • NestJS • Tailwind • Redis • Midtrans  │
├─────────────────────────────────────────────────────────────┤
│  🌐 [Lihat Demo Website]     💬 [Konsultasi Website Ini]    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. High-Value Action Workflows

### 3.1 Live Project Demo
* Clicking **"Lihat Demo Website"** safely navigates the visitor to the verified client production URL or sandbox preview in a secure new browser tab.
* URL validation prevents dangerous URI protocols or open redirects.

### 3.2 Instant Naya Consultation & Quotation
* Clicking **"Konsultasi Website Seperti Ini"**:
  1. Closes the portfolio carousel.
  2. Automatically transitions the visitor to the **Naya Account Manager Dialogue Modal**.
  3. Pre-selects the project's technology stack and estimated pricing tier, allowing the visitor to immediately request an official WhatsApp quote or submit their contact details.
