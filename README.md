# JobFit AI

A personal AI-powered job application toolkit. Store your experience once, then for any job: search matching roles, generate a tailored resume with a multi-step agent pipeline, get a brutally honest fit assessment, produce a cover letter, export to PDF or DOCX, and track your applications — all from one interface.

## Quick Start

```bash
npm install
npx kill-port 5173 3001
npm run dev
```

Open `http://localhost:5173`. A welcome page walks you through the features. Click **Get Started**, then:

1. **Experience tab** — Add your personal info, work history, skills, and references (or upload an existing resume)
2. **Search tab** — Click "Find Matching Jobs" to discover roles that fit your profile
3. **Generate tab** — Connect your AI provider (Claude or GPT-4o), paste a job description, and generate a tailored resume
4. **Tracker tab** — Track applications from Applied through Offered/Rejected

Type `demo` as the API key on the Generate tab to explore without API costs.

## What It Does

### Experience Bank
Store all your work experience, volunteer work, projects, education, skills (technical, frameworks, tools, certifications), and professional references. Everything persists in your browser's localStorage — fill it in once and it's there whenever you come back. Upload an existing resume PDF to auto-populate entries via AI parsing.

### Job Matching
One click searches job boards (via JSearch/RapidAPI) using your most recent job title. Each listing gets a fit score from a single batch LLM call that evaluates all results against your full profile. Listings sort by fit score. Dismiss irrelevant ones. Click any listing to see the full description, then "Generate Resume" to pre-fill the generator.

### Resume Generation (Multi-Step Agent Pipeline)
Not a single-shot prompt. The generation pipeline runs 5 discrete AI steps:

```
Extract Requirements → Score Experiences → Draft Resume → Evaluate (Brutally Honest) → Revise
                                                                    ↕ loop (min 1, max 3)
```

1. **Extract Requirements** — Parses the job description into structured must-haves, nice-to-haves, keywords, and seniority level
2. **Score Experiences** — Scores each entry in your experience bank 0-100 against the requirements
3. **Draft Resume** — Selects top-scoring experiences, rewrites bullet points with job keywords, generates a tailored professional summary
4. **Evaluate** — A separate "brutally honest" API call scores the draft. First evaluation always forces at least one revision
5. **Revise** — Applies specific feedback from the evaluator. Loops back to evaluate until satisfied or 3 revisions hit

The evaluator is a different LLM call from the writer. It has a "brutally honest" system prompt and no memory of writing the resume. This separation prevents self-congratulatory scoring.

### Fit Assessment
Every generated resume comes with:
- **Fit score** (0-100) with color-coded ring
- **Recommendation**: Apply Now / Apply / Apply with Caveats / Upskill First / Look Elsewhere
- **Strengths**: What aligns with the job
- **Gaps**: What's missing, honestly
- **Reality check**: Interview chances and competitive position

### ATS Keyword Analysis
Toggle the ATS Keywords button after generation. It extracts frequently-used terms from the job description, checks which appear in your resume vs. which are missing, and shows a match rate percentage. No API call — runs entirely client-side.

### Cover Letter Generation
One-click generates a professional 3-4 paragraph cover letter that references specific achievements from your tailored resume. Copy to clipboard with one click.

### Export
- **PDF** — Harvard-template format: Times New Roman, centered name, horizontal rules, bold titles with italic dates, proper margins. ATS-friendly
- **DOCX** — Word document with the same structure. Better for ATS systems that struggle with PDFs
- **Clipboard** — Plain text copy

### Application Tracker
Track every job application with status management:
- **Statuses**: Applied → Interviewing → Offered / Rejected / Ghosted
- **Notes field** for interview dates, contacts, follow-ups
- **Fit score** carried over from generation
- **Job description** preserved for reference
- Click "Mark Applied" on any generated resume to add it automatically

### Dual AI Provider Support
Choose between **Claude** (Anthropic) or **GPT-4o** (OpenAI) on the Generate tab. Both providers use the same prompts through a unified abstraction. The entire agent pipeline is provider-agnostic.

### Demo Mode
Type `demo` as the API key. Pre-populates the experience bank with a sample software engineer profile, returns mock results for all features. No API keys or costs needed.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS v4, Vite 8, Lucide icons |
| Backend | Express 5 (Node.js, ESM) |
| LLM | Claude Sonnet 4.6 or GPT-4o via provider abstraction |
| Agent | Custom multi-step orchestrator with 5 tool functions |
| Job Search | JSearch via RapidAPI (free tier: 100 req/day) |
| PDF Export | jsPDF (Harvard template) |
| DOCX Export | docx + file-saver |
| PDF Import | pdfjs-dist (client-side text extraction) |
| Persistence | Browser localStorage |
| Dev Tooling | concurrently, ESLint |

## Project Structure

