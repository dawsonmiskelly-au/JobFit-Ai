# JobFit AI

AI-powered resume generator that tailors your experience to any job description using a multi-step agent pipeline.

You store your work experience, volunteer work, projects, and education once. For any job posting, the agent extracts requirements, scores your experiences, drafts a tailored resume, evaluates it honestly, and revises it — producing an optimized resume with a fit score, honest recommendation, and a downloadable Harvard-template PDF.

## How It Works

```
Job Description
      │
      ▼
┌─────────────────────┐
│ Extract Requirements │  Parse job posting → must_have, nice_to_have, keywords
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Score Experiences    │  Your experience bank → relevance scores (0-100 each)
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Draft Resume         │  Top experiences → tailored resume with rewritten bullets
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Evaluate (Brutally   │  Separate "honest critic" persona scores the draft
│ Honest)              │  → fit_score, gaps, revision_instructions
└──────────┬──────────┘
           │ revision_needed? (always yes on first pass)
           ▼
┌─────────────────────┐
│ Revise Resume        │  Apply feedback → improved resume
└──────────┬──────────┘
           │ loop back to Evaluate (max 3 revisions)
           ▼
┌─────────────────────┐
│ Final Output         │  Resume + score + recommendation + PDF
└─────────────────────┘
```

The key design insight: the evaluator is a **separate API call** from the writer. It uses a "brutally honest" system prompt and has no memory of having written the resume. This prevents self-congratulatory scoring and produces calibrated assessments.

## Quick Start

```bash
# Install dependencies
npm install

# Kill any stale processes on the required ports
npx kill-port 5173 3001

# Start both the backend server and frontend dev server
npm run dev

# Open in browser
open http://localhost:5173
```

On first use:
1. Go to the **My Experience** tab and fill in your personal info + all experiences
2. Go to **Generate Resume**, enter your Anthropic API key (or type `demo` for demo mode)
3. Paste a job description, enter the company name, and click **Generate Resume**

## Features

- **Experience Bank** — Store all your work, volunteer, projects, and education. Persists in localStorage across sessions.
- **Multi-Step Agent Pipeline** — 5 discrete AI steps with guaranteed revision loop. Not a single-shot prompt.
- **Brutally Honest Scoring** — Separate evaluator persona that doesn't sugar-coat. Recommendations: Apply Now / Apply / Apply with Caveats / Upskill First / Look Elsewhere.
- **Harvard-Template PDF Export** — One-click download. Times New Roman, proper margins, ATS-friendly formatting.
- **Company-Titled History** — Last 10 generated resumes, each titled by company name.
- **PDF Upload** — Upload job descriptions as PDFs. Client-side text extraction via pdfjs-dist.
- **Agent Trace** — Inspect every step the agent took via `GET /api/trace`.
- **Demo Mode** — Type `demo` as the API key to explore the UI without API costs.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS v4, Vite 8 |
| Backend | Express 5 (Node.js) |
| LLM | Claude Sonnet 4.6 via @anthropic-ai/sdk |
| Agent | Custom orchestrator (agent.js) with 5 tool functions |
| PDF Export | jsPDF (Harvard template) |
| PDF Import | pdfjs-dist (text extraction) |
| Persistence | Browser localStorage |
| Dev Tooling | concurrently, ESLint |

## Project Structure

```
jobfit-ai/
├── server.js                    # Express backend — API endpoints + validation
├── agent.js                     # Multi-step agent pipeline (orchestrator + 5 tools)
├── test-agent.js                # Standalone agent test with trace output
├── vite.config.js               # Vite + Tailwind + /api proxy
├── package.json
├── eslint.config.js
├── index.html
├── public/                      # Static assets
└── src/
    ├── App.jsx                  # Root — tab navigation, history state
    ├── api.js                   # Frontend fetch wrapper
    ├── store.js                 # localStorage CRUD + demo data
    ├── evalCases.js             # Test cases for eval dashboard
    ├── index.css                # Tailwind entry
    ├── main.jsx                 # React root
    └── components/
        ├── ExperiencePage.jsx   # Experience bank manager
        ├── GeneratorPage.jsx    # Job input, API key, resume preview, PDF
        ├── HistoryPanel.jsx     # History view (titled by company)
        ├── ScoreIndicator.jsx   # Animated SVG score ring
        └── EvalDashboard.jsx    # Legacy eval harness
```

