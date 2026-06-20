import express from "express";
import { randomUUID } from "crypto";
import { createProvider, validateProvider } from "./provider.js";
import { runResumeAgent } from "./agent.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

let activeProvider = null;
let demoMode = false;

const DEMO_RESULT = {
  fit_score: 82,
  strengths: [
    "Strong technical background aligning with core requirements",
    "Demonstrated experience leading cross-functional teams",
    "Proven track record of delivering projects on time and within budget",
    "Excellent communication skills evidenced by stakeholder presentations",
  ],
  gaps: [
    "No direct experience with the specific industry vertical",
    "Missing certification listed as a preferred qualification",
    "Limited exposure to the required cloud platform",
  ],
  recommendation: "HIRE",
  reasoning:
    "The candidate demonstrates strong alignment with the core technical and leadership requirements. While there are some gaps in industry-specific experience and certifications, their transferable skills and track record suggest they would ramp up quickly. Recommend proceeding to the next interview round.",
};

const VALID_RECOMMENDATIONS = ["STRONG_HIRE", "HIRE", "LEAN_HIRE", "LEAN_NO_HIRE", "NO_HIRE"];

function validateAnalysis(data) {
  if (typeof data !== "object" || data === null) {
    throw new Error("Response is not a JSON object");
  }
  if (typeof data.fit_score !== "number" || data.fit_score < 0 || data.fit_score > 100 || !Number.isInteger(data.fit_score)) {
    throw new Error(`Invalid fit_score: expected integer 0-100, got ${JSON.stringify(data.fit_score)}`);
  }
  if (!Array.isArray(data.strengths) || data.strengths.length === 0 || !data.strengths.every((s) => typeof s === "string")) {
    throw new Error("Invalid strengths: expected non-empty array of strings");
  }
  if (!Array.isArray(data.gaps) || data.gaps.length === 0 || !data.gaps.every((g) => typeof g === "string")) {
    throw new Error("Invalid gaps: expected non-empty array of strings");
  }
  if (!VALID_RECOMMENDATIONS.includes(data.recommendation)) {
    throw new Error(`Invalid recommendation: "${data.recommendation}", expected one of ${VALID_RECOMMENDATIONS.join(", ")}`);
  }
  if (typeof data.reasoning !== "string" || data.reasoning.trim().length === 0) {
    throw new Error("Invalid reasoning: expected non-empty string");
  }
  return data;
}

const SYSTEM_PROMPT = `You are an expert recruiting analyst. Given a resume and a job description, produce a structured fit analysis.

You MUST respond with valid JSON only — no markdown, no code fences, no explanation outside the JSON.

The JSON must have exactly these fields:
{
  "fit_score": <integer 0-100>,
  "strengths": [<array of 3-6 specific strength strings showing alignment between resume and job>],
  "gaps": [<array of 2-5 specific gap strings showing missing qualifications or experience>],
  "recommendation": "<one of: STRONG_HIRE, HIRE, LEAN_HIRE, LEAN_NO_HIRE, NO_HIRE>",
  "reasoning": "<2-4 sentence explanation of your recommendation>"
}

Scoring guidelines:
- 85-100: Exceptional fit, candidate exceeds most requirements
- 70-84: Strong fit, candidate meets most requirements with minor gaps
- 55-69: Borderline fit, candidate has relevant transferable skills but notable gaps
- 40-54: Weak fit, significant skill/experience mismatches
- 0-39: Poor fit, fundamental misalignment between background and role

Be calibrated and honest. A chef applying for a data science role should score below 40. A software engineer applying for a software engineer role with matching tech stack should score 80+. Evaluate transferable skills fairly for borderline cases.`;

