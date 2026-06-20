let demoMode = false;
let keyValidated = false;
let activeProviderName = null;

export function isDemoMode() {
  return demoMode;
}

export function isKeySet() {
  return keyValidated;
}

export function getProviderName() {
  return activeProviderName;
}

export async function validateKey(apiKey, provider = "anthropic") {
  try {
    const res = await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, provider }),
    });
    const data = await res.json();
    demoMode = data.demo === true;
    if (data.valid) {
      keyValidated = true;
      activeProviderName = data.demo ? "demo" : (data.provider || provider);
    }
    return { valid: data.valid, error: data.error };
  } catch {
    return { valid: false, error: "Could not reach the server. Make sure the backend is running." };
  }
}

export async function analyzeResume(resume, jobDescription, { signal } = {}) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, jobDescription }),
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Analysis failed.");
  }
  return await res.json();
}

export async function parseResume(resumeText) {
  const res = await fetch("/api/parse-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to parse resume.");
  }
  return await res.json();
}

let searchConfigured = false;

export function isSearchApiConfigured() {
  return searchConfigured || demoMode;
}

export async function configureSearchApi(apiKey) {
  try {
    const res = await fetch("/api/jobs/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const data = await res.json();
    if (data.valid) searchConfigured = true;
    return { valid: data.valid, error: data.error };
  } catch {
    return { valid: false, error: "Could not reach the server." };
  }
}

export async function checkSearchStatus() {
  try {
    const res = await fetch("/api/jobs/status");
    const data = await res.json();
    searchConfigured = data.configured;
    return data.configured;
  } catch {
    return false;
  }
}

export async function searchJobs(query, location) {
  const res = await fetch("/api/jobs/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, location }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Search failed.");
  }
  return await res.json();
}

export async function scoreJobs(jobs, experiences, personalInfo) {
  const res = await fetch("/api/jobs/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobs, experiences, personalInfo }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Scoring failed.");
  }
  return await res.json();
}

export async function generateCoverLetter(personalInfo, resume, jobDescription, companyName) {
  const res = await fetch("/api/cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personalInfo, resume, jobDescription, companyName }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Cover letter generation failed.");
  }
  return await res.json();
}

export async function generateResume(personalInfo, experiences, jobDescription, { signal } = {}) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personalInfo, experiences, jobDescription }),
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Resume generation failed.");
  }
  return await res.json();
}
