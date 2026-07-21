module.exports = {
  name: "Alan Wang",
  url: "https://thealanwang.github.io",
  assetVersion: "2026-05-08-project-spacing-v1",
  socialImage:
    "https://thealanwang.github.io/assets/social/linkedin-preview.png",
  tagline: "Building applied AI with a systems mindset.",
  quickFacts: ["San Jose, California", "M.S. Computer Science"],
  homeIntroLines: [
    "Applied AI,",
    "backend systems,",
    "and reliable engineering.",
  ],
  homeIntroText:
    "I build AI applications with a systems mindset and use this site to share projects, technical notes, and visual sketches on applied AI, backend systems, and cloud infrastructure.",
  postsIntroTitle: "Recent Posts",
  postsIntroText: "",
  postsPageIntroTitle: "All Posts",
  postsPageIntroText:
    "A chronological archive of projects, sketches, and technical notes.",
  footerText: "Thanks for reading.",
  about: {
    headline:
      "Software engineer building applied AI with strong backend and cloud foundations.",
    intro:
      "I am a software engineer with experience in backend platforms, data-heavy systems, and cloud infrastructure. My recent work focuses on applied AI, especially retrieval-based systems, agent workflows, and the engineering needed to make LLM features reliable in practice.",
    shortBio:
      "My background is in backend engineering, distributed workflows, and data systems. I am now focusing that foundation on applied AI, with particular interest in retrieval systems, agentic workflows, evaluation, and building LLM features that behave reliably beyond a demo.",
    quote: "I build reliable systems on strong backend foundations.",
    projects: [
      {
        name: "Tracker",
        type: "Real-time collaborative task management platform with live workspace updates and optimized dashboard aggregation",
        period: "Mar 2026 – Present",
        url: "https://tracker.thealanwang.xyz",
        details: [
          "Tracker is a full-stack project management system for small teams, built around Linear/Jira-style issue tracking with hierarchical OKR-style goals, sprints, task dependencies, real-time notifications, dark mode, and CSV export. The project is live at <strong>tracker.thealanwang.xyz</strong>, with source code at <strong>github.com/TheAlanWang/tracker</strong>.",
          "<strong>Tech stack</strong><br><strong>TypeScript</strong> · <strong>React</strong> (<strong>Vite</strong>) · <strong>FastAPI</strong> · <strong>Postgres</strong> (<strong>Supabase</strong>) · <strong>Vercel</strong> · <strong>Fly.io</strong> · <strong>GitHub Actions</strong>",
          "<strong>Full-stack product design</strong><br>Designed and shipped a team issue tracker with hierarchical OKR-style goals, sprint planning, task dependencies with <strong>BFS cycle detection</strong>, real-time notifications, dark mode, and CSV export. The database uses an <strong>RLS-first schema</strong> across <strong>15 tables</strong> and <strong>17 migrations</strong>, with per-request user-scoped JWTs so Postgres triggers can see the real actor.",
          "<strong>Backend performance</strong><br>Profiled <code>/me/dashboard</code> latency in production with <strong>5,000 sequential requests</strong> before and after the async migration.<span class=\"project-metric-table\" role=\"table\" aria-label=\"Dashboard latency before and after async migration\"><span role=\"row\"><span role=\"columnheader\">Metric</span><span role=\"columnheader\">Before sync</span><span role=\"columnheader\">After async + gather</span><span role=\"columnheader\">Improvement</span></span><span role=\"row\"><span role=\"cell\">p50</span><span role=\"cell\">1584 ms</span><span role=\"cell\">708 ms</span><span role=\"cell\">-55% (2.2x)</span></span><span role=\"row\"><span role=\"cell\">p90</span><span role=\"cell\">1855 ms</span><span role=\"cell\">1076 ms</span><span role=\"cell\">-42%</span></span><span role=\"row\"><span role=\"cell\">p95</span><span role=\"cell\">2053 ms</span><span role=\"cell\">1114 ms</span><span role=\"cell\">-46% (1.8x)</span></span><span role=\"row\"><span role=\"cell\">p99</span><span role=\"cell\">2452 ms</span><span role=\"cell\">1298 ms</span><span role=\"cell\">-47%</span></span></span>I isolated the bottleneck to backend fan-out across <strong>15 sequential Supabase REST queries</strong>, migrated the FastAPI service and router layer from sync <code>supabase.Client</code> to async <code>AsyncClient</code>, and parallelized independent queries with <code>asyncio.gather</code>.",
          "<strong>Production reliability</strong><br>Replaced per-request <code>PyJWKClient</code> instantiation with a process-wide <strong>LRU cache</strong> keyed by issuer URL. This removed repeated TLS round-trips to Supabase JWKS, eliminated intermittent SSL EOF-driven 500s on <code>/workspaces</code>, and kept Fly.io health checks stable under authenticated traffic.",
        ],
      },
      {
        name: "Unsaid",
        type: "Privacy-preserving anonymous campus forum for verified Northeastern students",
        period: "Apr 2026 – Present",
        url: "https://unsaidhub.xyz/feed",
        details: [
          "Unsaid is a discussion platform where verified Northeastern students post under anonymous personas, giving them privacy from peers without losing community trust. The product is live at <strong>unsaidhub.xyz</strong> with a full backend, real-time notifications, and ranked feeds in production.",
          "<strong>Privacy-preserving data model</strong><br>The core design decouples <strong>identity verification</strong> from <strong>posting identity</strong>. Northeastern email verification gates access, but every post, comment, and like attaches to a user-owned <strong>persona</strong>, never directly to the real user identity. Notifications route by <code>user_id</code> internally while API responses render only the actor's persona, preserving moderation, routing, and self-action suppression without exposing verified emails.",
          "<strong>Real-time notification system</strong><br>I built notification delivery over <strong>FastAPI WebSockets</strong> with JWT-over-query-string authentication, application-defined close codes for actionable client recovery, and a per-user multi-tab connection manager. HTTP handlers persist data, schedule pushes through <strong>BackgroundTasks</strong>, and return immediately, keeping real-time delivery off the request path.",
          "<strong>Performance and ranking</strong><br>I built newest- and hot-ranked feeds from likes, comments, and post age, then precomputed ranked results into <strong>Redis</strong> with write-event-driven invalidation. This removed repeated sort work from the hot path and reduced feed read p50 latency by <strong>30%</strong>.",
          "<strong>Deployment</strong><br>The platform runs with a <strong>React</strong> and <strong>TypeScript</strong> frontend, a containerized <strong>FastAPI</strong> backend on <strong>Fly.io</strong>, and <strong>PostgreSQL</strong> on <strong>Supabase</strong>. I also configured production CORS, JWT-based auth, automated Alembic migrations, environment-scoped secrets, and custom-domain setup.",
          "<strong>Engineering takeaway</strong><br>The hardest part was <strong>preserving anonymity end-to-end</strong> across a social graph while still routing notifications to the right user. Privacy had to be a structural property of the data model, API responses, and runtime behavior; real-time push likewise needed <strong>decoupling from HTTP writes</strong> instead of being optimized after the fact.",
        ],
      },
    ],
    facts: [
      {
        label: "Based in",
        value: "San Jose, California",
      },
      {
        label: "Current focus",
        value:
          "Backend systems, cloud infrastructure, and AI retrieval applications",
      },
      {
        label: "Background",
        value:
          "Software engineering, distributed systems, ETL pipelines, and technical delivery",
      },
      {
        label: "What this site is for",
        value:
          "A place to share posts on what I am learning, building, and testing in public",
      },
    ],
    experience: [
      {
        role: "Technical Project Manager",
        organization: "Shanghai Securities",
        period: "Apr 2022 – Dec 2024",
        points: [
          "Implemented and deployed <strong>integrated REST APIs</strong> across <strong>3 enterprise systems</strong> (HR, reimbursement, project management) into an Office Automation system serving <strong>3K+ users</strong>, improving cross-system workflow automation and internal access efficiency.",
          "Migrated a <strong>500+ user</strong> system from a monolith to <strong>microservices architecture</strong> using <strong>Kafka async workflows</strong> and <strong>CI/CD pipelines with Kubernetes</strong>, reducing deployment time by <strong>40%</strong>.",
          "Led cross-functional delivery for <strong>20+ internal projects</strong>, driving deployment, testing, validation, and post-launch issue support.",
        ],
      },
      {
        role: "Tech Consultant (Risk & Data Analytics) ",
        organization: "Deloitte",
        period: "Dec 2021 – Apr 2022",
        points: [
          "Engineered a <strong>Python and SQL ETL pipeline</strong> for <strong>Basel III compliance</strong> over <strong>10K financial records</strong>, contributing to a <strong>5%+</strong> improvement in capital adequacy ratio.",
          "Automated <strong>regulatory reporting workflows</strong> in Python, reducing a <strong>two-day manual process</strong> to a <strong>30-minute pipeline</strong> with built-in validation.",
        ],
      },
      {
        role: "Tech Consultant ",
        organization: "Cubewise",
        period: "Feb 2020 – Dec 2021",
        points: [
          "Developed and deployed <strong>enterprise EPM solutions</strong> for clients including <strong>Alibaba</strong> and <strong>Mercedes-Benz</strong>, including Python automation for batch report generation.",
          "Designed <strong>ETL pipelines</strong> and <strong>SQL-based data extraction workflows</strong>, improving reporting performance by <strong>35%</strong> through cube refactoring and query optimization on <strong>in-memory OLAP systems</strong>.",
        ],
      },
    ],
    education: [
      {
        school: "Northeastern University",
        degree: "Master of Science in Computer Science",
        period: "Jan 2025 – May 2027",
      },
      {
        school: "University of Sydney",
        degree: "Master of Commerce, Finance & Big Data",
        period: "Jul 2017 – Jun 2019",
      },
      {
        school: "Macquarie University",
        degree: "Bachelor of Commerce, Professional Accounting",
        period: "Oct 2014 – Sep 2017",
      },
    ],
  },
  contact: {
    blurb: "Always happy to connect.",
    links: [
      { label: "Email", url: "mailto:alanwang166@gmail.com", external: false },
      {
        label: "GitHub",
        url: "https://github.com/TheAlanWang",
        external: true,
      },
      {
        label: "LinkedIn",
        url: "https://www.linkedin.com/in/alanwang166",
        external: true,
      },
    ],
  },
};
