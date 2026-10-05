# EcoWalk – Personalized Healthy Walking Route Recommendation System
### MCA Capstone Project • Phase 1 Implementation

---

## Project Overview

**EcoWalk** is a full-stack personalized walking route recommendation web application designed to encourage urban walking by selecting routes that maximize health benefits. 

Unlike traditional navigation engines that focus purely on the shortest distance or automotive transit, **EcoWalk** evaluates walking corridors based on:
1. **Greenery Canopy Density & Shade (0–100%)**
2. **Pedestrian Safety & Lighting Infrastructure (0–100%)**
3. **Traffic Emission & Air Pollution Exposure (Low Risk = Clean Air)**
4. **Sidewalk & Road Surface Condition (dynamically penalized by active community pothole reports)**
5. **Caloric Expenditure & Walking Pace**

> [!IMPORTANT]
> **Strict Zero External API Compliance**:
> Per Phase 1 specifications, **no external mapping or routing APIs** (such as Google Maps, Mapbox, OpenStreetMap, OpenWeather, or AQICN) are used. All maps, coordinates, terrain features, route polylines, and environmental indices are calculated and rendered entirely via **local application logic** and an **interactive SVG vector map visualizer**.

---

## System Architecture

```
Eco Walk/
├── client/                     # Frontend Application (React 19 + Vite)
│   ├── index.html              # HTML shell & typography
│   ├── vite.config.js          # Vite config with backend proxy (:5000)
│   └── src/
│       ├── main.jsx            # React root mount
│       ├── App.jsx             # Main router & layout state
│       ├── index.css           # Premium Modern Design System (Emerald/Mint/Slate)
│       ├── context/
│       │   └── AuthContext.jsx # JWT Auth, session persistence, profile stats
│       ├── services/
│       │   └── api.js          # REST client for all backend endpoints
│       ├── components/
│       │   ├── Navbar.jsx               # Responsive navigation bar & badges
│       │   ├── Footer.jsx               # Academic project metadata footer
│       │   ├── MapVisualizer.jsx        # Interactive Local SVG Vector Map Engine
│       │   ├── RouteCard.jsx            # Recommended Route Hero with Health Score Dial
│       │   ├── RouteComparisonTable.jsx # Side-by-Side Alternative Routes Matrix
│       │   ├── ReportHazardModal.jsx    # Pothole & road reporting with photo attachment
│       │   └── FeedbackModal.jsx        # Star rating & multi-attribute review modal
│       └── pages/
│           ├── HomeDashboard.jsx        # Personal stats, quick search, district AQI
│           ├── RoutePlanner.jsx         # Full route recommendation & comparison matrix
│           ├── HazardReportsPage.jsx    # Community road hazard alerts & resolution feed
│           ├── AdminDashboard.jsx       # User roster, hazard moderation, route inventory
│           └── AuthPage.jsx             # Login, register & 1-click evaluator demo logins
│
├── server/                     # Backend API Service (Node.js + Express)
│   ├── server.js               # Express server entrypoint & route mounting
│   ├── config/
│   │   └── config.js           # Ports, JWT configuration, walking pace constants
│   ├── data/                   # Local Persistent JSON Storage Engine
│   │   ├── users.json          # Registered walkers & admin records
│   │   ├── locations.json      # 12 Greenfield District landmarks & coordinates
│   │   ├── routes.json         # Diverse candidate walking routes dataset
│   │   ├── reports.json        # Crowdsourced potholes & road hazards
│   │   └── feedback.json       # User star ratings & comments
│   ├── models/
│   │   ├── storage.js          # Robust JSON persistence layer with auto-seeding
│   │   └── schemas.js          # Mongoose Schema definitions for MongoDB compliance
│   ├── services/
│   │   └── recommendationEngine.js # Multi-Attribute Utility Rule-Based Health Engine
│   ├── controllers/            # Auth, Route, Report, Feedback, Admin controllers
│   ├── routes/                 # Express REST endpoint routers
│   └── seeds/
│       └── initialData.js      # Seed dataset for Greenfield Eco-District
│
├── package.json                # Root scripts with concurrently runner
└── README.md                   # Complete MCA documentation & run instructions
```

---

## Phase 1 Feature Matrix

