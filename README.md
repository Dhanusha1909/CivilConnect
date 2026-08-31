# RootCauseAI
### AI-Based Root-Cause Discovery and Intelligent Prioritization of Real-World Complaints

A full-stack final-year project implementing the complete pipeline:

```
User Complaints → NLP Processing → Semantic Similarity → Complaint Clustering →
Duplicate Detection → Temporal + Location Context → Root Cause Inference →
Severity Assessment → Impact Prediction → Priority Ranking → Recommended Action
```

Separate citizen and officer portals, live complaint status tracking, a
complaint-to-cause graph visualization, staff assignment with due dates, and
status propagation across every complaint linked to a root cause.

---

## 1. Project structure

```
rootcauseai/
├── backend/                  Node.js + Express + MongoDB API
│   ├── models/                User, Complaint, Cluster, CorpusStats
│   ├── services/
│   │   ├── nlpService.js      TF-IDF vectorization + cosine similarity (from scratch)
│   │   ├── scoringService.js  Severity / Impact Score / Priority formulas
│   │   ├── clusteringService.js   Orchestrates the full pipeline
│   │   └── aiService.js       Optional Gemini-powered narrative (heuristic fallback)
│   ├── controllers/, routes/  REST API
│   ├── middleware/auth.js     JWT auth + role guard
│   └── utils/seed.js          Demo data generator
└── frontend/                 React + Vite + Tailwind CSS
    └── src/
        ├── pages/              Login, Register, CitizenDashboard, ComplaintDetail,
        │                       OfficerDashboard, ClusterDetail
        └── components/         Navbar, ComplaintGraph (SVG), badges, ProtectedRoute
```

---

## 2. How the "AI" works (important for your viva/demo)

This project implements a **real, from-scratch NLP + statistics pipeline** —
no black-box ML library required, so it's fully explainable and runs
anywhere with just Node.js and MongoDB.

1. **NLP Processing** (`nlpService.js`) — each complaint's title+description
   is tokenized, stop-words removed, and converted into a **TF-IDF vector**
   (Term Frequency × Inverse Document Frequency), computed incrementally
   against a running corpus stored in `CorpusStats`.

2. **Semantic Similarity** — new complaints are compared against existing
   open clusters using **cosine similarity** between TF-IDF vectors,
   restricted to the same category and a matching location keyword
   (Temporal + Location Context).

3. **Complaint Clustering** — if similarity ≥ `SIMILARITY_THRESHOLD` (0.22),
   the complaint joins that cluster and the cluster's centroid vector is
   updated (online average). Otherwise, a **new cluster (root cause) is
   created**, exactly like the "Water leak / Flooding / Bad smell / Drainage"
   → "Drainage blockage near Block A" example in the spec.

4. **Duplicate Detection** — if similarity is very high (≥ 0.6) the new
   complaint is flagged `isDuplicateOf` the most similar existing complaint
   in that cluster.

5. **Root Cause Inference** — the cluster's top TF-IDF keywords (excluding
   location words) are combined into a human-readable label, e.g.
   *"Drainage / flooded / leaking near Block A"*.

6. **Severity Assessment** (`scoringService.js`) — each complaint gets a
   1–10 severity score from its category baseline plus a scan for danger
   keywords (fire, gas leak, electrocution, structural, contamination...).
   The cluster severity is a weighted blend of its members' max + average.

7. **Impact Prediction** — computed as:

   ```
   Impact Score = Severity × log(1 + AffectedUsers) × Recurrence × Urgency
   ```

   Using `log(1+AffectedUsers)` (not a raw linear count) is *exactly* what
   lets a small-but-dangerous cluster (15 people, exposed live wire)
   outrank a large-but-minor one (100 people, noise complaint) — this is
   verified in the code comments and was tested during development.

8. **Priority Ranking** — impact score is bucketed into
   Critical / High / Medium / Low, and the officer dashboard sorts all
   clusters by impact score descending.

