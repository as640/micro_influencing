# Micro-Influencer Marketplace

A full-stack marketplace enabling businesses and influencers to find each other, negotiate contracts, and manage advertising campaigns.

## Features
- **Role-based Dashboards:** Dedicated features for Influencers and Businesses.
- **Instagram Verification Engine:** Influencers securely connect their Instagram to fetch verified metrics (Follower count, Demographics, Avg Reach, etc).
- **Campaign Discovery:** Businesses can post Ads, and influencers can browse a feed of active Campaigns.
- **Influencer Discovery:** Businesses can search for influencers based on niche, location, followers, and pricing.
- **Real-Time Encrypted Messaging:** Connect instantly! An influencer clicking "I'm Interested" automatically spawns a direct messaging thread with the business.
- **Contract & Escrow Management:** (Razorpay Integrated) Securely draft, send, and fund ad campaigns via smart contracts.

---

## Tech Stack
- **Backend:** Django, Django REST Framework, PostgreSQL
- **Frontend:** React, Vite, TailwindCSS
- **Authentication:** JWT (JSON Web Tokens)
- **External APIs:** Instagram Graph API, Razorpay

---

## Local Setup Instructions

### Prerequisites
1. **Python 3.10+** (tested on 3.13)
2. **Node.js 18+** 
3. **PostgreSQL 14+** running locally.

### 1. Database Setup
1. Create a local PostgreSQL database named `micro_influencing`.
   ```bash
   psql -U postgres
   # In psql:
   CREATE DATABASE micro_influencing;
   \q
   ```
2. Import the existing database schema provided in this repository (`database_schema.sql`):
   ```bash
   # From the project root:
   psql -U postgres -d micro_influencing -f database_schema.sql
   ```
> *Note: If you skip importing the schema manually, you can also let Django create the tables by running `python manage.py migrate` in step 2.*

### 2. Backend Setup (Django API)
1. Open a terminal in the root folder (`micro_influence`).
2. Create and activate a Virtual Environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   # (For Windows: venv\Scripts\activate)
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment variables example file:
   ```bash
   cp .env.example .env
   ```
5. Edit the `.env` file to match your Postgres credentials and add your Razorpay/Instagram keys.
6. Apply any pending Django migrations (such as session and JWT token tables):
   ```bash
   python manage.py migrate
   ```
7. Start the development server:
   ```bash
   python manage.py runserver
   ```
Keep this terminal running. The backend API will be available at `http://localhost:8000/api/`.

### 3. Frontend Setup (React UI)
1. Open a **second, separate terminal** and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Click the URL (usually `http://localhost:5173/`) to open the app in your browser!

---

## Troubleshooting
- **Cannot Start Conversation / Server Error 500:** Ensure both terminals are running. The frontend relies completely on the Django API.
- **Database Connection Error:** Verify your `.env` Database credentials match your local Postgres installation exactly.
