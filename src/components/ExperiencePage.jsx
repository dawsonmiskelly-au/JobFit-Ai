import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  Upload, Plus, Trash2, Briefcase, Heart, FolderOpen, GraduationCap, Loader2, AlertCircle, Archive, Wrench, Users,
} from "lucide-react";
import {
  loadExperiences, saveExperiences, loadPersonalInfo, savePersonalInfo,
  loadSkills, saveSkills, loadReferences, saveReferences, createReference,
  createExperience, DEMO_PERSONAL_INFO, DEMO_EXPERIENCES, DEMO_SKILLS, DEMO_REFERENCES,
} from "../store";
import { isDemoMode, parseResume } from "../api";

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

const TYPES = [
  { id: "work", label: "Work", icon: Briefcase },
  { id: "volunteer", label: "Volunteer", icon: Heart },
  { id: "project", label: "Project", icon: FolderOpen },
  { id: "education", label: "Education", icon: GraduationCap },
];

const TYPE_LABELS = {
  work: { title: "Job Title", org: "Company" },
  volunteer: { title: "Role", org: "Organization" },
  project: { title: "Project Name", org: "Context" },
  education: { title: "Degree / Program", org: "Institution" },
};

const TYPE_ICONS = {
  work: Briefcase,
  volunteer: Heart,
  project: FolderOpen,
  education: GraduationCap,
};

const inputStyle = {
  width: "100%",
  background: "var(--bg-primary)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-2) var(--space-3)",
  fontSize: "13px",
  color: "var(--text-primary)",
  outline: "none",
  transition: "border-color 0.15s",
};

const textareaStyle = {
  ...inputStyle,
  resize: "none",
};

function PersonalInfoSection({ info, onChange }) {
  function update(field, value) {
    onChange({ ...info, [field]: value });
  }

  const fields = [
    { key: "name", label: "Full Name", placeholder: "John Doe" },
    { key: "email", label: "Email", placeholder: "john@example.com" },
    { key: "phone", label: "Phone", placeholder: "+1 555-123-4567" },
    { key: "location", label: "Location", placeholder: "San Francisco, CA" },
    { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/johndoe" },
    { key: "github", label: "GitHub", placeholder: "github.com/johndoe" },
  ];

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
      }}
    >
      <h3
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "var(--space-5)",
        }}
      >
        Personal Info
      </h3>
      <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-4)" }}>
        {fields.map((field) => (
          <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>{field.label}</label>
            <input
              type="text"
              value={info[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder={field.placeholder}
              style={inputStyle}
            />
          </div>
        ))}
      </div>
      <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>Professional Summary</label>
        <textarea
          value={info.summary}
          onChange={(e) => update("summary", e.target.value)}
          placeholder="Brief professional summary..."
          rows={3}
          style={textareaStyle}
        />
      </div>
    </div>
  );
}

