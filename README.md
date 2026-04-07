# Alan Wang — Personal Website

Personal website. [Live →](https://thealanwang.github.io/)

---

## Stack

- **Eleventy**
- **Markdown** for posts
- Vanilla **HTML / CSS**

---

## Structure

```text
├── src/
│   ├── _data/
│   │   └── site.js     # Shared site, about, and contact data
│   ├── _includes/
│   │   └── layouts/    # Shared Eleventy layouts
│   ├── posts/          # Markdown posts
│   ├── about.njk       # About Me page source
│   └── index.njk       # Home page source
├── _site/              # Generated site output
├── css/
│   └── main.css        # Shared editorial layout and styles
├── .eleventy.js        # Eleventy configuration
└── assets/
    ├── favicon/        # Favicon
    ├── projects/       # Project architecture sketches used on the site
    ├── photo/          # Existing profile photo assets
    ├── sketches/       # Imported post sketches from Atlas
    ├── demos/          # Existing demo assets
    └── logos/          # Existing logo assets
```

---

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:8080`.

---

## Deploy

GitHub Pages deployment is configured in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).
The workflow builds the site with Eleventy and publishes the generated output from `_site/`.

---

## Customize

Edit [`src/_data/site.js`](./src/_data/site.js) for shared site copy:

- `site`
- `about`
- `contact`

Add or edit posts in [`src/posts`](./src/posts). Each post is a Markdown file with front matter like:

```md
---
title: Example Post
date: 2026-04-06
type: Sketch
topic: AI
excerpt: Short summary shown on the homepage.
image: /assets/sketches/example.svg
imageFit: contain
tags:
  - posts
permalink: /posts/example-post/index.html
---
```

The homepage and `/posts/` archive sort posts by `date` automatically.

Build output is written to `_site/`, keeping source templates and generated files separate.

---

## License

MIT
