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