app.post("/api/validate", async (req, res) => {
  const { apiKey, provider: providerName } = req.body;
  if (!apiKey || typeof apiKey !== "string") {
    return res.json({ valid: false, error: "API key is required." });
  }
  if (apiKey === "demo") {
    demoMode = true;
    activeProvider = null;
    return res.json({ valid: true, demo: true });
  }

  const name = providerName || "anthropic";
  if (name !== "anthropic" && name !== "openai") {
    return res.json({ valid: false, error: `Unknown provider: ${name}. Use "anthropic" or "openai".` });
  }

  demoMode = false;
  try {
    const provider = createProvider(name, apiKey);
    const { valid, error } = await validateProvider(provider);
    if (valid) {
      activeProvider = provider;
      res.json({ valid: true, demo: false, provider: name });
    } else {
      activeProvider = null;
      res.json({ valid: false, error });
    }
  } catch (err) {
    activeProvider = null;
    res.json({ valid: false, error: `Connection failed: ${err.message}` });
  }
});

app.post("/api/analyze", async (req, res) => {
  const { resume, jobDescription } = req.body;
  if (!resume || !jobDescription) {
    return res.status(400).json({ error: "Resume and job description are required." });
  }

  if (demoMode) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return res.json(DEMO_RESULT);
  }

  if (!activeProvider) {
    return res.status(401).json({ error: "API not initialized. Please enter your API key." });
  }

  try {
    const text = await activeProvider.complete(
      `Analyze the fit between this resume and job description.\n\nRESUME:\n${resume}\n\nJOB DESCRIPTION:\n${jobDescription}`,
      SYSTEM_PROMPT,
      1024,
    );

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse response as JSON");
      }
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("Failed to parse response as JSON");
      }
    }

    res.json(validateAnalysis(parsed));
  } catch (err) {
    res.status(500).json({ error: err.message || "Analysis failed." });
  }
});

const DEMO_GENERATE_RESULT = {
  resume: {
    name: "Alex Chen",
    email: "alex.chen@email.com",
    phone: "+1 415-555-0192",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/alexchen",
    github: "github.com/alexchen",
    summary: "Senior Software Engineer with 6 years of experience building scalable web applications and distributed systems. Proven track record of designing high-throughput microservices, leading cross-functional teams, and driving engineering best practices including comprehensive testing and CI/CD automation.",
    sections: [
      {
        heading: "Professional Experience",
        items: [
          {
            title: "Senior Software Engineer",
            subtitle: "Stripe",
            dates: "Mar 2021 – Present",
            bullets: [
              "Architected and led development of a real-time payment processing dashboard serving 10K+ merchants, leveraging React, TypeScript, and GraphQL to deliver sub-200ms page loads",
              "Designed microservices architecture handling 50K requests/second using Node.js, Kubernetes, and event-driven patterns, achieving 99.99% uptime",
              "Optimized API performance by 40% through strategic query optimization, Redis caching layers, and database indexing improvements",
              "Mentored 4 junior engineers through structured code review sessions and 1:1 growth plans, with 2 promoted within 18 months",
              "Championed end-to-end testing adoption with Playwright, driving test coverage from 45% to 89% and reducing production incidents by 35%",
            ],
          },
          {
            title: "Software Engineer",
            subtitle: "Coinbase",
            dates: "Jun 2019 – Feb 2021",
            bullets: [
              "Built and maintained a React component library adopted by 12 product teams, reducing frontend development time by 30% and ensuring design consistency",
              "Implemented secure OAuth 2.0 authentication flow and granular role-based access control system for internal tooling platform",
              "Engineered CI/CD pipeline using GitHub Actions that reduced deployment cycle from 45 minutes to 8 minutes, enabling multiple daily releases",
              "Maintained 99.95% uptime SLA through proactive on-call incident response and post-mortem driven reliability improvements",
            ],
          },
          {
            title: "Junior Software Engineer",
            subtitle: "Twilio",
            dates: "Jul 2018 – May 2019",
            bullets: [
              "Developed high-throughput REST APIs in Python/Flask for SMS routing engine processing 1M+ messages daily with 99.9% delivery rate",
              "Achieved 92% code coverage through comprehensive unit and integration testing with pytest, reducing regression bugs by 60%",
            ],
          },
        ],
      },
      {
        heading: "Projects",
        items: [
          {
            title: "OpenTracker",
            subtitle: "Open Source",
            dates: "2023 – Present",
            bullets: [
              "Created real-time analytics dashboard handling 100K+ events/minute with sub-100ms rendering using React, D3.js, and WebSockets",
              "Deployed on AWS (ECS, CloudFront, DynamoDB) with infrastructure-as-code; 800+ GitHub stars and featured in JavaScript Weekly",
            ],
          },
        ],
      },
      {
        heading: "Education",
        items: [
          {
            title: "B.S. Computer Science",
            subtitle: "University of California, Berkeley",
            dates: "2014 – 2018",
            bullets: [
              "Coursework: Distributed Systems, Machine Learning, Algorithms, Database Systems",
              "Dean's List 2016-2018 · Teaching Assistant for CS 61B: Data Structures",
            ],
          },
        ],
      },
    ],
    skills: "TypeScript, JavaScript, Python, React, Next.js, Node.js, GraphQL, REST APIs, PostgreSQL, Redis, DynamoDB, AWS, GCP, Kubernetes, Docker, Terraform, CI/CD, Git, Playwright, Jest, pytest",
    references: [
      { name: "Sarah Kim", title: "Engineering Manager", organization: "Stripe", email: "sarah.kim@stripe.com", phone: "+1 415-555-0201" },
    ],
  },
  fit_score: 88,
  strengths: [
    "6 years of professional software engineering experience exceeds the 5-year requirement",
    "Deep React, TypeScript, and Node.js expertise directly matches core tech stack requirements",
    "Proven microservices and distributed systems experience at scale (50K req/s at Stripe)",
    "Strong mentorship track record with measurable outcomes (2 reports promoted)",
    "Extensive CI/CD and testing experience aligns with engineering best practices requirement",
    "Open-source contributions and community involvement demonstrate initiative",
  ],
  gaps: [
    "No explicit Go experience mentioned, which is listed in the job's nice-to-have",
    "Could strengthen data pipeline experience for the Python data processing requirement",
  ],
  recommendation: "STRONG_HIRE",
  reasoning: "The tailored resume presents an exceptionally strong fit for this Senior Software Engineer role. Bullet points were rewritten to emphasize scalable system design, team leadership, and quantified impact metrics that directly mirror the job requirements. The volunteer mentoring and open-source work were strategically included to reinforce the mentorship and community contribution aspects of the role. The only notable gaps are around Go experience and data pipelines, both listed as nice-to-haves rather than requirements.",
};

