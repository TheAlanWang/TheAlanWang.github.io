# Agent Notes

## Publishing A Note Poster

Use this workflow when the user asks to add, publish, or post a learning note, guide, or poster-style note to this Eleventy site.

### 1. Add The Visual Asset

- Put learning-note poster assets under `assets/notes/`.
- Use `assets/projects/` when the image belongs to a project case study or system architecture post.
- Prefer SVG for diagrams when available. PNG/JPG is fine for raster images.
- Use kebab-case filenames, for example `hpc-gpu-pytorch-backprop.svg`.

### 2. Create A Post

Create a Markdown file in `src/posts/` using a kebab-case slug:

```md
---
layout: layouts/post.njk
title: Note Title
description: One sentence description for metadata.
excerpt: One sentence shown on the homepage and posts archive.
date: 2026-04-30
type: Note
topic: HPC
tags:
  - posts
image: /assets/notes/note-file.svg
imageFit: contain
permalink: /posts/note-title/index.html
---

Short intro text explaining what the note covers.

![Note Title](/assets/notes/note-file.svg)

## What It Covers

- point one
- point two
- point three
```

### 3. Front Matter Rules

- `layout` should be `layouts/post.njk`.
- `tags` must include `posts` so the post appears in the archive.
- Use `type: Note` for learning notes, guides, and poster-style summaries.
- Choose `topic` by the main subject area, for example `HPC`, `AI`, `RAG`, `AWS`, or `PyTorch`.
- `date` controls homepage and archive sorting.
- `image` should point to the poster asset with a site-root path like `/assets/notes/example.svg`.
- `imageFit: contain` is usually best for diagrams and posters.
- `permalink` should match the slug: `/posts/<slug>/index.html`.

### 4. Validate Locally

Run:

```bash
npm run build
```

For visual checking, run:

```bash
npm run dev
```

Then open `http://localhost:8080`.

Check:

- the post page renders
- the poster image loads
- the homepage/archive entry appears
- title, excerpt, topic, and date look correct

### 5. Publish

After validation, commit and push the changes. GitHub Pages deployment is handled by `.github/workflows/deploy.yml`, which builds the Eleventy site and publishes `_site/`.