function ExperienceCard({ exp, onUpdate, onDelete }) {
  const labels = TYPE_LABELS[exp.type];
  const Icon = TYPE_ICONS[exp.type] || Briefcase;

  function update(field, value) {
    onUpdate({ ...exp, [field]: value });
  }

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
        <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
          <Icon size={14} style={{ color: "var(--accent)" }} />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {exp.type}
          </span>
        </div>
        <button
          onClick={() => onDelete(exp.id)}
          className="flex items-center transition-colors"
          style={{ gap: "var(--space-1)", fontSize: "12px", color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none" }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-3)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>{labels.title}</label>
          <input type="text" value={exp.title} onChange={(e) => update("title", e.target.value)} placeholder={labels.title} style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>{labels.org}</label>
          <input type="text" value={exp.organization} onChange={(e) => update("organization", e.target.value)} placeholder={labels.org} style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>Start</label>
          <input type="text" value={exp.startDate} onChange={(e) => update("startDate", e.target.value)} placeholder="Jan 2022" style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>End</label>
          <input type="text" value={exp.endDate} onChange={(e) => update("endDate", e.target.value)} placeholder="Present" style={inputStyle} />
        </div>
      </div>

      <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>Description</label>
        <textarea
          value={exp.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder={"- Led development of...\n- Increased revenue by..."}
          rows={4}
          style={textareaStyle}
        />
      </div>
    </div>
  );
}

export default function ExperiencePage() {
  const [info, setInfo] = useState(() => {
    const stored = loadPersonalInfo();
    if (isDemoMode() && !stored.name) return DEMO_PERSONAL_INFO;
    return stored;
  });
  const [experiences, setExperiences] = useState(() => {
    const stored = loadExperiences();
    if (isDemoMode() && stored.length === 0) return DEMO_EXPERIENCES;
    return stored;
  });
  const [skills, setSkills] = useState(() => {
    const stored = loadSkills();
    if (isDemoMode() && !stored.technical) return DEMO_SKILLS;
    return stored;
  });
  const [references, setReferences] = useState(() => {
    const stored = loadReferences();
    if (isDemoMode() && stored.length === 0) return DEMO_REFERENCES;
    return stored;
  });
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => { savePersonalInfo(info); }, [info]);
  useEffect(() => { saveExperiences(experiences); }, [experiences]);
  useEffect(() => { saveSkills(skills); }, [skills]);
  useEffect(() => { saveReferences(references); }, [references]);

  async function handleResumeUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setUploadError(null);

    try {
      let text;
      const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
      if (isPdf) {
        const ab = await file.arrayBuffer();
        text = await extractPdfText(ab);
        if (!text) { setUploadError("Could not extract text from this PDF."); setUploading(false); return; }
      } else {
        text = await file.text();
      }

      const parsed = await parseResume(text);
      if (parsed.personalInfo) {
        setInfo((prev) => {
          const updated = { ...prev };
          for (const [key, value] of Object.entries(parsed.personalInfo)) {
            if (value && typeof value === "string" && value.trim() && !prev[key]?.trim()) updated[key] = value;
          }
          return updated;
        });
      }
      if (parsed.experiences?.length > 0) {
        const newExps = parsed.experiences.map((exp) => ({
          id: crypto.randomUUID(), type: exp.type || "work", title: exp.title || "",
          organization: exp.organization || "", startDate: exp.startDate || "",
          endDate: exp.endDate || "", description: exp.description || "",
        }));
        setExperiences((prev) => [...prev, ...newExps]);
      }
    } catch (err) {
      setUploadError(err.message || "Failed to parse resume.");
    } finally {
      setUploading(false);
    }
  }

  function addExperience(type) { setExperiences((prev) => [...prev, createExperience(type)]); }
  function updateExperience(updated) { setExperiences((prev) => prev.map((exp) => (exp.id === updated.id ? updated : exp))); }
  function deleteExperience(id) { setExperiences((prev) => prev.filter((exp) => exp.id !== id)); }

  const filtered = filter === "all" ? experiences : experiences.filter((exp) => exp.type === filter);
  const counts = experiences.reduce((acc, exp) => { acc[exp.type] = (acc[exp.type] || 0) + 1; return acc; }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>Experience Bank</h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>
          Your work, projects, and education used to generate tailored resumes.
        </p>
      </div>

      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px dashed var(--border-strong)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        <Upload size={20} style={{ color: "var(--text-muted)" }} />
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Upload an existing resume to auto-fill your experience bank.
        </p>
        <label
          className="flex items-center transition-colors"
          style={{
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-4)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 500,
            background: uploading ? "var(--bg-tertiary)" : "var(--accent)",
            color: uploading ? "var(--text-tertiary)" : "#fff",
            cursor: uploading ? "wait" : "pointer",
          }}
        >
          <input type="file" accept=".pdf,.txt,.md" onChange={handleResumeUpload} disabled={uploading} className="hidden" />
          {uploading ? (<><Loader2 size={14} className="animate-spin" /> Parsing...</>) : "Upload Resume"}
        </label>
        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          Requires API key. Connect on the Generate tab first.
        </p>
        {uploadError && (
          <div className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "12px", color: "var(--danger)" }}>
            <AlertCircle size={13} /> {uploadError}
          </div>
        )}
      </div>

      <PersonalInfoSection info={info} onChange={setInfo} />

      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
        }}
      >
        <div className="flex items-center" style={{ gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
          <Wrench size={14} style={{ color: "var(--accent)" }} />
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Skills
          </h3>
        </div>
        <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-4)" }}>
          {[
            { key: "technical", label: "Technical Skills", placeholder: "TypeScript, Python, Go, SQL..." },
            { key: "languages", label: "Frameworks & Libraries", placeholder: "React, Node.js, Flask, Next.js..." },
            { key: "tools", label: "Tools & Platforms", placeholder: "AWS, Docker, Kubernetes, Git..." },
            { key: "certifications", label: "Certifications", placeholder: "AWS Solutions Architect, PMP..." },
          ].map((field) => (
            <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>{field.label}</label>
              <input
                type="text"
                value={skills[field.key]}
                onChange={(e) => setSkills((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>Other Skills</label>
          <input
            type="text"
            value={skills.other}
            onChange={(e) => setSkills((prev) => ({ ...prev, other: e.target.value }))}
            placeholder="Leadership, Agile/Scrum, Public Speaking..."
            style={inputStyle}
          />
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-5)" }}>
          <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
            <Users size={14} style={{ color: "var(--accent)" }} />
            <h3
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              References ({references.length})
            </h3>
          </div>
          <button
            onClick={() => setReferences((prev) => [...prev, createReference()])}
            className="flex items-center"
            style={{
              gap: "var(--space-1)",
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--accent)",
              background: "var(--accent-muted)",
              border: "1px solid var(--accent-border)",
              cursor: "pointer",
            }}
          >
            <Plus size={12} /> Add Reference
          </button>
        </div>

        {references.length === 0 && (
          <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "var(--space-4) 0" }}>
            No references added yet
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {references.map((ref) => (
            <div
              key={ref.id}
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-3)" }}>
                <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
                  {ref.name || "New Reference"}
                </span>
                <button
                  onClick={() => setReferences((prev) => prev.filter((r) => r.id !== ref.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "var(--space-1)" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-3)" }}>
                {[
                  { key: "name", label: "Name", placeholder: "Jane Smith" },
                  { key: "title", label: "Title", placeholder: "Engineering Manager" },
                  { key: "organization", label: "Organization", placeholder: "Google" },
                  { key: "relationship", label: "Relationship", placeholder: "Direct manager" },
                  { key: "email", label: "Email", placeholder: "jane@example.com" },
                  { key: "phone", label: "Phone", placeholder: "+1 555-000-0000" },
                ].map((field) => (
                  <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{field.label}</label>
                    <input
                      type="text"
                      value={ref[field.key]}
                      onChange={(e) => setReferences((prev) => prev.map((r) => r.id === ref.id ? { ...r, [field.key]: e.target.value } : r))}
                      placeholder={field.placeholder}
                      style={{ ...inputStyle, fontSize: "12px", padding: "var(--space-2) var(--space-3)" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap" style={{ gap: "var(--space-3)" }}>
        <div className="flex" style={{ gap: "var(--space-1)" }}>
          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              fontWeight: filter === "all" ? 500 : 400,
              color: filter === "all" ? "var(--text-primary)" : "var(--text-tertiary)",
              background: filter === "all" ? "var(--bg-tertiary)" : "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            All ({experiences.length})
          </button>
          {TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className="flex items-center"
                style={{
                  gap: "var(--space-1)",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "12px",
                  fontWeight: filter === t.id ? 500 : 400,
                  color: filter === t.id ? "var(--text-primary)" : "var(--text-tertiary)",
                  background: filter === t.id ? "var(--bg-tertiary)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Icon size={12} /> {t.label} ({counts[t.id] || 0})
              </button>
            );
          })}
        </div>

        <div className="flex" style={{ gap: "var(--space-2)" }}>
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => addExperience(t.id)}
              className="flex items-center transition-colors"
              style={{
                gap: "var(--space-1)",
                padding: "var(--space-1) var(--space-3)",
                borderRadius: "var(--radius-md)",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--accent)",
                background: "var(--accent-muted)",
                border: "1px solid var(--accent-border)",
                cursor: "pointer",
              }}
            >
              <Plus size={12} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-16) 0" }}>
          <Archive size={32} style={{ margin: "0 auto var(--space-4)", color: "var(--text-muted)" }} />
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>No experiences yet</p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            Add entries above or upload an existing resume
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {filtered.map((exp) => (
          <ExperienceCard key={exp.id} exp={exp} onUpdate={updateExperience} onDelete={deleteExperience} />
        ))}
      </div>
    </div>
  );
}
