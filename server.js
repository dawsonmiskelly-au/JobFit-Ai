import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { runResumeAgent } from "./agent.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

let client = null;
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
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== "string") {
    return res.json({ valid: false, error: "API key is required." });
  }
  if (apiKey === "demo") {
    demoMode = true;
    client = null;
    return res.json({ valid: true, demo: true });
  }
  demoMode = false;
  const testClient = new Anthropic({ apiKey });
  try {
    await testClient.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });
    client = testClient;
    res.json({ valid: true, demo: false });
  } catch (err) {
    client = null;
    if (err instanceof Anthropic.AuthenticationError) {
      res.json({ valid: false, error: "Invalid API key. Please check your key and try again." });
    } else {
      res.json({ valid: false, error: `Connection failed: ${err.message}` });
    }
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

  if (!client) {
    return res.status(401).json({ error: "API client not initialized. Please enter your API key." });
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze the fit between this resume and job description.\n\nRESUME:\n${resume}\n\nJOB DESCRIPTION:\n${jobDescription}`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const text = response.content[0].text;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse Claude response as JSON");
      }
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("Failed to parse Claude response as JSON");
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
    if (!section.heading || !Array.isArray(section.items)) {
      throw new Error("Each section needs a heading and items array");
    }
    for (const item of section.items) {
      if (!item.title || !Array.isArray(item.bullets)) {
        throw new Error("Each item needs a title and bullets array");
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

  if (!client) {
    return res.status(401).json({ error: "API client not initialized. Please enter your API key." });
  }

  try {
    const { result, trace } = await runResumeAgent(client, {
      personalInfo,
      experiences,
      jobDescription,
    });

    lastTrace = trace;

    console.log("\n=== AGENT TRACE ===");
    for (const step of trace) {
      console.log(`[${step.timestamp}] ${step.step}`);
    }
    console.log(`=== ${trace.length} steps completed ===\n`);

    res.json(validateGeneratedResume(result));
  } catch (err) {
    console.error("Agent error:", err.message);
    res.status(500).json({ error: err.message || "Resume generation failed." });
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
  res.json({ demo: demoMode, ready: demoMode || client !== null });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`JobFit AI server running on http://localhost:${PORT}`);
});
