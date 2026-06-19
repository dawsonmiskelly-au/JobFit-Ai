import { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { generateResume } from "../api";
import { loadExperiences, loadPersonalInfo } from "../store";
import ScoreIndicator from "./ScoreIndicator";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function isGarbageChar(code) {
  if (code <= 0x08) return true;
  if (code === 0x0b || code === 0x0c) return true;
  if (code >= 0x0e && code <= 0x1f) return true;
  if (code === 0x7f) return true;
  if (code === 0xfffd) return true;
  return false;
}

function cleanExtractedText(raw) {
  let text = Array.from(raw)
    .filter((ch) => !isGarbageChar(ch.codePointAt(0)))
    .join("");
  text = text.replace(/[^\S\n]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

async function extractPdfText(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lines = [];
    let lastY = null;
    for (const item of content.items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
        lines.push("\n");
      }
      lines.push(item.str);
      lastY = item.transform[5];
    }
    pages.push(lines.join(""));
  }
  return cleanExtractedText(pages.join("\n\n"));
}

const REC_STYLES = {
  STRONG_HIRE: "bg-emerald-900/40 text-emerald-300 border-emerald-500/30",
  HIRE: "bg-emerald-900/30 text-emerald-300 border-emerald-500/20",
  LEAN_HIRE: "bg-amber-900/30 text-amber-300 border-amber-500/20",
  LEAN_NO_HIRE: "bg-orange-900/30 text-orange-300 border-orange-500/20",
  NO_HIRE: "bg-red-900/30 text-red-300 border-red-500/20",
};

const REC_LABELS = {
  STRONG_HIRE: "Strong Hire",
  HIRE: "Hire",
  LEAN_HIRE: "Lean Hire",
  LEAN_NO_HIRE: "Lean No Hire",
  NO_HIRE: "No Hire",
};

function ResumePreview({ result }) {
  const resume = result.resume;

  function copyToClipboard() {
    const lines = [];
    lines.push(resume.name);
    const contact = [resume.email, resume.phone, resume.location, resume.linkedin, resume.github]
      .filter(Boolean)
      .join(" | ");
    if (contact) lines.push(contact);
    lines.push("");

    if (resume.summary) {
      lines.push("SUMMARY");
      lines.push(resume.summary);
      lines.push("");
    }

    for (const section of resume.sections) {
      lines.push(section.heading.toUpperCase());
      for (const item of section.items) {
        const datePart = item.dates ? ` (${item.dates})` : "";
        if (item.subtitle) {
          lines.push(`${item.title} — ${item.subtitle}${datePart}`);
        } else {
          lines.push(`${item.title}${datePart}`);
        }
        for (const bullet of item.bullets) {
          lines.push(`• ${bullet}`);
        }
        lines.push("");
      }
    }

    if (resume.skills) {
      lines.push("SKILLS");
      lines.push(resume.skills);
    }

    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <ScoreIndicator score={result.fit_score} />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`inline-block px-4 py-2 rounded-lg border font-semibold text-sm ${REC_STYLES[result.recommendation] || REC_STYLES.LEAN_NO_HIRE}`}>
              {REC_LABELS[result.recommendation] || result.recommendation}
            </div>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-all"
            >
              Copy Resume
            </button>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{result.reasoning}</p>
        </div>
      </div>

      <div className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-8 space-y-6">
        <div className="text-center border-b border-gray-700 pb-4">
          <h2 className="text-xl font-bold text-white">{resume.name}</h2>
          <p className="text-sm text-gray-400 mt-1">
            {[resume.email, resume.phone, resume.location, resume.linkedin, resume.github]
              .filter(Boolean)
              .join(" | ")}
          </p>
        </div>

        {resume.summary && (
          <div>
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Summary</h3>
            <p className="text-sm text-gray-300 leading-relaxed">{resume.summary}</p>
          </div>
        )}

        {resume.sections.map((section, si) => (
          <div key={si}>
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">{section.heading}</h3>
            <div className="space-y-4">
              {section.items.map((item, ii) => (
                <div key={ii}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-gray-200">{item.title}</span>
                      {item.subtitle && (
                        <span className="text-sm text-gray-400"> — {item.subtitle}</span>
                      )}
                    </div>
                    {item.dates && (
                      <span className="text-xs text-gray-500 shrink-0">{item.dates}</span>
                    )}
                  </div>
                  <ul className="mt-1 space-y-1">
                    {item.bullets.map((bullet, bi) => (
                      <li key={bi} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-gray-500 mt-1 shrink-0">•</span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}

        {resume.skills && (
          <div>
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Skills</h3>
            <p className="text-sm text-gray-300">{resume.skills}</p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-3">Key Alignments</h3>
          <ul className="space-y-2">
            {result.strengths.map((s, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-emerald-500 mt-1 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h3 className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3">Remaining Gaps</h3>
          <ul className="space-y-2">
            {result.gaps.map((g, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-amber-500 mt-1 shrink-0">•</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function GeneratorPage({ onResult }) {
  const [jobDesc, setJobDesc] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const abortRef = useRef(null);

  async function handleGenerate() {
    const experiences = loadExperiences();
    const personalInfo = loadPersonalInfo();

    if (!jobDesc.trim()) {
      setError("Please provide a job description.");
      return;
    }
    if (experiences.length === 0) {
      setError("No experiences found. Add your work, volunteer, projects, and education in the My Experience tab first.");
      return;
    }
    if (!personalInfo.name.trim()) {
      setError("Please fill in your name in the My Experience tab.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    abortRef.current = new AbortController();

    try {
      const generated = await generateResume(personalInfo, experiences, jobDesc, {
        signal: abortRef.current.signal,
      });
      setResult(generated);
      onResult(generated, jobDesc);
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Generation cancelled.");
      } else {
        setError(err.message || "Generation failed. Please try again.");
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    if (isPdf) {
      setFileLoading(true);
      setError(null);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractPdfText(arrayBuffer);
        if (!text) {
          setError("Could not extract text from this PDF.");
          return;
        }
        setJobDesc(text);
      } catch {
        setError("Failed to read PDF file.");
      } finally {
        setFileLoading(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setJobDesc(ev.target.result);
      reader.readAsText(file);
    }
    e.target.value = "";
  }

  const expCount = loadExperiences().length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Generate Tailored Resume</h2>
        <p className="text-sm text-gray-400 mt-1">
          Paste a job description below. Claude will select your most relevant experiences and rewrite bullet points to maximize fit.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Using {expCount} experience{expCount !== 1 ? "s" : ""} from your bank.
          {expCount === 0 && " Add some in the My Experience tab first."}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Job Description</label>
          <label className={`text-xs transition-colors ${fileLoading ? "text-gray-500 cursor-wait" : "text-indigo-400 hover:text-indigo-300 cursor-pointer"}`}>
            <input type="file" accept=".pdf,.txt,.md" onChange={handleFileUpload} disabled={fileLoading} className="hidden" />
            {fileLoading ? "Reading PDF..." : "Upload file"}
          </label>
        </div>
        <textarea
          value={jobDesc}
          onChange={(e) => setJobDesc(e.target.value)}
          placeholder="Paste the full job description here..."
          className="w-full h-56 bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/30"
        >
          {loading && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
            </svg>
          )}
          {loading ? "Generating..." : "Generate Resume"}
        </button>
        {loading && (
          <button
            onClick={handleCancel}
            className="px-4 py-3 border border-gray-600 hover:border-gray-500 text-gray-300 font-medium rounded-xl transition-all"
          >
            Cancel
          </button>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {result && (
        <div className="border-t border-gray-800 pt-6">
          <ResumePreview result={result} />
        </div>
      )}
    </div>
  );
}