function validateGeneratedResume(data) {
  if (typeof data !== "object" || data === null) {
    throw new Error("Response is not a JSON object");
  }
  if (!data.resume || typeof data.resume !== "object") {
    throw new Error("Missing resume object in response");
  }
  const r = data.resume;
  if (typeof r.name !== "string" || !r.name.trim()) {
    throw new Error("Missing resume name");
  }
  if (!Array.isArray(r.sections) || r.sections.length === 0) {
    throw new Error("Resume must have at least one section");
  }
  for (const section of r.sections) {
    if (!section.heading || typeof section.heading !== "string") {
      throw new Error("Each section needs a heading string");
    }
    if (!Array.isArray(section.items) || section.items.length === 0) {
      throw new Error(`Section "${section.heading}" has no items`);
    }
    for (const item of section.items) {
      if (!item.title || typeof item.title !== "string") {
        throw new Error("Each item needs a title string");
      }
      if (!Array.isArray(item.bullets)) {
        throw new Error(`Item "${item.title}" is missing bullets array`);
      }
    }
  }
  if (r.references !== undefined && !Array.isArray(r.references)) {
    throw new Error("References must be an array if present");
  }
  if (Array.isArray(r.references)) {
    for (const ref of r.references) {
      if (!ref.name || typeof ref.name !== "string") {
        throw new Error("Each reference needs a name string");
      }
    }
  }
  validateAnalysis(data);
  return data;
}

