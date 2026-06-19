const STORAGE_KEY = "jobfit-experiences";
const INFO_KEY = "jobfit-personal-info";

function load(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

export function loadExperiences() {
  return load(STORAGE_KEY, []);
}

export function saveExperiences(experiences) {
  save(STORAGE_KEY, experiences);
}

export function loadPersonalInfo() {
  return load(INFO_KEY, {
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    summary: "",
  });
}

export function savePersonalInfo(info) {
  save(INFO_KEY, info);
}

export function createExperience(type) {
  return {
    id: crypto.randomUUID(),
    type,
    title: "",
    organization: "",
    startDate: "",
    endDate: "",
    description: "",
  };
}

export const DEMO_PERSONAL_INFO = {
  name: "Alex Chen",
  email: "alex.chen@email.com",
  phone: "+1 415-555-0192",
  location: "San Francisco, CA",
  linkedin: "linkedin.com/in/alexchen",
  github: "github.com/alexchen",
  summary: "Senior Software Engineer with 6 years of experience building scalable web applications and distributed systems. Passionate about clean code, testing, and mentoring junior developers.",
};

export const DEMO_EXPERIENCES = [
  {
    id: "demo-1",
    type: "work",
    title: "Senior Software Engineer",
    organization: "Stripe",
    startDate: "Mar 2021",
    endDate: "Present",
    description: "• Led development of a real-time payment processing dashboard serving 10K+ merchants using React, TypeScript, and GraphQL\n• Designed and implemented microservices architecture handling 50K requests/second using Node.js and Kubernetes\n• Reduced API latency by 40% through query optimization and caching strategies with Redis\n• Mentored 4 junior engineers and led weekly code review sessions\n• Drove adoption of end-to-end testing with Playwright, increasing test coverage from 45% to 89%",
  },
  {
    id: "demo-2",
    type: "work",
    title: "Software Engineer",
    organization: "Coinbase",
    startDate: "Jun 2019",
    endDate: "Feb 2021",
    description: "• Built React component library used by 12 product teams, reducing UI development time by 30%\n• Implemented OAuth 2.0 authentication flow and role-based access control for internal tools\n• Developed CI/CD pipeline using GitHub Actions reducing deployment time from 45 to 8 minutes\n• Participated in on-call rotation, resolving P0 incidents with 99.95% uptime SLA",
  },
  {
    id: "demo-3",
    type: "work",
    title: "Junior Software Engineer",
    organization: "Twilio",
    startDate: "Jul 2018",
    endDate: "May 2019",
    description: "• Developed REST APIs in Python/Flask for SMS routing engine processing 1M+ messages daily\n• Wrote comprehensive unit and integration tests with pytest achieving 92% code coverage\n• Contributed to open-source SDK libraries for Python, Node.js, and Java",
  },
  {
    id: "demo-4",
    type: "volunteer",
    title: "Lead Mentor",
    organization: "Code for SF",
    startDate: "Jan 2020",
    endDate: "Present",
    description: "• Mentor 10+ aspiring developers through weekly pair programming and code review sessions\n• Built and maintained the organization's website using Next.js and Tailwind CSS\n• Organized quarterly hackathons with 50+ participants focused on civic tech projects",
  },
  {
    id: "demo-5",
    type: "project",
    title: "OpenTracker",
    organization: "Personal Project",
    startDate: "2023",
    endDate: "Present",
    description: "• Open-source real-time analytics dashboard built with React, D3.js, and WebSockets\n• Handles 100K+ events/minute with sub-100ms rendering latency\n• 800+ GitHub stars, featured in JavaScript Weekly\n• Deployed on AWS using ECS, CloudFront, and DynamoDB",
  },
  {
    id: "demo-6",
    type: "education",
    title: "B.S. Computer Science",
    organization: "University of California, Berkeley",
    startDate: "2014",
    endDate: "2018",
    description: "• Relevant coursework: Distributed Systems, Machine Learning, Algorithms, Database Systems\n• Dean's List 2016-2018\n• Teaching Assistant for CS 61B: Data Structures",
  },
];
