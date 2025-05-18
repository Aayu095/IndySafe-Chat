
# 🛡️ IndySafe Chat – AI Public Safety Assistant for Indianapolis
<!-- Badges -->
<p align="left">
  <img src="https://img.shields.io/badge/Made%20with-Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Made with Next.js"/>
  <img src="https://img.shields.io/badge/AI%20by-Genkit%20(Gemini)-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="AI by Genkit (Gemini)"/>
  <img src="https://img.shields.io/badge/Database-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Database Firebase"/>
  <img src="https://img.shields.io/badge/Maps%20%26%20Places-Geoapify-F89820?style=for-the-badge" alt="Maps & Places Geoapify"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License: MIT"/>
  <img src="https://img.shields.io/badge/Contributions-Welcome-brightgreen.svg?style=for-the-badge" alt="Contributions Welcome"/>
</p>

**IndySafe Chat** is an intelligent, conversational public safety assistant designed to empower Indianapolis communities by providing easy access to safety information and reporting tools. This application is deployed and fully functional on Vercel.

---

📑 **Table of Contents**
*   [✨ Core Features](#-core-features)
*   [🛠️ Tech Stack](#️-tech-stack)
*   [🔑 API Key Configuration](#-api-key-configuration)
*   [⚙️ Setup & Installation](#️-setup--installation)
*   [🚀 Running Locally](#-running-locally)
*   [🤝 Contributing](#-contributing)
*   [📄 License](#-license)
*   [📬 Contact](#-contact)

---

## ✨ Core Features
*   🗣️ **Conversational AI:** Natural language safety queries & guidance.
*   🚨 **Hazard Reporting:** Submit incidents via chat or dedicated form. Report images are geo-tagged with approximate upload location.
*   🗺️ **Real-Time Mapping:** View incidents on a Geoapify static map.
*   📢 **Real-Time Alerts:** Instant toast notifications for official safety alerts.
*   🎤 **Voice Input:** Speak directly to the chatbot (Web Speech API).
*   📎 **Image Upload:** Attach images to reports and messages.
*   🆘 **Emergency Assistance:** Smart guidance for common emergencies & finding nearby help.
*   📋 **Report Management:** View reports by type or your recent submissions; upvote/downvote.
*   📝 **Comprehensive Help Guide:** In-app dialog explaining all features and commands.
*   🔄 **Chat Reset Functionality:** Easily clear the chat history and start fresh from the header.
*   🌐 **Standalone Reporting Form:** An alternative full-page form for detailed hazard submissions, accessible from the main chat page footer.
*   💬 **WhatsApp Ready:** Backend API built to integrate with Twilio for WhatsApp messaging.

---

## 🛠️ Tech Stack
*   **Frontend:** Next.js (App Router), React, TypeScript
*   **Styling:** Tailwind CSS, ShadCN UI
*   **AI Orchestration:** Genkit (with Google Gemini models)
*   **Database:** Firebase Firestore
*   **Mapping, Geocoding & Places:** Geoapify (Static Maps API, Geocoding API, Places API)
*   **Voice Input:** Web Speech API
*   **Deployment:** Vercel (handles Next.js frontend, API routes, and integrated Genkit Flows)

---

## 🔑 API Key Configuration
Create two files in your project root:

1.  **`.env` (for server-side keys like Genkit, Geoapify, Twilio):**
    ```env
    # For Genkit's Google AI provider (Gemini)
    GOOGLE_API_KEY=YOUR_GEMINI_API_KEY_FOR_GOOGLE_AI_SERVICES_HERE

    # For Geoapify Geocoding API, Places API, and Static Maps
    GEOAPIFY_API_KEY=YOUR_GEOAPIFY_API_KEY_HERE

    # For Twilio (WhatsApp integration) - Optional
    TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID_HERE
    TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN_HERE
    TWILIO_WHATSAPP_NUMBER=whatsapp:+1415XXXXXXX # Your Twilio WhatsApp sender number
    ```

2.  **`.env.local` (for client-side Firebase config):**
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY_HERE
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN_HERE
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID_HERE
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET_HERE
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID_HERE
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID_HERE
    ```
    *Obtain Firebase config values from your Firebase project settings. Geoapify key from Geoapify MyProjects. Twilio credentials from your Twilio account dashboard.*

**Important:** These `.env` files are ignored by git (see `.gitignore`) and should not be committed. Your Vercel deployment will require these to be set as environment variables in its project settings.

---

## ⚙️ Setup & Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Aayu095/IndySafe-Chat.git # Ensure this is your correct repo URL
    cd IndySafe-Chat
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set Up Environment Variables:** See [API Key Configuration](#-api-key-configuration) above.
4.  **Firebase Setup:**
    *   Create a Firebase project and enable Firestore Database.
    *   Set up Firestore Security Rules: Copy content from `firestore.rules` in this repository to the "Rules" tab of your Firestore database in the Firebase console and "Publish".

---

## 🚀 Running Locally
You need to run two development servers concurrently:

1.  **Next.js Development Server (Frontend & Web APIs):**
    ```bash
    npm run dev
    ```
    (App usually on `http://localhost:9002`)

2.  **Genkit Development Server (AI Flows):**
    (Open a new terminal)
    ```bash
    npm run genkit:dev
    # or for auto-reloading:
    # npm run genkit:watch
    ```
    (Genkit server usually on `http://localhost:3400`. Check its logs for API key loading status, especially for `GEOAPIFY_API_KEY`.)

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/Aayu095/IndySafe-Chat/issues). <!-- Ensure this is your correct issues URL -->

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License
This project is licensed under the MIT License.  
See the [LICENSE](./LICENSE) file for details.
---

## 📬 Contact
For any queries, ideas, or collaborations, reach out at: 📧 aayushigoel73@gmail.com

Project Link: [https://github.com/Aayu095/IndySafe-Chat](https://github.com/Aayu095/IndySafe-Chat) <!-- Ensure this is your correct repo URL -->

---

IndySafe Chat aims to significantly contribute to community safety and well-being in Indianapolis.
    
