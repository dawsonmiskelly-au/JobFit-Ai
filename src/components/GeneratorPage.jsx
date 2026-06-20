import { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import {
  Upload, Loader2, X, Copy, Download, CheckCircle, XCircle, AlertTriangle, ArrowRight, Lock,
  FileText as FileTextIcon, FileDown, BarChart3, Clipboard,
} from "lucide-react";
import { validateKey, generateResume, generateCoverLetter, isKeySet } from "../api";
import { loadExperiences, loadPersonalInfo, loadSkills, loadReferences, createApplication, loadApplications, saveApplications } from "../store";
import ScoreIndicator from "./ScoreIndicator";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function isGarbageChar(code) {
  if (code <= 0x08) return true;
  if (code === 0x0b || code === 0x0c) return true;
  if (code >= 0x0e && code <= 0x1f) return true;
  if (code === 0x7f || code === 0xfffd) return true;
  return false;
}

function cleanExtractedText(raw) {
  let text = Array.from(raw).filter((ch) => !isGarbageChar(ch.codePointAt(0))).join("");
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
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) lines.push("\n");
      lines.push(item.str);
      lastY = item.transform[5];
    }
    pages.push(lines.join(""));
  }
  return cleanExtractedText(pages.join("\n\n"));
}

function generateHarvardPdf(resume, companyName) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  const m = 72;
  const usable = pw - m * 2;
  let y = 60;
  function checkPage(n) { if (y + n > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60; } }
  doc.setFont("times", "bold"); doc.setFontSize(18);
  doc.text(resume.name.toUpperCase(), pw / 2, y, { align: "center" }); y += 20;
  doc.setFont("times", "normal"); doc.setFontSize(10);
  const c = [resume.email, resume.phone, resume.location, resume.linkedin, resume.github].filter(Boolean).join("  |  ");
  doc.text(c, pw / 2, y, { align: "center" }); y += 8;
  doc.setLineWidth(0.5); doc.line(m, y, pw - m, y); y += 14;
  function heading(t) { checkPage(30); doc.setFont("times", "bold"); doc.setFontSize(11); doc.text(t.toUpperCase(), m, y); y += 3; doc.setLineWidth(0.3); doc.line(m, y, pw - m, y); y += 12; }
  function wrap(t, w, s) { doc.setFontSize(s); return doc.splitTextToSize(t, w); }
  if (resume.summary) { heading("Summary"); doc.setFont("times", "normal"); doc.setFontSize(10); const l = wrap(resume.summary, usable, 10); checkPage(l.length * 13); doc.text(l, m, y); y += l.length * 13 + 8; }
  for (const s of resume.sections) { heading(s.heading); for (const it of s.items) { checkPage(40); doc.setFont("times", "bold"); doc.setFontSize(10); doc.text(it.subtitle ? `${it.title}, ${it.subtitle}` : it.title, m, y); if (it.dates) { doc.setFont("times", "italic"); doc.setFontSize(10); doc.text(it.dates, pw - m, y, { align: "right" }); } y += 14; doc.setFont("times", "normal"); doc.setFontSize(10); for (const b of it.bullets) { const l = wrap(`•  ${b}`, usable - 10, 10); checkPage(l.length * 12); doc.text(l, m + 10, y); y += l.length * 12; } y += 6; } }
  if (resume.skills) { heading("Skills"); doc.setFont("times", "normal"); doc.setFontSize(10); const l = wrap(resume.skills, usable, 10); checkPage(l.length * 13); doc.text(l, m, y); y += l.length * 13 + 8; }
  if (resume.references && resume.references.length > 0) {
    heading("References");
    for (const ref of resume.references) {
      checkPage(40);
      doc.setFont("times", "bold"); doc.setFontSize(10);
      const refTitle = ref.title ? `${ref.name}, ${ref.title}` : ref.name;
      doc.text(refTitle, m, y); y += 13;
      doc.setFont("times", "normal"); doc.setFontSize(10);
      if (ref.organization) { doc.text(ref.organization, m, y); y += 12; }
      const contact = [ref.email, ref.phone].filter(Boolean).join("  |  ");
      if (contact) { doc.text(contact, m, y); y += 12; }
      y += 4;
    }
  }
  const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
  doc.save(`Resume_${safeName}.pdf`);
}

