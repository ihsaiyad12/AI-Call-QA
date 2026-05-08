# SalesGarners AI Call Quality Analyzer

A professional, full-stack lead qualification pipeline that transcribes sales calls, scores them using advanced AI models, verifies lead emails, and syncs high-intent data to HubSpot.

![SalesGarners Logo](public/SalesGarners_Logo.webp)

## 🚀 Key Features

- **Multi-Model AI Scoring**: Support for **Groq (Llama 3.3)**, **Gemini 1.5 Flash**, **OpenAI GPT-4o-mini**, and **Claude 3.5 Sonnet**.
- **Deepgram Transcription**: High-accuracy, fast transcription of call recordings.
- **Automated Email Verification**: Integrated with **Reoon Email Verifier** (Quick Mode) to validate leads instantly.
- **Advanced Scoring Framework**: Evaluation based on:
  - **Authority (40 pts)**: Using Job Title and decision-making power.
  - **Intent (25 pts)**: Interest and pain point identification.
  - **Demo Commitment (15 pts)**: Willingness to attend a meeting.
  - **Timeline (10 pts)**: Urgency of the lead.
  - **Industry Fit (10 pts)**: Alignment with target profile.
- **CRM Integration**: Individual leads can be pushed to HubSpot with a single click.
- **Hybrid Production Architecture**: Deploy on Vercel while keeping data securely on your local machine using an ngrok bridge.

---

## 🏗️ Tech Stack

- **Frontend/Backend**: Next.js 16+ (App Router)
- **Styling**: Vanilla CSS with modern Glassmorphism aesthetics
- **Transcription**: Deepgram Node SDK
- **Email Verification**: Reoon API
- **Local Storage**: Express Server + File-based JSON Database (persistent & secure)
- **Deployment**: Vercel

---

## 📦 Installation & Setup

### 1. Clone & Install dependencies
```bash
# Main Project
npm install

# Local Storage Server
cd local-server
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):
```ini
DEEPGRAM_API_KEY=your_key
GROQ_API_KEY=your_key
GEMINI_API_KEY=your_key
REOON_API_KEY=your_key
LOCAL_DB_URL=http://localhost:4000
LOCAL_DB_SECRET=your_chosen_secret
```
'
### 3. Start the Application

#### Step A: Start the Local Storage Server
This server handles persistent data storage on your hard drive.
```bash
cd local-server
LOCAL_DB_SECRET=your_chosen_secret node index.js
```

#### Step B: Start the Next.js App
In a separate terminal:
```bash
npm run dev
```

---

## 🌐 Production Deployment (Vercel)

This project uses a **Hybrid Cloud/Local** setup. Vercel handles the heavy lifting (AI/Transcription), while your machine stores the data.

1.  **Expose port 4000**: Use ngrok to create a tunnel for your local server.
    ```bash
    ngrok http 4000
    ```
2.  **Update Vercel Environment Variables**:
    - Set `LOCAL_DB_URL` to your ngrok forwarding URL (e.g., `https://xxxx.ngrok-free.app`).
    - Set `LOCAL_DB_SECRET` to match the secret on your machine.
3.  **Deploy**: Push your code to GitHub and connect it to Vercel.

---

## 🎨 UI & UX

The application features a sleek, dark-mode professional interface with:
- **Glassmorphism Navbar**: Featuring the SalesGarners logo and a live status indicator.
- **Step-by-Step Flow**: Upload → Process → Results.
- **Detailed Analytics**: Color-coded score breakdowns and email verification badges (Green: Valid, Yellow: Catch-All, Red: Invalid).

---

## 📄 License
Individual use only. Developed for SalesGarners.