app.post("/api/generate", async (req, res) => {
  const { personalInfo, experiences, jobDescription } = req.body;
  if (!personalInfo || !experiences || !jobDescription) {
    return res.status(400).json({ error: "Personal info, experiences, and job description are required." });
  }

  if (demoMode) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return res.json(DEMO_GENERATE_RESULT);
  }

  if (!activeProvider) {
    return res.status(401).json({ error: "API not initialized. Please enter your API key." });
  }

  try {
    const { result, trace } = await runResumeAgent(activeProvider, {
      personalInfo,
      experiences,
      jobDescription,
    });

    lastTrace = trace;

    console.log("\n=== AGENT TRACE ===");
    for (const step of trace) {
      console.log(`[${step.timestamp}] ${step.step} (${step.provider})`);
    }
    console.log(`=== ${trace.length} steps completed ===\n`);

    res.json(validateGeneratedResume(result));
  } catch (err) {
    console.error("Agent error:", err.message);
    res.status(500).json({ error: err.message || "Resume generation failed." });
  }
});

app.post("/api/parse-resume", async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText || typeof resumeText !== "string") {
    return res.status(400).json({ error: "Resume text is required." });
  }

  if (demoMode) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return res.json({
      personalInfo: {
        name: "Alex Chen",
        email: "alex.chen@email.com",
        phone: "+1 415-555-0192",
        location: "San Francisco, CA",
        linkedin: "linkedin.com/in/alexchen",
        github: "github.com/alexchen",
        summary: "",
      },
      experiences: [
        {
          type: "work",
          title: "Senior Software Engineer",
          organization: "Stripe",
          startDate: "Mar 2021",
          endDate: "Present",
          description: "• Led development of payment processing dashboard\n• Designed microservices architecture",
        },
      ],
    });
  }

  if (!activeProvider) {
    return res.status(401).json({ error: "API not initialized. Please enter your API key on the Generate tab first." });
  }

  try {
    const text = await activeProvider.complete(
      `Parse this resume into structured data.\n\nRESUME TEXT:\n${resumeText}\n\nExtract and output JSON:\n{\n  "personalInfo": {\n    "name": "<full name>",\n    "email": "<email or empty string>",\n    "phone": "<phone or empty string>",\n    "location": "<location or empty string>",\n    "linkedin": "<linkedin url or empty string>",\n    "github": "<github url or empty string>",\n    "summary": "<professional summary if present, or empty string>"\n  },\n  "experiences": [\n    {\n      "type": "<work, volunteer, project, or education>",\n      "title": "<job title / degree / project name>",\n      "organization": "<company / school / org>",\n      "startDate": "<start date or empty string>",\n      "endDate": "<end date or 'Present' or empty string>",\n      "description": "<bullet points joined with newlines, each starting with •>"\n    }\n  ]\n}\n\nInclude ALL experiences from the resume. Use "work" for jobs, "education" for degrees, "project" for projects, "volunteer" for volunteer work.`,
      `You parse resumes into structured JSON. Extract every experience entry, preserving bullet points exactly. Output valid JSON only.`,
      4096,
    );

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Failed to parse resume");
      parsed = JSON.parse(match[0]);
    }

    if (!parsed.personalInfo || !Array.isArray(parsed.experiences)) {
      throw new Error("Invalid parsed resume structure");
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to parse resume." });
  }
});

// ── Cover Letter ──