## Agent Pipeline Details

Each step is a focused Claude API call with a narrow system prompt:

### Step 1: Extract Requirements
Parses the raw job description into structured data:
```json
{
  "must_have": ["5+ years backend experience", "Go or Python", ...],
  "nice_to_have": ["time-series databases", ...],
  "keywords": ["Kubernetes", "Kafka", "distributed systems", ...],
  "seniority_level": "senior",
  "role_type": "backend engineer",
  "years_experience": "5+"
}
```

### Step 2: Score Experiences
Each experience from your bank gets a relevance score:
```json
[
  { "exp_id": "exp-1", "relevance_score": 85, "rationale": "Direct microservices experience at scale" },
  { "exp_id": "exp-4", "relevance_score": 30, "rationale": "Education only tangentially relevant" }
]
```

### Step 3: Draft Resume
Uses top-scored experiences to create a tailored resume. Rewrites bullet points to incorporate job keywords. Drops low-relevance experiences.

### Step 4: Evaluate Resume
A **separate** API call with a "brutally honest" system prompt. Scores the draft 0-100 and provides specific revision instructions. First evaluation always forces a revision.

### Step 5: Revise Resume
Applies the evaluator's feedback. Common revisions: strengthen specific bullets, add quantified metrics, reorder sections for impact.

Steps 4-5 loop until the evaluator is satisfied or 3 revisions are reached.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/validate` | Validate API key (or enter demo mode with `"demo"`) |
| POST | `/api/generate` | Run full agent pipeline → tailored resume |
| POST | `/api/analyze` | Legacy single-call analyzer (eval dashboard) |
| GET | `/api/trace` | Last agent execution trace (debug) |
| GET | `/api/status` | Health check |

## Testing the Agent

Run the agent standalone with full trace output:

```bash
ANTHROPIC_API_KEY=sk-ant-your-key node test-agent.js
```

This sends a sample job description (Datadog Senior Backend Engineer) through the full pipeline and prints each step: requirements extracted, experiences scored, draft created, evaluation with revision instructions, and final result.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend together |
| `npm run dev:server` | Start only the Express backend |
| `npm run dev:client` | Start only the Vite frontend |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |

## Data Persistence

All user data lives in the browser's `localStorage`:

| Data | Survives |
|------|----------|
| Personal info (name, email, etc.) | Page refresh, browser restart, server restart |
| Experience bank (all entries) | Page refresh, browser restart, server restart |
| Generated resume history (last 10) | Page refresh, browser restart, server restart |
| API key | Server restart clears it (re-enter next session) |

## Cost

The agent makes 7-9 Claude API calls per generation (extract + score + draft + evaluate + revise + evaluate, sometimes another revise cycle). Typical cost: ~$0.05-0.10 per resume generated. Demo mode is free.

## Architecture Decisions

**Why a multi-step agent instead of one prompt?**
A single prompt asks the LLM to write AND judge simultaneously. The writer has incentive to score its own work highly. By separating the evaluator into a different call with a "brutally honest" persona, we get calibrated scores and actionable feedback that the revision step can act on.

**Why force the first revision?**
First drafts are never optimal. By always triggering at least one revision cycle, we guarantee improvement without relying on the model to self-identify weaknesses on the first pass.

**Why max 3 revisions?**
Diminishing returns. Most resumes converge after 1-2 passes. The cap prevents pathological loops and keeps generation time under 30 seconds.

**Why backend proxy?**
The API key never appears in browser DevTools network traffic. All Claude calls happen server-side. The frontend bundle doesn't include the Anthropic SDK.

**Why localStorage over a database?**
This is a personal tool. One user, one browser. localStorage is zero-config, instant, and survives indefinitely. No server-side persistence needed.

## Limitations

- No `.docx` upload support
- Image-based/scanned PDFs won't extract text
- Single-user (one API key stored globally in server memory)
- No streaming — full loading spinner during generation (~15-30s)
- Requires `npx kill-port 5173 3001` if stale processes exist from prior runs

## License

Private / Personal Use