| Feature | Description | Status |
|---|---|:---:|
| **User Auth & Profiles** | Registration, login with JWT tokens, custom walking speeds (leisurely, moderate, brisk), personal health stats | Completed |
| **Home Dashboard** | Personal stats (Eco km walked, calories burned, CO2 saved), quick planner, district air quality index (AQI) | Completed |
| **Landmark Selection** | Interactive dropdown selection or 1-click landmark picking directly on the local vector map | Completed |
| **Local Vector Map** | Custom interactive SVG spatial engine showing parks, lake, river, boulevards, landmarks, animated route paths, and hazard pins | Completed |
| **Walking Metrics** | Distance (km), estimated time (mins) based on pace, calories burned (~62 kcal/km), CO2 emissions prevented | Completed |
| **Rule-Based Engine** | Multi-Attribute Utility Theory (MAUT) computing composite **Health Score** (0–100) using weighted greenery, safety, clean air, and road quality | Completed |
| **Recommendation Reasons**| Generates transparent human-readable explanations (e.g. *"94% tree shade", "85% lower vehicular fumes", "0 potholes"*) | Completed |
| **Alternative Comparison**| Side-by-side comparison matrix of candidate paths with trade-off analysis | Completed |
| **Hazard Reporting** | Report potholes, open drainage, broken lights, and obstructions with severity and local photo attachment (base64) | Completed |
| **Dynamic Penalties** | Active pothole/drainage reports dynamically lower the affected route's road condition score and health score | Completed |
| **Route Feedback & Ratings**| 5-star rating system with specific breakdown for greenery, safety, pavement smoothness, and walking comfort | Completed |
| **Admin Dashboard** | System health metrics, hazard verification workflow (`Pending` $\rightarrow$ `Verified` $\rightarrow$ `Resolved`), user directory, route catalog, and feedback log | Completed |
| **Dual Storage Model** | Runs immediately out-of-the-box via atomic local JSON file persistence; includes complete Mongoose schemas for MongoDB evaluation | Completed |

---

## Mathematical Formulation: Rule-Based Health Engine

The engine calculates the composite **Health Score** $H \in [0, 100]$:

$$H = w_g \cdot G + w_s \cdot S + w_a \cdot (100 - P) + w_r \cdot R_{eff} - \text{Penalty}_{distance}$$

Where:
- $G$: Greenery Canopy Score ($0 \le G \le 100$)
- $S$: Pedestrian Safety & Sidewalk Score ($0 \le S \le 100$)
- $P$: Vehicular Traffic & Exhaust Exposure ($0 \le P \le 100$), converted to Clean Air Index $(100 - P)$
- $R_{eff}$: Effective Road Condition Score:
  $$R_{eff} = \max(10, R_{base} - \sum \text{HazardPenalties})$$
  *(Critical hazard: -25 pts, High: -15 pts, Moderate: -8 pts, Low: -4 pts)*
- $w_g, w_s, w_a, w_r$: Dynamically normalized weights adapting to user preference toggles
- $\text{Penalty}_{distance}$: Mild penalty applied if walking distance exceeds 2.0 km

---

## Setup & Running Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ or 20+; tested on Node v25)
- npm (version 9+)

### 1. Install Dependencies
Run the install command from the root directory:
```bash
# Installs root, server, and client dependencies in one command:
npm run install:all
```
*(Alternatively: `cd server && npm install`, then `cd ../client && npm install`)*

### 2. Run the Full-Stack Application
From the root directory:
```bash
npm start
```
This runs both services concurrently:
- **Backend API Server**: Runs on `http://localhost:5000`
- **Frontend Web App**: Runs on `http://localhost:3000`

Open your web browser and navigate to:
```
http://localhost:3000
```

---

## Pre-seeded Evaluator Credentials (1-Click Demo)

The system includes pre-loaded sample accounts with 1-click login buttons on the Sign In page:

| Role | Email | Password | Pre-seeded Profile Details |
|---|---|---|---|
| **Walker (Student/User)** | `walker@ecowalk.local` | `walk123` | 18.4 km walked, 1,140 kcal, 12 walks, Greenery priority |
| **Administrator** | `admin@ecowalk.local` | `admin123` | Full admin privileges, access to verify/resolve road hazards |

---

## Academic MCA Viva & Evaluation Points

1. **Why zero external APIs in Phase 1?**
   - Traditional APIs like Google Maps require credit card billing, network connectivity, and external dependencies. Building an internal spatial model and vector visualizer demonstrates fundamental understanding of coordinate mapping, SVG graphics manipulation, and client-side computational geometry.
2. **How does the recommendation engine work?**
   - It utilizes Multi-Attribute Utility Theory (MAUT). Each candidate route between two landmark nodes has objective ground truth values for greenery density, sidewalk safety, and vehicular traffic risk. Active hazard reports dynamically degrade the route's road quality score.
3. **How does community reporting affect routing?**
   - When a walker reports a pothole on a route, the backend records the report as `pending` or `verified`. In subsequent route evaluations, the engine deducts a severity penalty from that route's road condition score, often causing alternative clearer routes to become the new recommended top choice!
4. **Phase 2 Scope & Future Enhancements:**
   - Machine Learning model (Random Forest / Reinforcement Learning) trained on walker preference feedback.
   - Live IoT edge air quality (PM2.5 / CO2) sensor feeds.
   - PWA / Mobile app with real-time GPS tracking and accelerometer-based automatic pothole detection.
