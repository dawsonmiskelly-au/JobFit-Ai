export const evalCases = [
  {
    id: "strong-fit",
    name: "Strong Fit — Software Engineer → Software Engineer",
    resume: `ALEX CHEN
Senior Software Engineer | San Francisco, CA
alex.chen@email.com | github.com/alexchen

SUMMARY
Senior Software Engineer with 6 years of experience building scalable web applications and distributed systems. Proficient in React, TypeScript, Node.js, Python, and cloud infrastructure. Passionate about clean code, testing, and mentoring junior developers.

EXPERIENCE
Senior Software Engineer — Stripe (2021–Present)
• Led development of a real-time payment processing dashboard serving 10K+ merchants using React, TypeScript, and GraphQL
• Designed and implemented microservices architecture handling 50K requests/second using Node.js and Kubernetes
• Reduced API latency by 40% through query optimization and caching strategies with Redis
• Mentored 4 junior engineers and led weekly code review sessions
• Drove adoption of end-to-end testing with Playwright, increasing test coverage from 45% to 89%

Software Engineer — Coinbase (2019–2021)
• Built React component library used by 12 product teams, reducing UI development time by 30%
• Implemented OAuth 2.0 authentication flow and role-based access control for internal tools
• Developed CI/CD pipeline using GitHub Actions reducing deployment time from 45 to 8 minutes
• Participated in on-call rotation, resolving P0 incidents with 99.95% uptime SLA

Junior Software Engineer — Twilio (2018–2019)
• Developed REST APIs in Python/Flask for SMS routing engine processing 1M+ messages daily
• Wrote comprehensive unit and integration tests with pytest achieving 92% code coverage
• Contributed to open-source SDK libraries for Python, Node.js, and Java

EDUCATION
B.S. Computer Science — University of California, Berkeley (2018)
• Relevant coursework: Distributed Systems, Machine Learning, Algorithms, Database Systems

SKILLS
Languages: TypeScript, JavaScript, Python, Go, SQL
Frontend: React, Next.js, GraphQL, Tailwind CSS
Backend: Node.js, Express, Flask, FastAPI
Infrastructure: AWS, GCP, Kubernetes, Docker, Terraform
Databases: PostgreSQL, Redis, MongoDB, DynamoDB
Testing: Jest, Playwright, pytest, Cypress`,

    jobDescription: `Senior Software Engineer — TechCorp Inc.
Location: San Francisco, CA (Hybrid)
Salary: $180,000 - $220,000

About the Role
We're looking for a Senior Software Engineer to join our Platform team. You'll design and build scalable web applications, mentor junior engineers, and help shape our technical direction.

Requirements
• 5+ years of professional software engineering experience
• Strong proficiency in React, TypeScript, and modern frontend frameworks
• Experience with Node.js and building RESTful or GraphQL APIs
• Familiarity with cloud platforms (AWS or GCP) and containerization (Docker/Kubernetes)
• Experience with CI/CD pipelines and automated testing
• Strong communication skills and experience mentoring other engineers
• B.S. in Computer Science or equivalent experience

Nice to Have
• Experience with distributed systems at scale
• Knowledge of Python for data processing pipelines
• Contributions to open-source projects
• Experience with real-time data processing`,

    expected: {
      scoreRange: [80, 100],
      recommendation: ["STRONG_HIRE", "HIRE"],
      minStrengths: 3,
      minGaps: 1,
    },
  },
  {
    id: "weak-fit",
    name: "Weak Fit — Chef → Data Scientist",
    resume: `MARIA GONZALEZ
Executive Chef | Austin, TX
maria.gonzalez@email.com

SUMMARY
Award-winning Executive Chef with 12 years of experience in fine dining and restaurant management. Expertise in French and Latin American cuisine, menu development, and kitchen operations. Led teams of 20+ kitchen staff across multiple restaurant concepts.

EXPERIENCE
Executive Chef — Ember & Oak Restaurant (2019–Present)
• Lead kitchen operations for upscale 120-seat restaurant generating $4.2M annual revenue
• Designed seasonal tasting menus featured in Austin Monthly's "Top 10 Dining Experiences"
• Managed food cost to 28% of revenue through strategic vendor negotiations and waste reduction
• Trained and supervised team of 22 kitchen staff across all stations
• Implemented kitchen management software (MarketMan) to streamline inventory and ordering
• Achieved 4.8/5 average rating across Yelp and Google with 2,000+ reviews

Sous Chef — The Capital Grille (2015–2019)
• Assisted Executive Chef in daily operations of high-volume steakhouse ($6M annual revenue)
• Developed standardized recipes and plating guides ensuring consistency across 200+ covers nightly
• Coordinated catering events for groups up to 300 guests
• Managed relationships with 15+ local farms and specialty food suppliers

Line Cook — Various Restaurants (2012–2015)
• Progressed from prep cook to line cook across three Austin restaurants
• Specialized in sauté, grill, and pastry stations

EDUCATION
Associate Degree, Culinary Arts — Le Cordon Bleu (2012)
Food Safety Manager Certification — ServSafe (2014)

SKILLS
Culinary: French technique, Latin American cuisine, pastry, butchery, fermentation
Management: Team leadership, P&L management, vendor relations, menu engineering
Software: MarketMan, Toast POS, OpenTable, Microsoft Office
Languages: English, Spanish (native)`,

    jobDescription: `Senior Data Scientist — DataDriven Analytics
Location: Remote
Salary: $160,000 - $200,000

About the Role
We're seeking a Senior Data Scientist to lead our predictive analytics team. You'll develop machine learning models, analyze large datasets, and deliver actionable insights to Fortune 500 clients.

Requirements
• M.S. or Ph.D. in Statistics, Mathematics, Computer Science, or related quantitative field
• 5+ years of experience in data science or machine learning engineering
• Expert proficiency in Python (pandas, scikit-learn, TensorFlow or PyTorch)
• Strong SQL skills and experience with big data technologies (Spark, Hadoop)
• Experience with statistical modeling, A/B testing, and experimental design
• Proficiency in data visualization (Matplotlib, Seaborn, Tableau)
• Experience deploying ML models to production
• Strong communication skills for presenting findings to non-technical stakeholders

Nice to Have
• Experience with NLP or computer vision
• Knowledge of cloud ML platforms (AWS SageMaker, GCP Vertex AI)
• Published research in machine learning or statistics
• Experience with real-time streaming analytics`,

    expected: {
      scoreRange: [0, 49],
      recommendation: ["NO_HIRE", "LEAN_NO_HIRE"],
      minStrengths: 1,
      minGaps: 2,
    },
  },
  {
    id: "borderline-fit",
    name: "Borderline — Marketing Manager → Project Manager",
    resume: `JORDAN TAYLOR
Senior Marketing Manager | Chicago, IL
jordan.taylor@email.com | linkedin.com/in/jordantaylor

SUMMARY
Strategic Marketing Manager with 7 years of experience leading cross-functional campaigns, managing budgets up to $2M, and driving measurable business outcomes. Skilled at stakeholder management, timeline coordination, and data-driven decision making.

EXPERIENCE
Senior Marketing Manager — HubSpot (2020–Present)
• Led cross-functional team of 8 (designers, copywriters, analysts) to execute integrated marketing campaigns
• Managed $1.8M annual marketing budget, delivering campaigns 5% under budget while exceeding KPI targets by 15%
• Coordinated product launch timelines across marketing, sales, engineering, and customer success teams
• Built project tracking dashboards in Asana and Tableau to monitor campaign progress and resource allocation
• Conducted A/B testing programs that improved email conversion rates by 34%
• Presented quarterly marketing performance reports to VP and C-suite stakeholders

Marketing Manager — Salesforce (2017–2020)
• Managed end-to-end execution of 20+ marketing campaigns per quarter across digital and event channels
• Coordinated with 5 external agency partners, managing SOWs, timelines, and deliverables
• Led migration from legacy marketing tools to Marketo, training 30+ team members over 3 months
• Developed risk mitigation plans for major product launches, identifying and resolving blockers proactively

Marketing Coordinator — Deloitte (2016–2017)
• Supported senior marketers with campaign logistics, vendor coordination, and budget tracking
• Created standardized project templates and process documentation adopted firm-wide

EDUCATION
B.A. Business Administration, Marketing Concentration — University of Michigan (2016)
Google Analytics Certified (2018)
HubSpot Inbound Marketing Certified (2020)

SKILLS
Project Tools: Asana, Jira, Monday.com, Trello, Microsoft Project
Analytics: Google Analytics, Tableau, Excel (advanced), SQL (basic)
Marketing: Marketo, HubSpot, Salesforce CRM, Google Ads, SEO/SEM
Soft Skills: Stakeholder management, cross-functional leadership, budget management, risk assessment
Methodologies: Agile/Scrum (familiar), Waterfall`,

    jobDescription: `Senior Project Manager — Accenture
Location: Chicago, IL (Hybrid)
Salary: $120,000 - $150,000

About the Role
We're hiring a Senior Project Manager to lead enterprise technology implementation projects for our consulting clients. You'll manage complex multi-workstream initiatives, coordinate cross-functional teams, and ensure on-time, on-budget delivery.

Requirements
• 5+ years of project management experience, preferably in technology or consulting
• PMP or equivalent project management certification
• Experience managing projects with budgets of $1M+
• Proficiency with project management tools (MS Project, Jira, or similar)
• Strong understanding of Agile and Waterfall methodologies
• Excellent stakeholder management and executive communication skills
• Experience with risk management and mitigation planning
• Ability to manage multiple concurrent projects

Nice to Have
• Experience in management consulting
• Technical background or familiarity with software development lifecycle
• Experience with change management frameworks
• Six Sigma or Lean certification`,

    expected: {
      scoreRange: [55, 75],
      recommendation: ["LEAN_HIRE", "LEAN_NO_HIRE"],
      minStrengths: 2,
      minGaps: 2,
    },
  },
];
