import { useState, useEffect } from "react";
import {
  loadExperiences,
  saveExperiences,
  loadPersonalInfo,
  savePersonalInfo,
  createExperience,
  DEMO_PERSONAL_INFO,
  DEMO_EXPERIENCES,
} from "../store";
import { isDemoMode } from "../api";

const TYPES = [
  { id: "work", label: "Work Experience" },
  { id: "volunteer", label: "Volunteer" },
  { id: "project", label: "Project" },
  { id: "education", label: "Education" },
];

const TYPE_LABELS = {
  work: { title: "Job Title", org: "Company" },
  volunteer: { title: "Role", org: "Organization" },
  project: { title: "Project Name", org: "Organization / Context" },
  education: { title: "Degree / Program", org: "Institution" },
};

function PersonalInfoSection({ info, onChange }) {
  function update(field, value) {
    onChange({ ...info, [field]: value });
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Personal Info</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { key: "name", label: "Full Name", placeholder: "John Doe" },
          { key: "email", label: "Email", placeholder: "john@example.com" },
          { key: "phone", label: "Phone", placeholder: "+1 555-123-4567" },
          { key: "location", label: "Location", placeholder: "San Francisco, CA" },
          { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/johndoe" },
          { key: "github", label: "GitHub", placeholder: "github.com/johndoe" },
        ].map((field) => (
          <div key={field.key} className="space-y-1">
            <label className="text-xs text-gray-400">{field.label}</label>
            <input
              type="text"
              value={info[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <label className="text-xs text-gray-400">Professional Summary</label>
        <textarea
          value={info.summary}
          onChange={(e) => update("summary", e.target.value)}
          placeholder="Brief professional summary highlighting your key strengths and career focus..."
          rows={3}
          className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
        />
      </div>
    </div>
  );
}

function ExperienceCard({ exp, onUpdate, onDelete }) {
  const labels = TYPE_LABELS[exp.type];

  function update(field, value) {
    onUpdate({ ...exp, [field]: value });
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="px-2 py-0.5 bg-indigo-900/30 border border-indigo-500/20 rounded-full text-[10px] text-indigo-300 font-medium uppercase">
          {exp.type}
        </span>
        <button
          onClick={() => onDelete(exp.id)}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">{labels.title}</label>
          <input
            type="text"
            value={exp.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={labels.title}
            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">{labels.org}</label>
          <input
            type="text"
            value={exp.organization}
            onChange={(e) => update("organization", e.target.value)}
            placeholder={labels.org}
            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Start Date</label>
          <input
            type="text"
            value={exp.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            placeholder="Jan 2022"
            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">End Date</label>
          <input
            type="text"
            value={exp.endDate}
            onChange={(e) => update("endDate", e.target.value)}
            placeholder="Present"
            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Description / Bullet Points</label>
        <textarea
          value={exp.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder={"• Led development of...\n• Increased revenue by...\n• Managed a team of..."}
          rows={4}
          className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
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
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    savePersonalInfo(info);
  }, [info]);

  useEffect(() => {
    saveExperiences(experiences);
  }, [experiences]);

  function addExperience(type) {
    setExperiences((prev) => [...prev, createExperience(type)]);
  }

  function updateExperience(updated) {
    setExperiences((prev) =>
      prev.map((exp) => (exp.id === updated.id ? updated : exp))
    );
  }

  function deleteExperience(id) {
    setExperiences((prev) => prev.filter((exp) => exp.id !== id));
  }

  const filtered =
    filter === "all"
      ? experiences
      : experiences.filter((exp) => exp.type === filter);

  const counts = experiences.reduce((acc, exp) => {
    acc[exp.type] = (acc[exp.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-200">My Experience Bank</h2>
        <p className="text-sm text-gray-400 mt-1">
          Add all your work, volunteer, projects, and education. These are used to generate tailored resumes.
        </p>
      </div>

      <PersonalInfoSection info={info} onChange={setInfo} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "all"
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            All ({experiences.length})
          </button>
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === t.id
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              {t.label} ({counts[t.id] || 0})
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => addExperience(t.id)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-all"
            >
              + {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm">No experiences yet</p>
          <p className="text-xs mt-2 text-gray-600">Add your work, volunteer experience, projects, and education above</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((exp) => (
          <ExperienceCard
            key={exp.id}
            exp={exp}
            onUpdate={updateExperience}
            onDelete={deleteExperience}
          />
        ))}
      </div>
    </div>
  );
}