```
jobfit-ai/
├── server.js                    # Express backend — all API endpoints, validation, caching
├── agent.js                     # Multi-step agent pipeline (5 tools + orchestrator)
├── provider.js                  # LLM provider abstraction (Anthropic + OpenAI)
├── test-agent.js                # Standalone agent test with trace output
├── vite.config.js               # Vite + Tailwind + /api proxy
├── package.json
├── eslint.config.js
├── index.html
├── public/                      # Static assets
└── src/
    ├── App.jsx                  # Root — welcome page, tab navigation, cross-tab state
    ├── api.js                   # Frontend fetch wrappers for all endpoints
    ├── store.js                 # localStorage CRUD (experiences, skills, refs, apps) + demo data
    ├── evalCases.js             # 3 test cases for eval harness
    ├── index.css                # Design system (Inter font, 8px grid, color tokens)
    ├── main.jsx                 # React root
    └── components/
        ├── ExperiencePage.jsx   # Experience bank + skills + references + resume upload
        ├── SearchPage.jsx       # Job matching — search, score, dismiss, generate
        ├── GeneratorPage.jsx    # Resume generation + cover letter + ATS + exports
        ├── TrackerPage.jsx      # Application tracker with status management
        ├── HistoryPanel.jsx     # Last 10 generated resumes titled by company
        ├── ScoreIndicator.jsx   # Animated SVG score ring (compact + full)
        └── EvalDashboard.jsx    # Eval harness for testing scoring consistency
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/validate` | Validate LLM API key + select provider (or `"demo"` for demo mode) |
| POST | `/api/generate` | Run full agent pipeline → tailored resume + fit analysis |
| POST | `/api/cover-letter` | Generate cover letter from resume + job description |
| POST | `/api/analyze` | Single-call fit analysis (used by eval dashboard) |
| POST | `/api/parse-resume` | Parse uploaded resume text into structured experience entries |
| POST | `/api/jobs/configure` | Validate and store RapidAPI key for job search |
| POST | `/api/jobs/search` | Search JSearch API with caching (5 min TTL, 50 max entries) |
| POST | `/api/jobs/score` | Batch LLM scoring of job listings against user profile |
| GET | `/api/jobs/status` | Check if search API is configured |
| GET | `/api/trace` | Last agent execution trace (debug) |
| GET | `/api/status` | Health check |

## API Keys

| Key | Purpose | Where to enter | Free tier |
|-----|---------|----------------|-----------|
| Anthropic or OpenAI | Resume generation, scoring, cover letters | Generate tab | Pay per use |
| RapidAPI (JSearch) | Job board search | Search tab | 100 requests/day |

Both keys are held in server memory only, never persisted to disk.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend (port 3001) + frontend (port 5173) together |
| `npm run dev:server` | Start only the Express backend |
| `npm run dev:client` | Start only the Vite frontend |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Run ESLint |
| `ANTHROPIC_API_KEY=sk-ant-... node test-agent.js` | Run agent pipeline standalone with trace |

## Data Persistence

All user data lives in the browser's localStorage:

| Data | Storage Key | Persists Across |
|------|-------------|-----------------|
| Personal info | `jobfit-personal-info` | Browser restart, server restart |
| Experience bank | `jobfit-experiences` | Browser restart, server restart |
| Skills | `jobfit-skills` | Browser restart, server restart |
| References | `jobfit-references` | Browser restart, server restart |
| Application tracker | `jobfit-applications` | Browser restart, server restart |
| Generated resume history (last 10) | `jobfit-history` | Browser restart, server restart |
| Welcome page flag | `jobfit-welcomed` | Browser restart, server restart |
| API keys | Server memory only | Lost on server restart |

## Cost

The agent makes 7-9 LLM calls per resume generation. Typical cost: ~$0.05-0.10 per resume. Cover letter adds 1 call (~$0.01). Job scoring adds 1 call per batch (~$0.02). Demo mode is free.

## Architecture Decisions

**Multi-step agent over single prompt** — Separating the writer from the evaluator produces better output. The same model that wrote the resume can't honestly judge it in the same context. The revision loop guarantees at least one improvement pass.

**Provider abstraction** — Both Anthropic and OpenAI are wrapped behind a `complete(userMessage, systemPrompt, maxTokens)` interface. The agent pipeline and all endpoints are provider-agnostic. Adding a new provider means implementing one class.

**Batch scoring for job search** — Instead of running the full agent pipeline for each listing (8 calls each), one LLM call scores all listings at once against a condensed experience summary. Same cost as a single analyze call.

**Backend proxy** — API keys never appear in browser network traffic. All LLM calls happen server-side. The frontend bundle doesn't include any LLM SDK.

**localStorage over a database** — Personal tool, one user, one browser. Zero config, instant, survives indefinitely. No server-side persistence needed.

**Harvard PDF template** — Times New Roman, 72pt margins, centered name in bold caps, horizontal rules under headings, italic dates right-aligned. Standard ATS-friendly format that works across industries.

## Limitations

- Image-based/scanned PDFs won't extract text (would need OCR)
- Single-user — server stores one API key globally in memory
- No streaming — loading spinner during generation (~15-30 seconds)
- Job search requires free RapidAPI key registration
- Must kill stale processes before restarting (`npx kill-port 5173 3001`)

## License

Private / Personal Use
