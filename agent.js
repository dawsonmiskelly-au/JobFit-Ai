/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-STEP RESUME GENERATION AGENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * WHY AN AGENT LOOP INSTEAD OF A SINGLE PROMPT?
 *
 * A single prompt asks the LLM to do everything at once: parse requirements,
 * select experiences, write bullets, AND evaluate fit. This leads to:
 *   - Coupled concerns (a weak evaluation doesn't get a chance to fix the resume)
 *   - No self-correction (output quality depends on the first attempt)
 *   - Poor calibration (the same call that wrote the resume also judges it)
 *
 * The agent architecture breaks this into discrete, focused steps where each
 * sub-call has a narrow objective. The evaluation step is SEPARATE from the
 * writing step, which enables honest self-assessment. The revision loop
 * guarantees at least one improvement pass.
 *
 * ARCHITECTURE OVERVIEW:
 *
 *   ┌─────────────────┐
 *   │ extract_reqs    │  Job description → structured requirements
 *   └────────┬────────┘
 *            ▼
 *   ┌─────────────────┐
 *   │ score_exps      │  Requirements + experiences → relevance scores
 *   └────────┬────────┘
 *            ▼
 *   ┌─────────────────┐
 *   │ draft_resume    │  Top experiences + requirements → initial resume
 *   └────────┬────────┘
 *            ▼
 *   ┌─────────────────┐
 *   │ evaluate_resume │  Resume + requirements → score + revision instructions
 *   └────────┬────────┘
 *            │ if revision_needed (always true on first pass)
 *            ▼
 *   ┌─────────────────┐
 *   │ revise_resume   │  Resume + feedback → improved resume
 *   └────────┬────────┘
 *            │ loop back to evaluate (max 3 revisions)
 *            ▼
 *   ┌─────────────────┐
 *   │ Final output    │  Merged resume + evaluation → validated response
 *   └─────────────────┘
 *
 * KEY DESIGN DECISIONS:
 *
 * 1. Each tool is a focused Claude API call with a narrow system prompt.
 *    This prevents the model from conflating objectives (e.g., being nice
 *    in evaluation because it also wrote the resume).
 *
 * 2. The evaluation step is forced to request revision on the first pass
 *    (revisionCount === 0). This guarantees at least one improvement cycle.
 *    Subsequent evaluations can return revision_needed: false to exit early.
 *
 * 3. Max 3 revision loops caps API cost. In practice, most resumes converge
 *    after 1-2 revisions. The cap prevents pathological loops.
 *
 * 4. The trace array captures every step's input/output for debugging.
 *    Accessible via GET /api/trace after a generation completes.
 *
 * 5. The final output matches the EXACT same schema as the old single-call
 *    approach. The frontend sees no difference — this is a backend-only refactor.
 *
 * HOW TO EXPLAIN THIS IN AN INTERVIEW:
 *
 * "I refactored a single-shot LLM call into a multi-step agent pipeline.
 * Each step is a focused sub-call: parse requirements, score experiences,
 * draft the resume, evaluate it honestly, then revise based on feedback.
 * The key insight is separating the writer from the evaluator — the same
 * model that wrote the resume can't honestly judge it in the same context.
 * By making evaluation a separate call with a 'brutally honest' system prompt,
 * we get calibrated scores. The revision loop guarantees at least one
 * improvement pass, and the trace logging lets us inspect each decision."
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// -- Tool Schemas --
// These define what each agent step accepts. In a full tool-use implementation,
// these would be passed to Claude's tool_use API. Here they serve as documentation
// and could be used for input validation.

const TOOL_DEFINITIONS = [
  {
    name: "extract_requirements",
    description: "Parse a job description into structured requirements. Call this FIRST to understand what the job needs before scoring experiences.",
    input_schema: {
      type: "object",
      properties: {
        job_description: {
          type: "string",
          description: "The full job description text to parse",
        },
      },
      required: ["job_description"],
    },
  },
  {
    name: "score_experiences",
    description: "Score each candidate experience against the extracted job requirements. Call this AFTER extract_requirements to determine which experiences are most relevant.",
    input_schema: {
      type: "object",
      properties: {
        requirements: {
          type: "object",
          description: "The structured requirements from extract_requirements",
        },
        experiences: {
          type: "array",
          description: "Array of candidate experience objects to score",
        },
      },
      required: ["requirements", "experiences"],
    },
  },
  {
    name: "draft_resume",
    description: "Generate a tailored resume using the top-scored experiences. Call this AFTER score_experiences to create the initial draft.",
    input_schema: {
      type: "object",
      properties: {
        personal_info: {
          type: "object",
          description: "Candidate's personal information (name, email, etc.)",
        },
        scored_experiences: {
          type: "array",
          description: "The scored experiences from score_experiences, ordered by relevance",
        },
        requirements: {
          type: "object",
          description: "The structured requirements from extract_requirements",
        },
      },
      required: ["personal_info", "scored_experiences", "requirements"],
    },
  },
  {
    name: "evaluate_resume",
    description: "Brutally honest evaluation of the draft resume against the job requirements. Call this AFTER draft_resume or revise_resume to assess quality.",
    input_schema: {
      type: "object",
      properties: {
        resume: {
          type: "object",
          description: "The full resume object to evaluate",
        },
        requirements: {
          type: "object",
          description: "The structured requirements to evaluate against",
        },
        job_description: {
          type: "string",
          description: "Original job description for context",
        },
      },
      required: ["resume", "requirements", "job_description"],
    },
  },
  {
    name: "revise_resume",
    description: "Improve a resume draft based on evaluation feedback. Call this AFTER evaluate_resume when revision_needed is true.",
    input_schema: {
      type: "object",
      properties: {
        resume: {
          type: "object",
          description: "The current resume draft to revise",
        },
        evaluation: {
          type: "object",
          description: "The evaluation result with revision_instructions",
        },
        requirements: {
          type: "object",
          description: "The structured requirements for context",
        },
      },
      required: ["resume", "evaluation", "requirements"],
    },
  },
];

// -- Tool Implementations --
// Each function makes ONE focused Claude API call. The narrow system prompt
// ensures the model concentrates on a single objective per step.

/**
 * STEP 1: Extract structured requirements from the raw job description.
 * This gives downstream steps a machine-readable format to work with
 * instead of re-parsing the job description from scratch each time.
 */
async function executeExtractRequirements(client, input) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You extract structured job requirements from job descriptions. Output valid JSON only.`,
    messages: [
      {
        role: "user",
        content: `Parse this job description into structured requirements.\n\nJOB DESCRIPTION:\n${input.job_description}\n\nOutput JSON with these fields:\n{\n  "must_have": ["<hard requirements — dealbreakers if missing>"],\n  "nice_to_have": ["<preferred but not required qualifications>"],\n  "keywords": ["<important technical terms, tools, frameworks mentioned>"],\n  "seniority_level": "<junior/mid/senior/staff/principal>",\n  "role_type": "<brief role category, e.g. 'backend engineer', 'product manager'>",\n  "years_experience": "<number or range mentioned, or null>",\n  "company_context": "<brief note on company size/stage/industry if mentioned>"\n}`,
      },
    ],
  });
  return parseJsonResponse(response.content[0].text);
}

/**
 * STEP 2: Score each experience against the requirements.
 * This is the "selection" step — it determines which experiences make it
 * into the final resume and in what order. Low-scoring experiences get dropped.
 */
async function executeScoreExperiences(client, input) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: `You score candidate experiences against job requirements. Be harsh — only high-relevance experiences should score above 70. Output valid JSON only.`,
    messages: [
      {
        role: "user",
        content: `Score each experience against these requirements.\n\nREQUIREMENTS:\n${JSON.stringify(input.requirements, null, 2)}\n\nEXPERIENCES:\n${JSON.stringify(input.experiences, null, 2)}\n\nFor each experience, output:\n[\n  {\n    "exp_id": "<the experience id>",\n    "relevance_score": <0-100>,\n    "matching_reqs": ["<which must_have/nice_to_have items this experience addresses>"],\n    "best_bullets": ["<which bullet points or aspects are most relevant>"],\n    "rationale": "<1 sentence on why this score>"\n  }\n]\n\nSort by relevance_score descending.`,
      },
    ],
  });
  return parseJsonResponse(response.content[0].text);
}

/**
 * STEP 3: Draft the resume using the top-scored experiences.
 * The model sees the relevance scores and matching_reqs from step 2,
 * so it knows exactly which aspects of each experience to emphasize.
 * It rewrites bullets to incorporate job keywords naturally.
 */
async function executeDraftResume(client, input) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `You are an expert resume writer. Create a tailored resume using ONLY the provided experiences. Rewrite bullet points to align with the job requirements. Use keywords naturally. Never fabricate experience. Output valid JSON only.`,
    messages: [
      {
        role: "user",
        content: `Create a tailored resume.\n\nPERSONAL INFO:\n${JSON.stringify(input.personal_info, null, 2)}\n\nSCORED EXPERIENCES (use top-scoring ones, drop low-relevance):\n${JSON.stringify(input.scored_experiences, null, 2)}\n\nTARGET REQUIREMENTS:\n${JSON.stringify(input.requirements, null, 2)}\n\nOutput JSON:\n{\n  "name": "<name>",\n  "email": "<email>",\n  "phone": "<phone or null>",\n  "location": "<location or null>",\n  "linkedin": "<linkedin or null>",\n  "github": "<github or null>",\n  "summary": "<2-3 sentence tailored professional summary>",\n  "sections": [\n    {\n      "heading": "<section name>",\n      "items": [\n        {\n          "title": "<title>",\n          "subtitle": "<company/org or null>",\n          "dates": "<date range or null>",\n          "bullets": ["<rewritten bullet>", ...]\n        }\n      ]\n    }\n  ],\n  "skills": "<comma-separated skills tailored to the job>"\n}`,
      },
    ],
  });
  return parseJsonResponse(response.content[0].text);
}

/**
 * STEP 4: Evaluate the resume honestly.
 * CRITICAL DESIGN POINT: This is a SEPARATE call from the writing step.
 * The evaluator has a "brutally honest" system prompt and no memory of
 * having written the resume. This separation prevents self-congratulatory
 * scoring where the writer inflates its own work.
 *
 * On the first evaluation (revisionCount === 0), revision is FORCED.
 * This guarantees the resume goes through at least one improvement cycle.
 */
async function executeEvaluateResume(client, input, revisionCount) {
  const forceRevision = revisionCount === 0;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are a Brutally Honest Job Fit Analyzer. You provide candid assessments without sugar-coating. The job market is highly competitive — employers receive hundreds of applications per position. Judge based on ACTUAL qualifications, not how nicely bullets are reworded. A rewritten bullet doesn't create experience that isn't there. ${forceRevision ? "IMPORTANT: This is the first evaluation — you MUST set revision_needed to true and provide specific improvement instructions." : "Only set revision_needed to false if the resume genuinely cannot be meaningfully improved further."} Output valid JSON only.`,
    messages: [
      {
        role: "user",
        content: `Evaluate this resume against the job requirements.\n\nRESUME:\n${JSON.stringify(input.resume, null, 2)}\n\nREQUIREMENTS:\n${JSON.stringify(input.requirements, null, 2)}\n\nORIGINAL JOB DESCRIPTION:\n${input.job_description}\n\nOutput JSON:\n{\n  "fit_score": <0-100 integer>,\n  "strengths": ["<3-6 specific strengths matching requirements>"],\n  "gaps": ["<2-5 critical gaps or competitive weaknesses>"],\n  "recommendation": "<STRONG_HIRE, HIRE, LEAN_HIRE, LEAN_NO_HIRE, or NO_HIRE>",\n  "reasoning": "<3-5 sentences including reality check on interview chances>",\n  "revision_needed": <true/false>,\n  "revision_instructions": "<specific instructions for what to improve, or null if revision_needed is false>"\n}\n\nScoring: 85-100 exceptional (rare), 70-84 strong, 55-69 borderline, 40-54 weak, 0-39 poor.\nRecommendation mapping: STRONG_HIRE/HIRE = Apply, LEAN_HIRE = Apply with caveats, LEAN_NO_HIRE = Upskill First, NO_HIRE = Look Elsewhere.`,
      },
    ],
  });
  return parseJsonResponse(response.content[0].text);
}

