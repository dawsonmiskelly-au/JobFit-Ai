/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-STEP RESUME GENERATION AGENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Architecture: 5 discrete tool steps, each a focused LLM call via the provider
 * abstraction (supports both Anthropic Claude and OpenAI GPT). The provider
 * exposes a single `complete(userMessage, systemPrompt, maxTokens)` method,
 * so the agent is provider-agnostic.
 *
 * Flow: extract_requirements → score_experiences → draft_resume
 *       → evaluate_resume → revise_resume (loop, min 1, max 3)
 *
 * See the README for the full architecture diagram and interview explanation.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// -- Tool Implementations --
// Each function makes ONE focused LLM call via provider.complete().
// The narrow system prompt ensures the model concentrates on a single objective.

/**
 * STEP 1: Extract structured requirements from the raw job description.
 * Gives downstream steps a machine-readable format instead of raw text.
 */
async function executeExtractRequirements(provider, input) {
  const text = await provider.complete(
    `Parse this job description into structured requirements.\n\nJOB DESCRIPTION:\n${input.job_description}\n\nOutput JSON with these fields:\n{\n  "must_have": ["<hard requirements — dealbreakers if missing>"],\n  "nice_to_have": ["<preferred but not required qualifications>"],\n  "keywords": ["<important technical terms, tools, frameworks mentioned>"],\n  "seniority_level": "<junior/mid/senior/staff/principal>",\n  "role_type": "<brief role category, e.g. 'backend engineer', 'product manager'>",\n  "years_experience": "<number or range mentioned, or null>",\n  "company_context": "<brief note on company size/stage/industry if mentioned>"\n}`,
    `You extract structured job requirements from job descriptions. Output valid JSON only.`,
    2048,
  );
  return parseJsonResponse(text);
}

/**
 * STEP 2: Score each experience against the requirements.
 * Determines which experiences make it into the resume and which get dropped.
 */
async function executeScoreExperiences(provider, input) {
  const text = await provider.complete(
    `Score each experience against these requirements.\n\nREQUIREMENTS:\n${JSON.stringify(input.requirements, null, 2)}\n\nEXPERIENCES:\n${JSON.stringify(input.experiences, null, 2)}\n\nFor each experience, output:\n[\n  {\n    "exp_id": "<the experience id>",\n    "relevance_score": <0-100>,\n    "matching_reqs": ["<which must_have/nice_to_have items this experience addresses>"],\n    "best_bullets": ["<which bullet points or aspects are most relevant>"],\n    "rationale": "<1 sentence on why this score>"\n  }\n]\n\nSort by relevance_score descending.`,
    `You score candidate experiences against job requirements. Be harsh — only high-relevance experiences should score above 70. Output valid JSON only.`,
    3000,
  );
  return parseJsonResponse(text);
}

/**
 * STEP 3: Draft the resume using the top-scored experiences.
 * The model sees relevance scores and matching_reqs from step 2,
 * so it knows exactly which aspects to emphasize.
 */
async function executeDraftResume(provider, input) {
  const text = await provider.complete(
    `Create a tailored resume.\n\nPERSONAL INFO:\n${JSON.stringify(input.personal_info, null, 2)}\n\nSCORED EXPERIENCES (use top-scoring ones, drop low-relevance):\n${JSON.stringify(input.scored_experiences, null, 2)}\n\nTARGET REQUIREMENTS:\n${JSON.stringify(input.requirements, null, 2)}\n\nOutput JSON:\n{\n  "name": "<name>",\n  "email": "<email>",\n  "phone": "<phone or null>",\n  "location": "<location or null>",\n  "linkedin": "<linkedin or null>",\n  "github": "<github or null>",\n  "summary": "<2-3 sentence tailored professional summary>",\n  "sections": [\n    {\n      "heading": "<section name, e.g. Professional Experience, Projects, Education>",\n      "items": [\n        {\n          "title": "<title>",\n          "subtitle": "<company/org or null>",\n          "dates": "<date range or null>",\n          "bullets": ["<rewritten bullet>", ...]\n        }\n      ]\n    }\n  ],\n  "skills": "<comma-separated skills tailored to the job, selected from the candidate's skill bank>",\n  "references": [<array of { "name", "title", "organization", "email", "phone" } or empty array if none provided>]\n}\n\nIMPORTANT: Select and prioritize skills from the candidate's skill bank that are most relevant to the job. Include a References section only if the candidate has provided references.`,
    `You are an expert resume writer. Create a tailored resume using ONLY the provided experiences and skills. Rewrite bullet points to align with the job requirements. Use keywords naturally. Never fabricate experience or skills. Output valid JSON only.`,
    4096,
  );
  return parseJsonResponse(text);
}

/**
 * STEP 4: Evaluate the resume honestly.
 * CRITICAL: This is a SEPARATE call from the writer. The evaluator has a
 * "brutally honest" system prompt and no memory of writing the resume.
 * On the first evaluation (revisionCount === 0), revision is FORCED.
 */
