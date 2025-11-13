<<<<<<< HEAD
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
=======
# 🐾 PawPal: A Digital Pet Care and Records Management System

### 📌 About

PawPal is a digital solution developed by **CSync**, a group of 3rd year Computer Science students from **Cavite State University (CvSU)**.
This project is made in collaboration with **Youth for Animals (YFA)**, a campus-based organization under **PAWS Philippines**, to help manage pets, track medical records, and support responsible pet ownership in the CvSU community.

---

## 🐶 About PAWS Philippines & YFA

The **Philippine Animal Welfare Society (PAWS)** is a non-profit organization dedicated to the protection and humane treatment of animals in the Philippines.

* 🐕 They promote adoption, spay/neuter programs, and animal rights awareness.
* 🐈 Their student arm, **Youth for Animals (YFA)**, empowers young advocates across schools and universities to participate in campaigns, adoption drives, and education efforts on animal welfare.
* 🐾 PawPal is designed to be YFA’s **digital partner** in Cavite State University to streamline pet care initiatives and member engagement.

---

## 🎯 Target Users

* **Youth for Animals (YFA – CvSU Main Campus)**
* **Pet owners and members affiliated with YFA**

---

## ✨ Key Features

### 🐕 YFA (Organization Side)

* Centralized **Pet Database** of CvSU community pets
* **Event & Vaccine Drive Records** for health monitoring
* **Lost & Found Support** (QR code for owner details)
* **Announcements Hub** for events, adoption drives, campaigns
* **Monitoring & Tracking** of vaccination compliance

### 👩‍👩‍👦 Pet Owners (Member Side)

* **Pet Profile Management** (name, breed, age, photo, etc.)
* **Medical & Vaccination Records** (certificates, treatments)
* **Health Reminders** (vaccines, deworming, vet visits)
* **Lost & Found QR Support** (scan shows limited contact info)
* **Owner Dashboard** with pet health progress
* **Community Access** to YFA tips, events, and announcements
* **Gamification & Rewards** (badges for active participation)

### 💬 Messaging & Community Engagement

* **Direct Messaging** between YFA and members
* **Group Announcements** for adoption drives, campaigns, and events
* **Support & Feedback Channel** where pet owners can reach YFA directly

---

## 🛠 Tech Stack

**Frontend:**

* React / Next.js (SEO + SSR)
* Tailwind CSS + ShadCN UI (modern & responsive)
* React Native (optional mobile app version)

**Backend:**

* Node.js + Express / NestJS
* PostgreSQL / MySQL
* Role-Based Access Control (RBAC) for YFA & Pet Owners

**Hosting & Integrations:**

* Vercel / Netlify for deployment
* Supabase (database + auth)
* Cloudinary / AWS S3 (media uploads)
* Firebase Cloud Messaging (push notifications & messaging)
* QR Code Generator (qrcode.js / QRCode.react)
* Progressive Web App (PWA) for mobile-like experience

---

## 🚀 Deployment

* Hosted on **Vercel/Netlify** for web app
* PWA support (no need for Google Play publication)

---

## 👨‍💻 Developers – CSync (CvSU 3rd Year Students)

This project is built as part of our academic journey and advocacy for animal welfare, in partnership with **Youth for Animals (YFA)** of **PAWS Philippines**.

---

## 📜 License

This project is for educational and community purposes.

---

👉 Do you also want me to include a **“How to Run the Project” section** (clone, install dependencies, run dev server) so other developers can test it easily?
>>>>>>> 9269a24be348253fbd88ca2e195fca9dd865db64
