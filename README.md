# RepairFirst LK

**AI-Powered Electronic Device Repair, Replacement and Responsible Recycling Decision Support Platform for Sri Lanka**

An academic Emerging Technologies project designed for university students, smartphone and laptop owners, households, and small businesses in Sri Lanka to make informed, safe, and economical repair vs replacement decisions.

---

## Key Features

1. **AI-Assisted Symptom Assessment**:
   - Natural language fault classification across `BATTERY_POWER`, `DISPLAY_SCREEN`, `CHARGING`, `OVERHEATING`, `PERFORMANCE`, `PHYSICAL_DAMAGE`, `CONNECTIVITY`, and `OTHER`.
   - Clear distinction: preliminary educational guidance, not a confirmed hardware diagnosis.
   - Immediate detection and safety alerts for urgent hardware hazards (swollen batteries, smoke, electrical sparks, severe thermal runaway).

2. **Mira · RepairFirst Guide (Conversational Decision Companion)**:
   - Multi-turn interactive chat powered by Google Gemini (`gemini-3.8-flash`).
   - Recommends safe non-invasive checks (cables, ventilation, OS battery diagnostics).
   - Side-by-side device inspection card with active device context, status, and direct action triggers.

3. **Deterministic Repair vs Replacement Calculator**:
   - Zero hallucinations: all financial calculations run deterministically in application code.
   - Calculates total repair cost, cost difference, and repair cost ratio % in Sri Lankan Rupees (LKR).
   - Transparent heuristic guidance bands (e.g., <=25% strongly favor repair, <=50% reasonable, >70% weigh age and consider replacement).

4. **Sri Lankan Repair Provider Directory**:
   - Searchable and filterable by District (all 25 Sri Lankan districts), Town, Device category (Laptops / Smartphones), and Repair category.
   - Clear distinction between verified community providers and demonstration listings (`DEMO DATA – NOT A VERIFIED REAL PROVIDER`).
   - Integrated Google Maps search links and external review search links.

5. **Responsible E-Waste Guidance**:
   - Dedicated guidance on when repair is no longer economical or safe.
   - Prominent links to [e-Kunu LK](https://ekunu.lk/) and the Central Environmental Authority (CEA).
   - Instructions on battery isolation and data wiping prior to disposal.

6. **Firebase Authentication & Cloud Firestore Persistence**:
   - Google Sign-In with popup auth.
   - User Decision Workspace: registered laptops & smartphones, assessment history, saved comparisons, and platform feedback.
   - Server-enforced Firestore security rules (`firestore.rules`) adhering to zero-trust ABAC standards.

7. **Protected Administrator Portal**:
   - Server-side authorization verifying admin status against the allowlist (`sanjayalasnan327@gmail.com`).
   - Management tools to add, edit, verify, disable, and toggle demo flags on provider listings.
   - Aggregated platform statistics and user feedback reviews.

---

## 1. How to Install Dependencies

```bash
npm install
```

---

## 2. How to Start Development Mode

```bash
npm run dev
```
Starts the full-stack server on `http://localhost:3000` running Express with Vite middlewares mounted.

---

## 3. How Firebase is Configured

Firebase Authentication and Cloud Firestore are provisioned via Google AI Studio's native cloud provider integration.
- Configuration details are loaded from `firebase-applet-config.json`.
- Firestore database ID is explicitly bound using:
  ```ts
  export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  ```
- Firestore security rules are defined in `firestore.rules` and deployed to the cloud project.

---

## 4. How Gemini API Secrets are Configured

- Google AI Studio automatically provides `GEMINI_API_KEY` at runtime via environment secrets.
- For local development outside AI Studio, create a `.env` file based on `.env.example`:
  ```bash
  cp .env.example .env
  ```
  Add your API key:
  ```env
  GEMINI_API_KEY="your-gemini-api-key-here"
  PORT=3000
  ```
- **Security Guarantee**: The Gemini API key is strictly maintained on the Node.js backend (`server.ts`) and is never bundled into client-side code.

---

## 5. How to Run Tests

Run the test suite using Node.js:
```bash
npm test
```
The test suite validates:
- Deterministic LKR cost calculations and ratio formulas.
- Boundary conditions (negative repair quotes, zero replacement price).
- Hazardous symptom detection (swollen batteries, smoke, sparks).
- Normal non-hazardous problem handling.
- Demo provider safeguards and Sri Lankan district filtering.

---

## 6. How to Configure Administrators

Administrator authorization is verified on the backend:
1. The bootstrapped admin email is set to `sanjayalasnan327@gmail.com`. When signing in with this verified Google account, admin rights are automatically granted.
2. In Firestore, additional administrators can be registered by adding a document to `/admins/{uid}` with `{ "email": "admin@example.com" }`.
3. Normal users cannot escalate their role via client-side profile edits; Firestore rules and server endpoints forbid role tampering.

---

## 7. How to Build for Production

```bash
npm run build
```
Generates production assets in the `dist/` directory.

---

## 8. How to Deploy to Google Cloud Run

To run in production on Cloud Run:
```bash
npm run start
```
`server.ts` automatically serves the compiled `dist/` directory and mounts all `/api` endpoints on `PORT 3000` (or `process.env.PORT`).

---

## Project Structure

```
├── firebase-applet-config.json # Provisioned Firebase configuration
├── firebase-blueprint.json      # Firestore entity & collection schema
├── firestore.rules             # Hardened security rules
├── security_spec.md            # Security specification & Dirty Dozen tests
├── server.ts                   # Express server + Gemini AI integration
├── index.html                  # HTML entry point with fonts & metadata
├── src/
│   ├── types.ts                # TypeScript interfaces
│   ├── main.tsx                # React root mount
│   ├── App.tsx                 # Main application view & tab router
│   ├── index.css               # Tailwind CSS & global design styles
│   ├── context/
│   │   └── AuthContext.tsx     # Firebase Auth context & admin verification
│   ├── lib/
│   │   ├── firebase.ts         # Firebase SDK initialization & error handler
│   │   ├── calculations.ts     # Deterministic financial calculator
│   │   ├── safetyChecks.ts     # Urgent hardware hazard inspection
│   │   └── demoData.ts         # Demo providers, districts, brands & FAQs
│   └── components/
│       ├── Navbar.tsx          # Navigation header
│       ├── Hero.tsx            # Landing hero with visual card
│       ├── HowItWorks.tsx      # 3-step simple path forward
│       ├── AssessmentWizard.tsx # Guided 3-step device assessment
│       ├── MiraChat.tsx        # Mira 3-column interactive decision guide
│       ├── RepairCalculator.tsx # Deterministic LKR repair calculator
│       ├── ProviderDirectory.tsx# Sri Lankan repair provider directory
│       ├── EWasteSection.tsx   # Responsible disposal & e-Kunu portal
│       ├── UserDashboard.tsx   # User registered devices & assessment history
│       ├── AdminPanel.tsx      # Protected administrative management portal
│       ├── FAQSection.tsx      # Collapsible FAQ accordion
│       └── Footer.tsx          # Footer with back-to-top
└── tests/
    └── repair_logic.test.ts    # Comprehensive unit tests
```