async function executeEvaluateResume(provider, input, revisionCount) {
  const forceRevision = revisionCount === 0;

  const text = await provider.complete(
    `Evaluate this resume against the job requirements.\n\nRESUME:\n${JSON.stringify(input.resume, null, 2)}\n\nREQUIREMENTS:\n${JSON.stringify(input.requirements, null, 2)}\n\nORIGINAL JOB DESCRIPTION:\n${input.job_description}\n\nOutput JSON:\n{\n  "fit_score": <0-100 integer>,\n  "strengths": ["<3-6 specific strengths matching requirements>"],\n  "gaps": ["<2-5 critical gaps or competitive weaknesses>"],\n  "recommendation": "<STRONG_HIRE, HIRE, LEAN_HIRE, LEAN_NO_HIRE, or NO_HIRE>",\n  "reasoning": "<3-5 sentences including reality check on interview chances>",\n  "revision_needed": <true/false>,\n  "revision_instructions": "<specific instructions for what to improve, or null if revision_needed is false>"\n}\n\nScoring: 85-100 exceptional (rare), 70-84 strong, 55-69 borderline, 40-54 weak, 0-39 poor.\nRecommendation mapping: STRONG_HIRE/HIRE = Apply, LEAN_HIRE = Apply with caveats, LEAN_NO_HIRE = Upskill First, NO_HIRE = Look Elsewhere.`,
    `You are a Brutally Honest Job Fit Analyzer. You provide candid assessments without sugar-coating. The job market is highly competitive — employers receive hundreds of applications per position. Judge based on ACTUAL qualifications, not how nicely bullets are reworded. A rewritten bullet doesn't create experience that isn't there. ${forceRevision ? "IMPORTANT: This is the first evaluation — you MUST set revision_needed to true and provide specific improvement instructions." : "Only set revision_needed to false if the resume genuinely cannot be meaningfully improved further."} Output valid JSON only.`,
    2048,
  );
  return parseJsonResponse(text);
}

/**
 * STEP 5: Revise the resume based on evaluation feedback.
 * Applies targeted improvements from step 4 without starting from scratch.
 */
async function executeReviseResume(provider, input) {
  const text = await provider.complete(
    `Revise this resume based on the evaluation feedback.\n\nCURRENT RESUME:\n${JSON.stringify(input.resume, null, 2)}\n\nEVALUATION FEEDBACK:\n${JSON.stringify(input.evaluation, null, 2)}\n\nTARGET REQUIREMENTS:\n${JSON.stringify(input.requirements, null, 2)}\n\nREVISION INSTRUCTIONS:\n${input.evaluation.revision_instructions}\n\nOutput the complete revised resume JSON (same schema as input).`,
    `You are an expert resume writer performing a revision pass. Apply the specific feedback to improve the resume. Do NOT fabricate experience — only reword and restructure existing content. Output the complete revised resume as valid JSON only.`,
    4096,
  );
  return parseJsonResponse(text);
}

// -- JSON Parsing Utility --

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

const MAX_REVISIONS = 3;

/**
 * Runs the full resume generation agent pipeline.
 *
 * @param {Object} provider - Provider instance (AnthropicProvider or OpenAIProvider)
 * @param {Object} params - { personalInfo, experiences, jobDescription }
 * @returns {{ result: Object, trace: Array }}
 */
export async function runResumeAgent(provider, { personalInfo, experiences, jobDescription }) {
  const trace = [];

  function log(step, input, output) {
    trace.push({
      step,
      timestamp: new Date().toISOString(),
      provider: provider.name,
      input: typeof input === "string" ? input.slice(0, 200) + "..." : input,
      output,
    });
  }

  // Step 1: Extract requirements
  const requirements = await executeExtractRequirements(provider, {
    job_description: jobDescription,
  });
  log("extract_requirements", { job_description: jobDescription.slice(0, 100) }, requirements);

  // Step 2: Score experiences
  const scoredExperiences = await executeScoreExperiences(provider, {
    requirements,
    experiences,
  });
  log("score_experiences", { experienceCount: experiences.length }, scoredExperiences);

  // Step 3: Draft resume
  let resume = await executeDraftResume(provider, {
    personal_info: personalInfo,
    scored_experiences: scoredExperiences,
    requirements,
  });
  log("draft_resume", { topExperiences: scoredExperiences.slice(0, 3).map((e) => e.exp_id) }, resume);

  // Steps 4-5: Evaluate → Revise loop (min 1 revision, max 3)
  let evaluation = null;
  let revisionCount = 0;

  while (revisionCount < MAX_REVISIONS) {
    evaluation = await executeEvaluateResume(provider, {
      resume,
      requirements,
      job_description: jobDescription,
    }, revisionCount);
    log("evaluate_resume", { revisionCount }, evaluation);

    if (!evaluation.revision_needed && revisionCount > 0) {
      break;
    }

    resume = await executeReviseResume(provider, {
      resume,
      evaluation,
      requirements,
    });
    revisionCount++;
    log("revise_resume", { revisionCount, instructions: evaluation.revision_instructions }, resume);
  }

  if (revisionCount === MAX_REVISIONS) {
    evaluation = await executeEvaluateResume(provider, {
      resume,
      requirements,
      job_description: jobDescription,
    }, revisionCount);
    log("evaluate_resume_final", { revisionCount }, evaluation);
  }

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