9. **Recommended Action** — `aiService.js` generates a root-cause
   explanation and a recommended action. If you set `GEMINI_API_KEY` in
   `.env`, it calls the Google Gemini API for a richer, better-written
   narrative; if not, it falls back to a deterministic heuristic built from
   the cluster's stats — **the whole project works with zero external API
   keys**.

---

## 3. Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI

### Backend

```bash
cd backend
cp .env.example .env      # edit MONGO_URI / JWT_SECRET / OFFICER_SIGNUP_CODE if needed
npm install
npm run dev                # or: npm start
```

The API runs at `http://localhost:5000`. Health check: `GET /api/health`.

**Optional demo data** (recreates the exact "Block A drainage" scenario from
the project brief, plus an officer + 5 citizen accounts, all with password
`password123`):

```bash
npm run seed
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173` and talks to the backend at
`http://localhost:5000/api` (override with a `VITE_API_URL` env var if
needed).

---

## 4. Using the system

**As a citizen:**
1. Register → choose "citizen" → set your default locality.
2. Submit a complaint (title, description, category, location). You'll
   immediately see which root-cause issue it was linked to, how many other
   people are affected, and its priority.
3. Track live status on the complaint detail page (Pending → Clustered →
   Assigned → In Progress → Resolved), including officer notes.

**As an officer:**
1. Register → choose "officer" → enter the signup code from
   `OFFICER_SIGNUP_CODE` in `.env` (default `OFFICER2026`).
2. The dashboard lists every detected root-cause cluster, **sorted by
   impact score** — not complaint count.
3. Open a cluster to see the **complaint-to-cause graph**, the AI/heuristic
   root-cause explanation and recommended action, severity/impact metrics,
   and every linked complaint.
4. **Appoint staff** with a due date, or **update status** — both actions
   automatically propagate to every complaint linked to that root cause, so
   all affected citizens see their status update together, even though the
   officer only resolves the underlying issue once.

---

## 5. Key design decisions worth mentioning in your report

- **TF-IDF over raw keyword matching**: down-weights common words, so
  clusters form around genuinely distinctive shared vocabulary.
- **Location-aware clustering**: two complaints only cluster together if
  they share a location keyword AND are semantically similar — prevents
  unrelated "drainage" complaints from different buildings merging.
- **Temporal context**: only clusters active within the last 120 days are
  considered as merge candidates; `recurrenceScore` also rewards clusters
  that keep receiving new complaints recently, modeling escalating issues.
- **Impact Score formula is transparent and tunable**: all thresholds
  (`SIMILARITY_THRESHOLD`, `DUPLICATE_THRESHOLD`, priority cutoffs) are
  named constants in `clusteringService.js` / `scoringService.js`, easy to
  justify or adjust for your evaluation.
- **AI is additive, not load-bearing**: the Gemini integration only
  improves the *wording* of explanations; every scoring/clustering decision
  is made by the deterministic pipeline, so results are reproducible.

---

## 6. Environment variables (backend `.env`)

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `PORT` | API port (default 5000) |
| `JWT_SECRET` | Secret for signing auth tokens — change this |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `CLIENT_ORIGIN` | Frontend origin for CORS (default `http://localhost:5173`) |
| `GEMINI_API_KEY` | Optional — enables Google Gemini generated root-cause narratives |
| `GEMINI_MODEL` | Optional — defaults to `gemini-2.5-flash` |
| `OFFICER_SIGNUP_CODE` | Passcode required to register as an officer |

---

## 7. Possible extensions (if you want to go further)

- Swap TF-IDF for sentence embeddings (e.g. a hosted embeddings API) for
  even better semantic matching across paraphrases.
- Add file/photo uploads per complaint.
- Add email/SMS notifications on status change.
- Add a map view (lat/lng already modeled on `Complaint`) using the
  `lat`/`lng` fields already present in the schema.
- Add an admin role to manage officer accounts instead of a shared signup code.
