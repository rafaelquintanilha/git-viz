# Git Viz — Interactive Git Visualizer

A tiny, single‑page HTML/CSS/JS app to help beginners understand Git concepts visually — commits, branches, merges, and HEAD — with simple animations. Everything is in English and designed for clarity and cleanliness.

This repository is intentionally simple: no build tools, no framework — open in a browser and play.

## Why
- Learning Git is easier with visuals and playful interactions.
- Great for first‑time coders and vibe coders who learn by exploring.
- One page, immediate feedback, friendly explanations.

## Core Requirements
- Single HTML page with interactivity and animations.
- Visualize: `master`, branches, commits, merges, and HEAD.
- Clean, clear English copy.

## Audience
- Beginners starting with Git and version control.
- Vibe coders who prefer discovery over dense docs.
- Instructors who want a quick visual demo.

## Tech Stack
- Vanilla HTML, CSS, and JavaScript.
- SVG for the commit graph (easy to animate and style).
- No frameworks, no bundlers.

## Project Structure
- `index.html` — single page app shell, toolbar, and graph container.
- `styles.css` — layout, palette, micro‑interactions.
- `app.js` — state + rendering + interactions.

## Visual Model (Concept)
- Nodes = commits.
- Lanes = branches (e.g., `master`, `feature/x`).
- HEAD pointer shows current branch.
- Merge = two lines joining into one node.

## Interactions
- Add commit (on current branch).
- Create branch and checkout branch.
- Merge branch into current branch.
- Reset repository.
- Click commits to view details; selected commit is visually highlighted and centered.
- Right panel shows command history and an Undo Last button.

## Getting Started (No Build)
1. Clone this repo.
2. Open `index.html` directly in your browser, or run a basic static server.
   - Example (Python installed): `python3 -m http.server` then open http://localhost:8000
   - Or use any VS Code "Live Server" extension.

## Implementation Plan

### Phase 1 — MVP
- Static SVG graph with `master`, three commits, and HEAD.
- Top toolbar with large actions: Add Commit, Create Branch, Checkout, Merge, Reset.

### Phase 2 — Interactivity + Clarity
- State model: `commits[]`, `branches{ name -> tip }`, `head{ branch }`.
- Grid layout: x=time, y=branch lane.
- Commit details card on click with strong highlight.
- Emphasize toolbar size and spacing for ease of use.

### Phase 3 — Polish
- Smooth animations for new commits and merges.
- Color system: one color per branch.
- Micro‑interactions: hover glow, subtle motion on HEAD.

## Out of Scope
- Scenarios / prebuilt flows.
- Guided teach mode and stretch features.

## Milestones (Checklist)
- [x] MVP: static graph + toolbar actions
- [x] State model + dynamic SVG layout
- [x] Commit details card + highlight
- [ ] Animations + subtle polish

## Deployment
- GitHub Pages works great (serve repo root).
- Any static hosting (Netlify, Vercel, S3) pointing to `index.html`.
