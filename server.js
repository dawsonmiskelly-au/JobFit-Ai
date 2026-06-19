import express from "express";
import Anthropic from "@anthropic-ai/sdk";

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

app.get("/api/status", (_req, res) => {
  res.json({ demo: demoMode, ready: demoMode || client !== null });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`JobFit AI server running on http://localhost:${PORT}`);
});