app.post("/api/cover-letter", async (req, res) => {
  const { personalInfo, resume, jobDescription, companyName } = req.body;
  if (!resume || !jobDescription) {
    return res.status(400).json({ error: "Resume and job description are required." });
  }

  if (demoMode) {
    await new Promise((r) => setTimeout(r, 1500));
    return res.json({
      coverLetter: `Dear Hiring Manager,\n\nI am writing to express my strong interest in the Senior Software Engineer position at ${companyName || "your company"}. With over six years of experience building scalable web applications and distributed systems at companies like Stripe and Coinbase, I am confident in my ability to make an immediate impact on your team.\n\nIn my current role at Stripe, I led the development of a real-time payment processing dashboard serving over 10,000 merchants, leveraging React, TypeScript, and GraphQL. I also designed a microservices architecture handling 50,000 requests per second, which directly aligns with the high-throughput systems your team builds. My experience mentoring junior engineers and driving testing best practices demonstrates my commitment to team growth and engineering excellence.\n\nI am particularly drawn to this opportunity because of the chance to work on infrastructure that operates at massive scale. My track record of reducing API latency by 40% through strategic optimization and my experience with Kubernetes and cloud infrastructure position me well to contribute from day one.\n\nI would welcome the opportunity to discuss how my experience and skills align with your team's needs. Thank you for your consideration.\n\nSincerely,\n${personalInfo?.name || "Alex Chen"}`,
    });
  }

  if (!activeProvider) {
    return res.status(401).json({ error: "API not initialized. Connect your API key on the Generate tab." });
  }

  try {
    const text = await activeProvider.complete(
      `Write a cover letter for this job application.\n\nCANDIDATE NAME: ${personalInfo?.name || "Unknown"}\n\nTAILORED RESUME:\n${JSON.stringify(resume, null, 2)}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nCOMPANY: ${companyName || "Unknown"}\n\nOutput a JSON object:\n{\n  "coverLetter": "<the full cover letter text, using \\n for line breaks>"\n}`,
      `You write professional, concise cover letters. The letter should be 3-4 paragraphs, reference specific achievements from the resume that align with the job requirements, and explain why the candidate is a strong fit. Be professional but not generic — mention specific technologies, metrics, and experiences. Do not use placeholder text. Output valid JSON only.`,
      2048,
    );

    let parsed;
    try { parsed = JSON.parse(text); }
    catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Failed to parse cover letter");
      parsed = JSON.parse(match[0]);
    }

    if (!parsed.coverLetter || typeof parsed.coverLetter !== "string") {
      throw new Error("Invalid cover letter response");
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || "Cover letter generation failed." });
  }
});

// ── Job Search ──

let searchApiKey = null;
const searchCache = new Map();
const CACHE_TTL = 300000;
const CACHE_MAX = 50;