/**
 * STEP 5: Revise the resume based on evaluation feedback.
 * The revision instructions from step 4 tell this step exactly what to fix.
 * Common instructions include: "strengthen the distributed systems bullets",
 * "add more quantified metrics", "drop irrelevant experience X".
 * The model applies targeted improvements without starting from scratch.
 */
async function executeReviseResume(client, input) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `You are an expert resume writer performing a revision pass. Apply the specific feedback to improve the resume. Do NOT fabricate experience — only reword and restructure existing content. Output the complete revised resume as valid JSON only.`,
    messages: [
      {
        role: "user",
        content: `Revise this resume based on the evaluation feedback.\n\nCURRENT RESUME:\n${JSON.stringify(input.resume, null, 2)}\n\nEVALUATION FEEDBACK:\n${JSON.stringify(input.evaluation, null, 2)}\n\nTARGET REQUIREMENTS:\n${JSON.stringify(input.requirements, null, 2)}\n\nREVISION INSTRUCTIONS:\n${input.evaluation.revision_instructions}\n\nOutput the complete revised resume JSON (same schema as input).`,
      },
    ],
  });
  return parseJsonResponse(response.content[0].text);
}

// -- JSON Parsing Utility --
// Claude sometimes wraps JSON in markdown fences or adds explanation text.
// This extracts the JSON regardless of formatting.

