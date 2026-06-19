let demoMode = false;
let keyValidated = false;

export function isDemoMode() {
  return demoMode;
}

export function isKeySet() {
  return keyValidated;
}

export async function validateKey(apiKey) {
  try {
    const res = await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const data = await res.json();
    demoMode = data.demo === true;
    if (data.valid) keyValidated = true;
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
