module.exports = {
  name: "Alan Wang",
  url: "https://thealanwang.github.io",
  assetVersion: "2026-10-26-projects-v1",
  socialImage:
    "https://thealanwang.github.io/assets/social/linkedin-preview.png",
  tagline: "AI that works beyond the demo.",
  quickFacts: ["San Jose, California", "M.S. Computer Science"],
  homeIntroLines: [
    "AI systems,",
    "distributed pipelines,",
    "and the backend beneath them.",
  ],
  homeIntroText:
    "I use this site to share what I build and learn: projects and technical notes on AI systems, distributed data, backend, and cloud infrastructure.",
  postsIntroTitle: "Recent posts",
  postsIntroText: "",
  postsPageIntroTitle: "All Posts",
  postsPageIntroText:
    "A chronological archive of projects and technical notes.",
  footerText: "Thanks for reading.",
  about: {
    headline: "Software engineer focused on AI and distributed systems.",
    intro:
      "I started in finance technology, building ETL pipelines and reporting systems as a consultant, then moved into backend work: integrating enterprise systems and migrating a monolith to microservices. Now, during my MS in Computer Science at Northeastern, I build AI systems, including RAG agents, VLM evaluation, and AI-native products. What I care about most is the engineering around the model: clean data flow, evaluation that catches regressions, and services that stay reliable in production.",
    projects: [
      {
        name: "Trackly",
        type: "AI-native task management platform with a built-in assistant, an MCP server, and real-time workspace updates",
        period: "Mar 2026 – Present",
        url: "https://gettrackly.dev/",
        details: [
          "Trackly is a full-stack project management system for small teams, built around Linear/Jira-style issue tracking with hierarchical OKR-style goals, sprints, task dependencies, real-time notifications, dark mode, and CSV export. The project is live at <strong>gettrackly.dev</strong>, with source code at <strong>github.com/TheAlanWang/tracker</strong>.",
          "<strong>Tech stack</strong><br><strong>TypeScript</strong> · <strong>React</strong> (<strong>Vite</strong>) · <strong>FastAPI</strong> · <strong>Postgres</strong> (<strong>Supabase</strong>) · <strong>Claude API</strong> · <strong>MCP</strong> · <strong>Vercel</strong> · <strong>Railway</strong>",
          "<strong>Full-stack product design</strong><br>Designed and shipped a team issue tracker with hierarchical OKR-style goals, sprint planning, task dependencies with <strong>BFS cycle detection</strong>, real-time notifications, dark mode, and CSV export. The database uses an <strong>RLS-first schema</strong> across <strong>18 tables</strong> and <strong>46 migrations</strong>, with per-request user-scoped JWTs so Postgres triggers can see the real actor.",
          "<strong>AI assistant and MCP server</strong><br>Every board has a built-in assistant: a server-side <strong>Claude tool-use loop</strong> (no framework) that sees a snapshot of the board, proposes tasks before creating them, and acts through the same services and <strong>Row Level Security</strong> as the human UI, so it can never touch anything the user cannot. A hosted <strong>MCP server</strong> (<code>mcp.gettrackly.dev</code>, OAuth 2.1 with Dynamic Client Registration) lets Claude Code, Cursor, or Claude Desktop drive the same board, with tool names kept in parity with the in-app agent.",
          "<strong>Backend performance</strong><br>Profiled <code>/me/dashboard</code> latency in production with <strong>5,000 sequential requests</strong> before and after the async migration.<span class=\"project-metric-table\" role=\"table\" aria-label=\"Dashboard latency before and after async migration\"><span role=\"row\"><span role=\"columnheader\">Metric</span><span role=\"columnheader\">Before sync</span><span role=\"columnheader\">After async + gather</span><span role=\"columnheader\">Improvement</span></span><span role=\"row\"><span role=\"cell\">p50</span><span role=\"cell\">1584 ms</span><span role=\"cell\">708 ms</span><span role=\"cell\">-55% (2.2x)</span></span><span role=\"row\"><span role=\"cell\">p90</span><span role=\"cell\">1855 ms</span><span role=\"cell\">1076 ms</span><span role=\"cell\">-42%</span></span><span role=\"row\"><span role=\"cell\">p95</span><span role=\"cell\">2053 ms</span><span role=\"cell\">1114 ms</span><span role=\"cell\">-46% (1.8x)</span></span><span role=\"row\"><span role=\"cell\">p99</span><span role=\"cell\">2452 ms</span><span role=\"cell\">1298 ms</span><span role=\"cell\">-47%</span></span></span>I isolated the bottleneck to backend fan-out across <strong>15 sequential Supabase REST queries</strong>, migrated the FastAPI service and router layer from sync <code>supabase.Client</code> to async <code>AsyncClient</code>, and parallelized independent queries with <code>asyncio.gather</code>.",
          "<strong>Production reliability</strong><br>Replaced per-request <code>PyJWKClient</code> instantiation with a process-wide <strong>LRU cache</strong> keyed by issuer URL. This removed repeated TLS round-trips to Supabase JWKS, eliminated intermittent SSL EOF-driven 500s on <code>/workspaces</code>, and kept health checks stable under authenticated traffic.",
        ],
      },
      {
        name: "LedgerFlow",
        type: "Batch and streaming fraud-detection pipeline over 6.3M payment transactions",
        period: "Sep 2026",
        url: "https://github.com/TheAlanWang/ledgerflow",
        urlLabel: "View code",
        details: [
          "LedgerFlow is a batch + streaming pipeline for payment transactions on the PaySim dataset (6,362,620 rows), running locally on Docker. Source code at <strong>github.com/TheAlanWang/ledgerflow</strong>.",
          "<strong>Tech stack</strong><br><strong>Python</strong> · <strong>Go</strong> · <strong>Kafka</strong> · <strong>Spark Structured Streaming</strong> · <strong>Airflow</strong> · <strong>PostgreSQL</strong> · <strong>Docker</strong>",
          "<strong>Ingestion</strong><br>A Go producer (<strong>franz-go</strong>, idempotent) streams all 6.3M events to Kafka in 11–16 s (<strong>~390K events/s, ~22× the Python producer</strong>) with zero delivery failures, emitting the same schema and keys as the Python version.",
          "<strong>Data-driven fraud rules</strong><br>The first intuition-based rules failed on real data (e.g. 0.5% precision for large transfers). PySpark analysis found two reconciliation signals, exact balance drains and ghost transfers, which together reach <strong>98.7% precision / 99.4% recall</strong>.",
          "<strong>Batch and reliability</strong><br>Airflow schedules a daily PySpark ETL job (<strong>31-day backfill, 124/124 data-quality checks</strong>). Streaming sinks write to a staging table and upsert by primary key, so after a mid-stream <code>docker kill</code> the job recovered from its checkpoint with <strong>zero duplicates</strong>.",
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
          "AI systems (agents, RAG, VLM evaluation) and distributed data pipelines",
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
        role: "Software Engineer, Research Assistant",
        organization: "YouDescribe · Northeastern University × Smith-Kettlewell",
        organizationUrl: "https://youdescribe.org/",
        logo: "/assets/logos/companies/com_youdescribe.png",
        period: "Apr 2026 – Present",
        points: [
          "Evaluated whether <strong>VLMs</strong> can replace human reviewers of AI audio descriptions, benchmarking multiple models against human raters, including blind users.",
          "Served open-weight VLMs with <strong>vLLM</strong> on an <strong>NVIDIA H200</strong>, so local and hosted models share one evaluation harness.",
          "Hardened the production AI job pipeline on <strong>AWS</strong> with health checks and a self-recovering job sweeper.",
          "Diagnosed a production outage as a <strong>cache stampede</strong> and fixed it with a <strong>single-flight guard</strong>.",
        ],
      },
      {
        role: "Software Engineer Intern (AI Backend)",
        organization: "Kokun",
        organizationUrl: "https://kokun.space/",
        logo: "/assets/logos/companies/com_kokun.jpeg",
        period: "May 2026 – Aug 2026",
        points: [
          "Shipped a production <strong>RAG agent</strong> for a public-health app with <strong>500+ users</strong>, covering retrieval (<strong>LangChain</strong>), tool orchestration (<strong>LangGraph</strong>), safety routing, and multi-turn memory.",
          "Built an async embedding pipeline on <strong>GCP</strong> (Pub/Sub, Cloud Run, Vertex AI) that loads research papers into <strong>pgvector</strong>.",
          "Designed a layered evaluation suite (execution-trace assertions, reference-fact checks, <strong>RAGAS</strong> LLM judging) that caught and helped fix a silent safety regression introduced by tool calling.",
        ],
      },
      {
        role: "Technical Project Manager",
        organization: "Shanghai Securities",
        logo: "/assets/logos/companies/com_shanghaisecurities.png",
        period: "Apr 2022 – Dec 2024",
        points: [
          "Led the integration of HR, reimbursement, and project-management systems into an Office Automation platform through <strong>REST APIs</strong>, serving <strong>3K+ users</strong>.",
          "Moved a monolith to <strong>microservices</strong> with <strong>Kafka</strong> async workflows and <strong>Kubernetes</strong> CI/CD, making deployments noticeably faster.",
          "Coordinated delivery across engineering and business teams, from deployment and testing to post-launch support.",
        ],
      },
      {
        role: "Tech Consultant (Risk & Data Analytics) ",
        organization: "Deloitte",
        logo: "/assets/logos/companies/demo_deloitte.png",
        period: "Dec 2021 – Apr 2022",
        points: [
          "Built a <strong>Python and SQL ETL pipeline</strong> for <strong>Basel III</strong> regulatory reporting, automating rating mapping and risk-weighted asset calculations.",
          "Turned a <strong>two-day manual</strong> reporting process into an automated pipeline with built-in validation.",
        ],
      },
      {
        role: "Tech Consultant ",
        organization: "Cubewise",
        logo: "/assets/logos/companies/com_cubewise.png",
        period: "Feb 2020 – Dec 2021",
        points: [
          "Delivered <strong>enterprise performance management</strong> solutions on IBM TM1, with Python automation for batch reporting.",
          "Built <strong>ETL</strong> and SQL extraction workflows and improved reporting performance through <strong>OLAP</strong> data-model and query optimization.",
        ],
      },
    ],
    education: [
      {
        school: "Northeastern University",
        degree: "Master of Science in Computer Science",
        period: "Jan 2025 – Dec 2027",
        logo: "/assets/logos/universities/NEU.png",
      },
      {
        school: "University of Sydney",
        degree: "Master of Commerce, Big Data & Finance",
        period: "Jul 2017 – Jun 2019",
        logo: "/assets/logos/universities/USDY.png",
      },
      {
        school: "Macquarie University",
        degree: "Bachelor of Commerce, Professional Accounting",
        period: "Oct 2014 – Sep 2017",
        logo: "/assets/logos/universities/Macquarie.png",
      },
    ],
  },
  contact: {
    blurb: "Always happy to connect.",
    links: [
      {
        label: "Email",
        icon: "email",
        url: "mailto:alanwang166@gmail.com",
        external: false,
      },
      {
        label: "GitHub",
        icon: "github",
        url: "https://github.com/TheAlanWang",
        external: true,
      },
      {
        label: "LinkedIn",
        icon: "linkedin",
        url: "https://www.linkedin.com/in/alanwang166",
        external: true,
      },
    ],
  },
};
