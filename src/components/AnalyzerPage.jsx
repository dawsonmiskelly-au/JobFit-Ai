import { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { analyzeResume } from "../api";
import ResultsPanel from "./ResultsPanel";

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

export default function AnalyzerPage({ onResult }) {
  const [resume, setResume] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const abortRef = useRef(null);

  async function handleAnalyze() {
    if (!resume.trim() || !jobDesc.trim()) {
      setError("Please provide both a resume and job description.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    abortRef.current = new AbortController();
    try {
      const analysis = await analyzeResume(resume, jobDesc, { signal: abortRef.current.signal });
      setResult(analysis);
      onResult(analysis, resume, jobDesc);
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Analysis cancelled.");
      } else {
        setError(err.message || "Analysis failed. Please try again.");
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
          setError("Could not extract text from this PDF. It may be image-based — try a text-based PDF or paste the resume manually.");
          return;
        }
        setResume(text);
      } catch {
        setError("Failed to read PDF file. Please try a different file or paste the text manually.");
      } finally {
        setFileLoading(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setResume(ev.target.result);
      reader.readAsText(file);
    }
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Resume</label>
            <label className={`text-xs transition-colors ${fileLoading ? "text-gray-500 cursor-wait" : "text-indigo-400 hover:text-indigo-300 cursor-pointer"}`}>
              <input type="file" accept=".pdf,.txt,.md,.csv,.json" onChange={handleFileUpload} disabled={fileLoading} className="hidden" />
              {fileLoading ? "Reading PDF..." : "Upload file"}
            </label>
          </div>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste resume text here..."
            className="w-full h-72 bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Job Description</label>
          <textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="Paste job description here..."
            className="w-full h-72 bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/30"
        >
          {loading && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
            </svg>
          )}
          {loading ? "Analyzing..." : "Analyze Fit"}
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
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Analysis Results</h2>
          <ResultsPanel result={result} />
        </div>
      )}
    </div>
  );
}
