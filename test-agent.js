/**
 * Test script for the agent pipeline.
 * Run: ANTHROPIC_API_KEY=sk-ant-... node test-agent.js
 *
 * This sends a real job description through the full agent loop
 * and prints the step-by-step trace.
 */

import Anthropic from "@anthropic-ai/sdk";
import { runResumeAgent } from "./agent.js";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Set ANTHROPIC_API_KEY environment variable to run this test.");
  console.error("Usage: ANTHROPIC_API_KEY=sk-ant-... node test-agent.js");
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const personalInfo = {
  name: "Alex Chen",
  email: "alex.chen@email.com",
  phone: "+1 415-555-0192",
  location: "San Francisco, CA",
  linkedin: "linkedin.com/in/alexchen",
  github: "github.com/alexchen",
  summary: "Senior Software Engineer with 6 years of experience building scalable web applications.",
};

const experiences = [
  {
    id: "exp-1",
    type: "work",
    title: "Senior Software Engineer",
    organization: "Stripe",
    startDate: "Mar 2021",
    endDate: "Present",
    description: "• Led development of a real-time payment processing dashboard serving 10K+ merchants using React, TypeScript, and GraphQL\n• Designed microservices architecture handling 50K requests/second using Node.js and Kubernetes\n• Reduced API latency by 40% through query optimization and Redis caching\n• Mentored 4 junior engineers and led weekly code review sessions",
  },
  {
    id: "exp-2",
    type: "work",
    title: "Software Engineer",
    organization: "Coinbase",
    startDate: "Jun 2019",
    endDate: "Feb 2021",
    description: "• Built React component library used by 12 product teams, reducing UI development time by 30%\n• Implemented OAuth 2.0 authentication flow and role-based access control\n• Developed CI/CD pipeline using GitHub Actions reducing deployment time from 45 to 8 minutes",
  },
  {
    id: "exp-3",
    type: "project",
    title: "OpenTracker",
    organization: "Personal Project",
    startDate: "2023",
    endDate: "Present",
    description: "• Open-source real-time analytics dashboard built with React, D3.js, and WebSockets\n• Handles 100K+ events/minute with sub-100ms rendering latency\n• 800+ GitHub stars, deployed on AWS using ECS and DynamoDB",
  },
  {
    id: "exp-4",
    type: "education",
    title: "B.S. Computer Science",
    organization: "University of California, Berkeley",
    startDate: "2014",
    endDate: "2018",
    description: "• Distributed Systems, Machine Learning, Algorithms, Database Systems\n• Dean's List 2016-2018",
  },
];

const jobDescription = `Senior Backend Engineer — Datadog
Location: New York, NY (Hybrid)
Salary: $190,000 - $240,000

About the Role
We're looking for a Senior Backend Engineer to join our Infrastructure Monitoring team. You'll build high-throughput data pipelines, design scalable services, and help process trillions of data points per day.

Requirements
• 5+ years of professional backend engineering experience
• Strong proficiency in Go or Python for building production services
• Experience with distributed systems and high-throughput data processing
• Familiarity with Kubernetes, Docker, and cloud infrastructure (AWS/GCP)
• Experience with message queues (Kafka, RabbitMQ) and streaming architectures
• Strong understanding of observability: metrics, logging, tracing
• Experience with databases at scale (PostgreSQL, Cassandra, or similar)
• B.S. in Computer Science or equivalent

Nice to Have
• Experience with time-series databases (InfluxDB, TimescaleDB)
• Contributions to open-source observability tools
• Experience processing data at petabyte scale
• Knowledge of eBPF or kernel-level monitoring`;

console.log("Starting agent pipeline...\n");
const start = Date.now();

try {
  const { result, trace } = await runResumeAgent(client, {
    personalInfo,
    experiences,
    jobDescription,
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║          AGENT TRACE                     ║");
  console.log("╚══════════════════════════════════════════╝\n");

  for (const step of trace) {
    console.log(`─── ${step.step} ───`);
    console.log(`    Time: ${step.timestamp}`);
    if (step.step === "extract_requirements") {
      console.log(`    Must-have: ${step.output.must_have?.length || 0} items`);
      console.log(`    Nice-to-have: ${step.output.nice_to_have?.length || 0} items`);
      console.log(`    Keywords: ${step.output.keywords?.join(", ")}`);
    } else if (step.step === "score_experiences") {
      for (const exp of step.output) {
        console.log(`    ${exp.exp_id}: ${exp.relevance_score}/100 — ${exp.rationale}`);
      }
    } else if (step.step === "draft_resume") {
      console.log(`    Sections: ${step.output.sections?.map((s) => s.heading).join(", ")}`);
      const totalBullets = step.output.sections?.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.bullets.length, 0), 0);
      console.log(`    Total bullets: ${totalBullets}`);
    } else if (step.step.startsWith("evaluate")) {
      console.log(`    Score: ${step.output.fit_score}/100`);
      console.log(`    Recommendation: ${step.output.recommendation}`);
      console.log(`    Revision needed: ${step.output.revision_needed}`);
      if (step.output.revision_instructions) {
        console.log(`    Instructions: ${step.output.revision_instructions.slice(0, 120)}...`);
      }
    } else if (step.step.startsWith("revise")) {
      console.log(`    Revision #${step.input.revisionCount}`);
      const totalBullets = step.output.sections?.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.bullets.length, 0), 0);
      console.log(`    Total bullets after revision: ${totalBullets}`);
    }
    console.log("");
  }

  console.log("╔══════════════════════════════════════════╗");
  console.log("║          FINAL RESULT                    ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log(`Score: ${result.fit_score}/100`);
  console.log(`Recommendation: ${result.recommendation}`);
  console.log(`Strengths: ${result.strengths.length}`);
  console.log(`Gaps: ${result.gaps.length}`);
  console.log(`Reasoning: ${result.reasoning}`);
  console.log(`\nTotal time: ${elapsed}s`);
  console.log(`Total agent steps: ${trace.length}`);

} catch (err) {
  console.error("Agent failed:", err.message);
  process.exit(1);
}