function getCached(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { searchCache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  if (searchCache.size >= CACHE_MAX) {
    const oldest = searchCache.keys().next().value;
    searchCache.delete(oldest);
  }
  searchCache.set(key, { data, timestamp: Date.now() });
}

const DEMO_JOBS = [
  { id: "demo-j1", title: "Senior Frontend Engineer", company: "Stripe", location: "San Francisco, CA", description: "We're looking for a Senior Frontend Engineer to join our Dashboard team. You'll build high-performance React applications used by millions of businesses worldwide.\n\nRequirements:\n- 5+ years of frontend engineering experience\n- Expert proficiency in React, TypeScript, and modern CSS\n- Experience with GraphQL and REST APIs\n- Strong understanding of web performance optimization\n- Experience with design systems and component libraries\n\nNice to have:\n- Experience with payment systems or fintech\n- Contributions to open-source projects\n- Experience with Next.js or server-side rendering", url: "https://stripe.com/jobs", posted: "2 days ago", salary: "$180,000 - $250,000" },
  { id: "demo-j2", title: "Full Stack Engineer", company: "Vercel", location: "Remote", description: "Join Vercel to build the future of web development. You'll work on our deployment platform and developer tools used by millions.\n\nRequirements:\n- 3+ years of full stack development experience\n- Strong TypeScript and Node.js skills\n- Experience with React and Next.js\n- Familiarity with cloud infrastructure (AWS, GCP)\n- Experience with CI/CD pipelines\n\nNice to have:\n- Experience with edge computing\n- Knowledge of Rust or Go\n- Open-source contributions", url: "https://vercel.com/careers", posted: "1 week ago", salary: "$150,000 - $210,000" },
  { id: "demo-j3", title: "Backend Engineer - Infrastructure", company: "Datadog", location: "New York, NY", description: "We're seeking a Backend Engineer to build high-throughput data pipelines processing trillions of data points per day.\n\nRequirements:\n- 5+ years of backend engineering experience\n- Strong proficiency in Go or Python\n- Experience with distributed systems\n- Familiarity with Kubernetes and Docker\n- Experience with message queues (Kafka, RabbitMQ)\n\nNice to have:\n- Experience with time-series databases\n- Knowledge of eBPF or kernel-level monitoring\n- Experience at petabyte scale", url: "https://datadog.com/careers", posted: "3 days ago", salary: "$190,000 - $240,000" },
  { id: "demo-j4", title: "Product Designer", company: "Linear", location: "Remote", description: "We're hiring a Product Designer to shape the future of project management tools.\n\nRequirements:\n- 4+ years of product design experience\n- Strong portfolio demonstrating UI/UX work\n- Proficiency in Figma\n- Experience with design systems\n- Ability to write basic HTML/CSS\n\nNice to have:\n- Experience with developer tools\n- Motion design skills\n- Experience with user research", url: "https://linear.app/careers", posted: "5 days ago", salary: "$140,000 - $190,000" },
  { id: "demo-j5", title: "Machine Learning Engineer", company: "OpenAI", location: "San Francisco, CA", description: "Join our team to build and deploy large-scale ML systems.\n\nRequirements:\n- MS/PhD in Computer Science or related field\n- 3+ years of ML engineering experience\n- Expert proficiency in Python, PyTorch or TensorFlow\n- Experience training and deploying large models\n- Strong understanding of transformer architectures\n\nNice to have:\n- Published research in ML/AI\n- Experience with RLHF\n- Distributed training experience", url: "https://openai.com/careers", posted: "1 day ago", salary: "$250,000 - $400,000" },
];

const DEMO_SCORES = [
  { job_id: "demo-j1", fit_score: 88, reason: "Strong React/TypeScript match with relevant dashboard and component library experience" },
  { job_id: "demo-j2", fit_score: 82, reason: "Solid full-stack background with Node.js and React, though limited Next.js experience" },
  { job_id: "demo-j3", fit_score: 65, reason: "Has distributed systems experience but lacks Go proficiency and data pipeline focus" },
  { job_id: "demo-j4", fit_score: 22, reason: "Engineering background doesn't align with product design role requirements" },
  { job_id: "demo-j5", fit_score: 35, reason: "No ML/AI experience or relevant academic background" },
];

app.post("/api/jobs/configure", async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== "string") {
    return res.json({ valid: false, error: "API key is required." });
  }
  if (demoMode) {
    searchApiKey = "demo";
    return res.json({ valid: true });
  }
  try {
    const testRes = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=test&num_pages=1`,
      { headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "jsearch.p.rapidapi.com" } },
    );
    if (!testRes.ok) {
      const body = await testRes.text();
      if (testRes.status === 403 || testRes.status === 401) {
        return res.json({ valid: false, error: "Invalid RapidAPI key." });
      }
      return res.json({ valid: false, error: `API error: ${body.slice(0, 100)}` });
    }
    searchApiKey = apiKey;
    res.json({ valid: true });
  } catch (err) {
    res.json({ valid: false, error: `Connection failed: ${err.message}` });
  }
});

app.get("/api/jobs/status", (_req, res) => {
  res.json({ configured: !!searchApiKey || demoMode });
});

app.post("/api/jobs/search", async (req, res) => {
  const { query, location, page } = req.body;
  if (!query || typeof query !== "string" || query.length > 200) {
    return res.status(400).json({ error: "Search query is required (max 200 chars)." });
  }
  const safeLocation = (typeof location === "string" && location.length <= 100) ? location : undefined;

  if (demoMode) {
    await new Promise((r) => setTimeout(r, 800));
    const filtered = DEMO_JOBS.filter((j) =>
      j.title.toLowerCase().includes(query.toLowerCase()) ||
      j.description.toLowerCase().includes(query.toLowerCase())
    );
    return res.json({ jobs: filtered.length > 0 ? filtered : DEMO_JOBS });
  }

  if (!searchApiKey) {
    return res.status(401).json({ error: "Search API not configured. Enter your RapidAPI key." });
  }

  const cacheKey = `${query}|${safeLocation || ""}|${page || 1}`.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) return res.json({ jobs: cached });

  try {
    let url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=${page || 1}&num_pages=1`;
    if (safeLocation) url += `&location=${encodeURIComponent(safeLocation)}`;

    const apiRes = await fetch(url, {
      headers: { "x-rapidapi-key": searchApiKey, "x-rapidapi-host": "jsearch.p.rapidapi.com" },
    });

    if (!apiRes.ok) {
      if (apiRes.status === 429) return res.status(429).json({ error: "Rate limit exceeded. Free tier allows 100 requests/day." });
      throw new Error(`JSearch API error: ${apiRes.status}`);
    }

    const data = await apiRes.json();
    const jobs = (data.data || []).map((j) => ({
      id: j.job_id || randomUUID(),
      title: j.job_title || "Untitled",
      company: j.employer_name || "Unknown",
      location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") || j.job_location || "Not specified",
      description: j.job_description || "",
      url: j.job_apply_link || j.job_google_link || "",
      posted: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc).toLocaleDateString() : "Unknown",
      salary: j.job_min_salary && j.job_max_salary ? `$${j.job_min_salary.toLocaleString()} - $${j.job_max_salary.toLocaleString()}` : null,
    }));

    setCache(cacheKey, jobs);
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message || "Search failed." });
  }
});