function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      const arrMatch = text.match(/\[[\s\S]*\]/);
      if (arrMatch) return JSON.parse(arrMatch[0]);
      throw new Error("Failed to parse response as JSON");
    }
    return JSON.parse(match[0]);
  }
}

// -- Agent Orchestrator --
// This is the main entry point. It sequences the tool calls, enforces the
// revision loop constraints, and collects the execution trace.

const MAX_REVISIONS = 3; // Cap to prevent runaway API costs

/**
 * Runs the full resume generation agent pipeline.
 *
 * @param {Anthropic} client - Initialized Anthropic SDK client
 * @param {Object} params - { personalInfo, experiences, jobDescription }
 * @returns {{ result: Object, trace: Array }} - Final resume+eval and execution trace
 *
 * The trace array contains one entry per step:
 *   { step: string, timestamp: string, input: any, output: any }
 *
 * The result matches the validateGeneratedResume() schema exactly.
 */
export async function runResumeAgent(client, { personalInfo, experiences, jobDescription }) {
  const trace = [];

  // Helper to record each step for debugging and the /api/trace endpoint
  function log(step, input, output) {
    trace.push({
      step,
      timestamp: new Date().toISOString(),
      input: typeof input === "string" ? input.slice(0, 200) + "..." : input,
      output,
    });
  }

  // ── Step 1: Parse job description into structured requirements ──
  // WHY: Downstream steps need a machine-readable format, not raw text.
  // The requirements object becomes the "contract" that every other step references.
  const requirements = await executeExtractRequirements(client, {
    job_description: jobDescription,
  });
  log("extract_requirements", { job_description: jobDescription.slice(0, 100) }, requirements);

  // ── Step 2: Score each experience against requirements ──
  // WHY: Not all experiences are relevant. This step produces a ranked list
  // so the draft step knows which experiences to include and which to drop.
  const scoredExperiences = await executeScoreExperiences(client, {
    requirements,
    experiences,
  });
  log("score_experiences", { experienceCount: experiences.length }, scoredExperiences);

  // ── Step 3: Draft the initial resume ──
  // WHY: With scored experiences and structured requirements, the writer
  // can make informed decisions about ordering, emphasis, and keyword usage.
  let resume = await executeDraftResume(client, {
    personal_info: personalInfo,
    scored_experiences: scoredExperiences,
    requirements,
  });
  log("draft_resume", { topExperiences: scoredExperiences.slice(0, 3).map((e) => e.exp_id) }, resume);

  // ── Steps 4-5: Evaluate → Revise loop ──
  // WHY: Separation of concerns. The evaluator is a different "persona" than
  // the writer — it has a brutally honest prompt and no incentive to be kind.
  // The first evaluation ALWAYS triggers a revision (forceRevision when count === 0).
  // This guarantees improvement. Subsequent evaluations can exit if satisfied.
  let evaluation = null;
  let revisionCount = 0;

  while (revisionCount < MAX_REVISIONS) {
    // Evaluate current state
    evaluation = await executeEvaluateResume(client, {
      resume,
      requirements,
      job_description: jobDescription,
    }, revisionCount);
    log("evaluate_resume", { revisionCount }, evaluation);

    // Exit condition: evaluator says no revision needed AND we've done at least one
    if (!evaluation.revision_needed && revisionCount > 0) {
      break;
    }

    // Apply revision
    resume = await executeReviseResume(client, {
      resume,
      evaluation,
      requirements,
    });
    revisionCount++;
    log("revise_resume", { revisionCount, instructions: evaluation.revision_instructions }, resume);
  }

  // If we hit max revisions, do one final evaluation for the score
  if (revisionCount === MAX_REVISIONS) {
    evaluation = await executeEvaluateResume(client, {
      resume,
      requirements,
      job_description: jobDescription,
    }, revisionCount);
    log("evaluate_resume_final", { revisionCount }, evaluation);
  }

  // ── Merge into the expected output schema ──
  // The frontend expects { resume, fit_score, strengths, gaps, recommendation, reasoning }
  // We combine the final resume with the final evaluation to produce this.
  const result = {
    resume,
    fit_score: evaluation.fit_score,
    strengths: evaluation.strengths,
    gaps: evaluation.gaps,
    recommendation: evaluation.recommendation,
    reasoning: evaluation.reasoning,
  };

  return { result, trace };
}
