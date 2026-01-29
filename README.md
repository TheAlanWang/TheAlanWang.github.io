# Alan Wang — Portfolio

Personal portfolio site. [Live →](https://thealanwang.github.io/)

---

## Stack

- **Vue 3** (CDN) — reactive UI
- **Tailwind CSS** (CDN) — layout & utilities
- **GSAP** (ScrollTrigger, ScrollToPlugin) — animations & scroll
- Vanilla **HTML / CSS / JS** — no build step

---

## Structure

```
├── index.html          # Entry page, sections (Hero, About, Projects, Experience, Skills, Contact)
├── css/
│   └── main.css        # Styles
├── js/
│   └── app.js          # Vue app, profile data, GSAP setup
└── assets/
    ├── favicon/        # Favicon
    ├── photo/          # Profile photo
    ├── demos/          # Project demo GIFs
    └── logos/
        ├── companies/  # Experience company logos
        └── universities/  # University logos (optional)
```

---

## Run locally

```bash
# From project root
python3 -m http.server 8080
# Open http://localhost:8080
```

Or use any static server (e.g. Live Server in VS Code).

---

## Customize

Edit **`js/app.js`** — the `profileData` object holds:

- `name`, `title`, `photo`, `photoPosition`
- `about` (intro, location, education)
- `projects` (title, tech, gif, description, github)
- `experience` (title, company, companyLogo, details)
- `skills` (languages, frameworks, tools)
- `contact.links` (Gmail, GitHub, LinkedIn, etc.)

Update those and refresh; no build required.

---

## License

MIT