async function generateDocx(resume, companyName) {
  const children = [];
  children.push(new Paragraph({ children: [new TextRun({ text: resume.name || "Unknown", bold: true, size: 28, font: "Times New Roman" })], alignment: AlignmentType.CENTER }));
  const contact = [resume.email, resume.phone, resume.location, resume.linkedin, resume.github].filter(Boolean).join("  |  ");
  if (contact) children.push(new Paragraph({ children: [new TextRun({ text: contact, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }));
  children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1 } }, spacing: { after: 200 } }));

  function sectionHead(title) {
    children.push(new Paragraph({ children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 22, font: "Times New Roman" })], heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" } } }));
  }

  if (resume.summary) { sectionHead("Summary"); children.push(new Paragraph({ children: [new TextRun({ text: resume.summary, size: 20, font: "Times New Roman" })], spacing: { after: 200 } })); }
  for (const section of (resume.sections || [])) {
    if (!section.heading) continue;
    sectionHead(section.heading);
    for (const item of (section.items || [])) {
      if (!item.title) continue;
      const titleRuns = [new TextRun({ text: item.title, bold: true, size: 20, font: "Times New Roman" })];
      if (item.subtitle) titleRuns.push(new TextRun({ text: `, ${item.subtitle}`, size: 20, font: "Times New Roman" }));
      if (item.dates) titleRuns.push(new TextRun({ text: `\t${item.dates}`, italics: true, size: 20, font: "Times New Roman" }));
      children.push(new Paragraph({ children: titleRuns, spacing: { before: 100 } }));
      for (const bullet of (item.bullets || [])) {
        children.push(new Paragraph({ children: [new TextRun({ text: bullet, size: 20, font: "Times New Roman" })], bullet: { level: 0 }, spacing: { before: 40 } }));
      }
    }
  }
  if (resume.skills) { sectionHead("Skills"); children.push(new Paragraph({ children: [new TextRun({ text: resume.skills, size: 20, font: "Times New Roman" })], spacing: { after: 200 } })); }
  if (resume.references?.length > 0) {
    sectionHead("References");
    for (const ref of resume.references) {
      if (!ref.name) continue;
      const runs = [new TextRun({ text: ref.name, bold: true, size: 20, font: "Times New Roman" })];
      if (ref.title) runs.push(new TextRun({ text: `, ${ref.title}`, size: 20, font: "Times New Roman" }));
      if (ref.organization) runs.push(new TextRun({ text: ` - ${ref.organization}`, size: 20, font: "Times New Roman" }));
      children.push(new Paragraph({ children: runs, spacing: { before: 100 } }));
      const refContact = [ref.email, ref.phone].filter(Boolean).join("  |  ");
      if (refContact) children.push(new Paragraph({ children: [new TextRun({ text: refContact, size: 20, font: "Times New Roman", color: "666666" })], spacing: { after: 100 } }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const safeName = (companyName || "Resume").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
  saveAs(blob, `Resume_${safeName}.docx`);
}

function analyzeAtsKeywords(jobDescription, resume) {
  const jdLower = jobDescription.toLowerCase();
  const words = jdLower.match(/\b[a-z][a-z+#.]{1,30}\b/g) || [];
  const freq = {};
  for (const w of words) {
    if (w.length <= 2 || ["the", "and", "for", "with", "that", "this", "from", "are", "has", "have", "will", "you", "your", "our", "can", "about", "been", "also", "into", "than", "them", "they", "its", "all", "not", "but", "more"].includes(w)) continue;
    freq[w] = (freq[w] || 0) + 1;
  }
  const keywords = Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word);

  const resumeText = [
    resume.summary,
    resume.skills,
    ...(resume.sections || []).flatMap((s) => (s.items || []).flatMap((i) => [i.title, i.subtitle, ...(i.bullets || [])])),
  ].filter(Boolean).join(" ").toLowerCase();

  const found = [];
  const missing = [];
  for (const kw of keywords) {
    if (resumeText.includes(kw)) found.push(kw);
    else missing.push(kw);
  }

  return { found, missing, total: keywords.length, matchRate: keywords.length > 0 ? Math.round((found.length / keywords.length) * 100) : 0 };
}

const REC_CONFIG = {
  STRONG_HIRE: { label: "Apply Now", color: "var(--success)", bg: "var(--success-muted)", icon: CheckCircle },
  HIRE: { label: "Apply", color: "var(--success)", bg: "var(--success-muted)", icon: CheckCircle },
  LEAN_HIRE: { label: "Apply with Caveats", color: "var(--warning)", bg: "var(--warning-muted)", icon: AlertTriangle },
  LEAN_NO_HIRE: { label: "Upskill First", color: "var(--warning)", bg: "var(--warning-muted)", icon: AlertTriangle },
  NO_HIRE: { label: "Look Elsewhere", color: "var(--danger)", bg: "var(--danger-muted)", icon: XCircle },
};

const btnBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-2) var(--space-4)",
  borderRadius: "var(--radius-md)",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  border: "none",
  transition: "opacity 0.15s",
};

function ResumePreview({ result, companyName, jobDesc }) {
  const resume = result.resume;
  const rec = REC_CONFIG[result.recommendation] || REC_CONFIG.LEAN_NO_HIRE;
  const RecIcon = rec.icon;
  const [coverLetter, setCoverLetter] = useState(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState(null);
  const [showAts, setShowAts] = useState(false);
  const [applied, setApplied] = useState(false);

  const atsData = showAts ? analyzeAtsKeywords(jobDesc, resume) : null;

  function copyToClipboard() {
    const lines = [resume.name];
    const contact = [resume.email, resume.phone, resume.location, resume.linkedin, resume.github].filter(Boolean).join(" | ");
    if (contact) lines.push(contact);
    lines.push("");
    if (resume.summary) { lines.push("SUMMARY"); lines.push(resume.summary); lines.push(""); }
    for (const section of resume.sections) { lines.push(section.heading.toUpperCase()); for (const item of section.items) { const d = item.dates ? ` (${item.dates})` : ""; lines.push(item.subtitle ? `${item.title} - ${item.subtitle}${d}` : `${item.title}${d}`); for (const b of item.bullets) lines.push(`- ${b}`); lines.push(""); } }
    if (resume.skills) { lines.push("SKILLS"); lines.push(resume.skills); lines.push(""); }
    if (resume.references && resume.references.length > 0) {
      lines.push("REFERENCES");
      for (const ref of resume.references) {
        lines.push([ref.name, ref.title, ref.organization].filter(Boolean).join(", "));
        const rc = [ref.email, ref.phone].filter(Boolean).join(" | ");
        if (rc) lines.push(rc);
        lines.push("");
      }
    }
    navigator.clipboard.writeText(lines.join("\n"));
  }

  async function handleCoverLetter() {
    setCoverLoading(true);
    setCoverError(null);
    try {
      const personalInfo = loadPersonalInfo();
      const data = await generateCoverLetter(personalInfo, resume, jobDesc, companyName);
      setCoverLetter(data.coverLetter);
    } catch (err) {
      setCoverError(err.message);
    } finally {
      setCoverLoading(false);
    }
  }

  function handleMarkApplied() {
    const app = createApplication(companyName, resume.sections?.[0]?.items?.[0]?.title || "", jobDesc, result.fit_score);
    const apps = loadApplications();
    saveApplications([app, ...apps]);
    setApplied(true);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div className="flex flex-col sm:flex-row items-start" style={{ gap: "var(--space-6)" }}>
        <ScoreIndicator score={result.fit_score} />
        <div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div className="flex items-center flex-wrap" style={{ gap: "var(--space-2)" }}>
            <span className="flex items-center" style={{ gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", fontSize: "12px", fontWeight: 600, background: rec.bg, color: rec.color, border: `1px solid ${rec.color}20` }}>
              <RecIcon size={14} /> {rec.label}
            </span>
            <button onClick={copyToClipboard} style={{ ...btnBase, background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
              <Copy size={14} /> Copy
            </button>
            <button onClick={() => generateHarvardPdf(resume, companyName)} style={{ ...btnBase, background: "var(--accent)", color: "#fff" }}>
              <Download size={14} /> PDF
            </button>
            <button onClick={() => generateDocx(resume, companyName)} style={{ ...btnBase, background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
              <FileDown size={14} /> DOCX
            </button>
          </div>
          <div className="flex items-center flex-wrap" style={{ gap: "var(--space-2)" }}>
            <button onClick={handleCoverLetter} disabled={coverLoading} style={{ ...btnBase, background: "var(--bg-tertiary)", color: "var(--text-secondary)", opacity: coverLoading ? 0.5 : 1 }}>
              {coverLoading ? <Loader2 size={14} className="animate-spin" /> : <FileTextIcon size={14} />}
              {coverLoading ? "Writing..." : coverLetter ? "Regenerate Letter" : "Cover Letter"}
            </button>
            <button onClick={() => setShowAts(!showAts)} style={{ ...btnBase, background: showAts ? "var(--accent-muted)" : "var(--bg-tertiary)", color: showAts ? "var(--accent)" : "var(--text-secondary)" }}>
              <BarChart3 size={14} /> ATS Keywords
            </button>
            <button onClick={handleMarkApplied} disabled={applied} style={{ ...btnBase, background: applied ? "var(--success-muted)" : "var(--bg-tertiary)", color: applied ? "var(--success)" : "var(--text-secondary)", opacity: applied ? 0.7 : 1 }}>
              {applied ? <CheckCircle size={14} /> : <Clipboard size={14} />}
              {applied ? "Applied" : "Mark Applied"}
            </button>
          </div>
          {coverError && <span style={{ fontSize: "12px", color: "var(--danger)" }}>{coverError}</span>}
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.reasoning}</p>
        </div>
      </div>

      {showAts && atsData && (
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "var(--space-5)" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
            <h3 style={{ fontSize: "10px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>ATS Keyword Analysis</h3>
            <span style={{ fontSize: "18px", fontWeight: 600, color: atsData.matchRate >= 70 ? "var(--success)" : atsData.matchRate >= 50 ? "var(--warning)" : "var(--danger)" }}>
              {atsData.matchRate}% match
            </span>
          </div>
          <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-4)" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--success)", marginBottom: "var(--space-2)" }}>Found in resume ({atsData.found.length})</p>
              <div className="flex flex-wrap" style={{ gap: "var(--space-1)" }}>
                {atsData.found.map((kw) => (
                  <span key={kw} style={{ padding: "2px var(--space-2)", borderRadius: "var(--radius-sm)", fontSize: "11px", background: "var(--success-muted)", color: "var(--success)" }}>{kw}</span>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--danger)", marginBottom: "var(--space-2)" }}>Missing from resume ({atsData.missing.length})</p>
              <div className="flex flex-wrap" style={{ gap: "var(--space-1)" }}>
                {atsData.missing.map((kw) => (
                  <span key={kw} style={{ padding: "2px var(--space-2)", borderRadius: "var(--radius-sm)", fontSize: "11px", background: "var(--danger-muted)", color: "var(--danger)" }}>{kw}</span>
                ))}
                {atsData.missing.length === 0 && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>All key terms found</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {coverLetter && (
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
            <h3 style={{ fontSize: "10px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Cover Letter</h3>
            <button onClick={() => navigator.clipboard.writeText(coverLetter)} style={{ ...btnBase, background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: "11px", padding: "var(--space-1) var(--space-3)" }}>
              <Copy size={12} /> Copy
            </button>
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {coverLetter}
          </div>
        </div>
      )}

      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
        }}
      >
        <div style={{ textAlign: "center", paddingBottom: "var(--space-5)", borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>{resume.name}</h2>
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "var(--space-1)" }}>
            {[resume.email, resume.phone, resume.location, resume.linkedin, resume.github].filter(Boolean).join("  |  ")}
          </p>
        </div>

        {resume.summary && (
          <div>
            <h3 style={{ fontSize: "10px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>Summary</h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{resume.summary}</p>
          </div>
        )}

        {(resume.sections || []).map((section, si) => (
          <div key={si}>
            <h3 style={{ fontSize: "10px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-3)" }}>{section.heading}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              {(section.items || []).map((item, ii) => (
                <div key={ii}>
                  <div className="flex items-baseline justify-between" style={{ gap: "var(--space-2)" }}>
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</span>
                      {item.subtitle && <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>{" "}- {item.subtitle}</span>}
                    </div>
                    {item.dates && <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>{item.dates}</span>}
                  </div>
                  <ul style={{ marginTop: "var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                    {(item.bullets || []).map((bullet, bi) => (
                      <li key={bi} className="flex items-start" style={{ gap: "var(--space-2)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        <span style={{ color: "var(--text-muted)", marginTop: "2px", flexShrink: 0 }}>-</span>
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
            <h3 style={{ fontSize: "10px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>Skills</h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{resume.skills}</p>
          </div>
        )}

        {resume.references && resume.references.length > 0 && (
          <div>
            <h3 style={{ fontSize: "10px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-3)" }}>References</h3>
            <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-4)" }}>
              {resume.references.map((ref, ri) => (
                <div key={ri}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{ref.name}</span>
                  {ref.title && <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>{" "}- {ref.title}</span>}
                  {ref.organization && <p style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{ref.organization}</p>}
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {[ref.email, ref.phone].filter(Boolean).join(" | ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2" style={{ gap: "var(--space-4)" }}>
        <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", padding: "var(--space-5)", border: "1px solid var(--border-subtle)" }}>
          <h3 style={{ fontSize: "10px", fontWeight: 600, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-3)" }}>Strengths</h3>
          <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {result.strengths.map((s, i) => (
              <li key={i} className="flex items-start" style={{ gap: "var(--space-2)", fontSize: "13px", color: "var(--text-secondary)" }}>
                <CheckCircle size={13} style={{ color: "var(--success)", marginTop: "3px", flexShrink: 0 }} /> {s}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", padding: "var(--space-5)", border: "1px solid var(--border-subtle)" }}>
          <h3 style={{ fontSize: "10px", fontWeight: 600, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-3)" }}>Gaps</h3>
          <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {result.gaps.map((g, i) => (
              <li key={i} className="flex items-start" style={{ gap: "var(--space-2)", fontSize: "13px", color: "var(--text-secondary)" }}>
                <AlertTriangle size={13} style={{ color: "var(--warning)", marginTop: "3px", flexShrink: 0 }} /> {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ApiKeyPrompt({ onValidated }) {
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [error, setError] = useState(null);
  const [validating, setValidating] = useState(false);

  async function handleSubmit() {
    if (!apiKey.trim() || validating) return;
    setValidating(true);
    setError(null);
    const { valid, error: err } = await validateKey(apiKey.trim(), apiKey.trim() === "demo" ? "anthropic" : provider);
    setValidating(false);
    if (valid) onValidated();
    else setError(err);
  }

  const inputStyle = {
    flex: 1,
    background: "var(--bg-primary)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-3) var(--space-4)",
    fontSize: "13px",
    color: "var(--text-primary)",
    outline: "none",
  };

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
        <Lock size={14} style={{ color: "var(--text-tertiary)" }} />
        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Connect AI Provider</span>
      </div>
      <p style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Choose a provider and enter your API key. Held in memory only.</p>

      <div className="flex" style={{ gap: "var(--space-2)" }}>
        {[
          { id: "anthropic", label: "Claude" },
          { id: "openai", label: "GPT-4o" },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            style={{
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              fontWeight: 500,
              background: provider === p.id ? "var(--accent)" : "var(--bg-tertiary)",
              color: provider === p.id ? "#fff" : "var(--text-tertiary)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex" style={{ gap: "var(--space-3)" }}>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={provider === "anthropic" ? "sk-ant-... or type 'demo'" : "sk-..."}
          disabled={validating}
          style={{ ...inputStyle, opacity: validating ? 0.5 : 1 }}
        />
        <button
          onClick={handleSubmit}
          disabled={validating}
          className="flex items-center"
          style={{
            ...btnBase,
            background: "var(--accent)",
            color: "#fff",
            opacity: validating ? 0.6 : 1,
          }}
        >
          {validating ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {validating ? "Validating" : "Connect"}
        </button>
      </div>
      {error && (
        <div className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "12px", color: "var(--danger)" }}>
          <XCircle size={13} /> {error}
        </div>
      )}
    </div>
  );
}

export default function GeneratorPage({ onResult, prefillJob, onPrefillConsumed }) {
  const [jobDesc, setJobDesc] = useState(prefillJob?.jobDescription || "");
  const [companyName, setCompanyName] = useState(prefillJob?.companyName || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [keyReady, setKeyReady] = useState(isKeySet());
  const abortRef = useRef(null);
  const [lastPrefillId, setLastPrefillId] = useState(null);

  const prefillId = prefillJob ? `${prefillJob.companyName}|${prefillJob.jobDescription?.slice(0, 50)}` : null;
  if (prefillJob && prefillId !== lastPrefillId) {
    setLastPrefillId(prefillId);
    setJobDesc(prefillJob.jobDescription);
    setCompanyName(prefillJob.companyName);
    setResult(null);
    setError(null);
    onPrefillConsumed();
  }

  async function handleGenerate() {
    const experiences = loadExperiences();
    const personalInfo = loadPersonalInfo();
    const skills = loadSkills();
    const references = loadReferences();
    if (!jobDesc.trim()) { setError("Please provide a job description."); return; }
    if (!companyName.trim()) { setError("Please enter the company name."); return; }
    if (experiences.length === 0) { setError("No experiences found. Add entries in the Experience tab first."); return; }
    if (!personalInfo.name.trim()) { setError("Please fill in your name in the Experience tab."); return; }
    setLoading(true); setError(null); setResult(null);
    abortRef.current = new AbortController();
    try {
      const enrichedInfo = { ...personalInfo, skills, references };
      const generated = await generateResume(enrichedInfo, experiences, jobDesc, { signal: abortRef.current.signal });
      setResult(generated);
      onResult(generated, jobDesc, companyName.trim());
    } catch (err) {
      if (err.name === "AbortError") setError("Generation cancelled.");
      else setError(err.message || "Generation failed.");
    } finally { abortRef.current = null; setLoading(false); }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    if (isPdf) {
      setFileLoading(true); setError(null);
      try { const ab = await file.arrayBuffer(); const t = await extractPdfText(ab); if (!t) { setError("Could not extract text."); return; } setJobDesc(t); }
      catch { setError("Failed to read PDF."); }
      finally { setFileLoading(false); }
    } else { const reader = new FileReader(); reader.onload = (ev) => setJobDesc(ev.target.result); reader.readAsText(file); }
    e.target.value = "";
  }

  const expCount = loadExperiences().length;

  const inputStyle = {
    width: "100%",
    background: "var(--bg-primary)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-3) var(--space-4)",
    fontSize: "13px",
    color: "var(--text-primary)",
    outline: "none",
    resize: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>Generate Resume</h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>
          Paste a job description. The agent selects your best experiences, rewrites bullets, and evaluates fit.
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
          {expCount} experience{expCount !== 1 ? "s" : ""} in bank{expCount === 0 ? " - add some in the Experience tab" : ""}
        </p>
      </div>

      {!keyReady && <ApiKeyPrompt onValidated={() => setKeyReady(true)} />}

      {keyReady && (
        <>
          <div className="grid sm:grid-cols-[1fr_200px]" style={{ gap: "var(--space-4)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div className="flex items-center justify-between">
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>Job Description</label>
                <label
                  className="flex items-center"
                  style={{
                    gap: "var(--space-1)",
                    fontSize: "12px",
                    color: fileLoading ? "var(--text-muted)" : "var(--accent)",
                    cursor: fileLoading ? "wait" : "pointer",
                  }}
                >
                  <input type="file" accept=".pdf,.txt,.md" onChange={handleFileUpload} disabled={fileLoading} className="hidden" />
                  {fileLoading ? <><Loader2 size={12} className="animate-spin" /> Reading...</> : <><Upload size={12} /> Upload</>}
                </label>
              </div>
              <textarea
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                placeholder="Paste the full job description..."
                rows={10}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google"
                style={{ ...inputStyle, resize: undefined }}
              />
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Titles the saved resume</p>
            </div>
          </div>

          <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center"
              style={{
                ...btnBase,
                padding: "var(--space-3) var(--space-5)",
                background: "var(--accent)",
                color: "#fff",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              {loading ? "Generating..." : "Generate Resume"}
            </button>
            {loading && (
              <button
                onClick={() => abortRef.current?.abort()}
                className="flex items-center"
                style={{ ...btnBase, background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
              >
                <X size={14} /> Cancel
              </button>
            )}
            {error && (
              <span className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "12px", color: "var(--danger)" }}>
                <XCircle size={13} /> {error}
              </span>
            )}
          </div>

          {result && (
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-6)" }}>
              <ResumePreview result={result} companyName={companyName || "Resume"} jobDesc={jobDesc} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