app.post("/api/jobs/score", async (req, res) => {
  const { jobs, experiences, personalInfo } = req.body;
  if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
    return res.status(400).json({ error: "Jobs array is required." });
  }

  if (demoMode) {
    await new Promise((r) => setTimeout(r, 1200));
    const scores = jobs.map((j) => {
      const demo = DEMO_SCORES.find((s) => s.job_id === j.id);
      return demo || { job_id: j.id, fit_score: Math.floor(Math.random() * 60) + 20, reason: "Demo score" };
    });
    return res.json({ scores });
  }

  if (!activeProvider) {
    return res.status(401).json({ error: "LLM not configured. Connect your API key on the Generate tab." });
  }
  if (!experiences || experiences.length === 0) {
    return res.status(400).json({ error: "No experiences provided for scoring." });
  }

  const cappedExperiences = experiences.slice(0, 15);
  const profileSummary = [
    `Name: ${personalInfo?.name || "Unknown"}`,
    personalInfo?.summary ? `Summary: ${personalInfo.summary.slice(0, 300)}` : null,
    ...cappedExperiences.map((e) => {
      const desc = (e.description || "").split("\n").slice(0, 3).join("; ").slice(0, 200);
      return `[${e.type}] ${e.title} at ${e.organization} (${e.startDate}-${e.endDate}): ${desc}`;
    }),
  ].filter(Boolean).join("\n");

  const jobsSummary = jobs.map((j) => {
    const desc = (j.description || "").split(/\s+/).slice(0, 200).join(" ");
    return `JOB_ID: ${j.id}\nTitle: ${j.title}\nCompany: ${j.company}\nDescription: ${desc}`;
  }).join("\n\n---\n\n");

  try {
    const text = await activeProvider.complete(
      `Score each job for fit against this candidate.\n\nCANDIDATE PROFILE:\n${profileSummary}\n\nJOBS:\n${jobsSummary}\n\nOutput a JSON array — one entry per job:\n[{ "job_id": "<JOB_ID>", "fit_score": <0-100 integer>, "reason": "<1 sentence>" }]\n\nScoring: 85-100 exceptional, 70-84 strong, 55-69 borderline, 40-54 weak, 0-39 poor. Be calibrated.`,
      `You score job listings for candidate fit. Be honest and calibrated. A chef should score low for engineering roles. Output valid JSON only.`,
      2048,
    );

    let parsed;
    try { parsed = JSON.parse(text); }
    catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Failed to parse scores");
      parsed = JSON.parse(match[0]);
    }

    if (!Array.isArray(parsed)) throw new Error("Expected array of scores");
    res.json({ scores: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message || "Scoring failed." });
  }
});

let lastTrace = null;

app.get("/api/trace", (_req, res) => {
  if (!lastTrace) {
    return res.json({ message: "No trace available. Run a generation first." });
  }
  res.json(lastTrace);
});

app.get("/api/status", (_req, res) => {
  res.json({ demo: demoMode, ready: demoMode || activeProvider !== null });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`JobFit AI server running on http://localhost:${PORT}`);
});
