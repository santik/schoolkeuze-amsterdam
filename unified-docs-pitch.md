# Unified Documentation Initiative

> One source of truth — for engineers, AI assistants, and business stakeholders.

---

## The problem

Our system documentation was scattered across multiple repositories, Confluence, and SharePoint. Pages drifted out of sync. GitHub Copilot had no full end-to-end context of our system. Engineers spent a lot of time hunting for context. There was no unified glossary — business teams and developers described the same system in incompatible terms.

---

## What we did

We consolidated all technical documentation — backend, frontend, testing — into a single Markdown repository published on Azure DevOps wiki, with Mermaid diagrams rendered directly in the browser.

Two things make it work:

**Multi-repo workspace.** All repositories are checked out into one directory and opened as a single project. Copilot now has full context across the entire system — suggestions reflect real architecture, not generic patterns.

**AI-readable by design.** Documentation follows a consistent structure with explicit scope definitions, YAML frontmatter metadata, and standardised templates. A `copilot-instructions.md` encodes the team's conventions so every contributor — human or AI — works from the same playbook. AI assistants don't browse documentation the way humans do — they retrieve and reason over it. Structure, consistency, and clear terminology determine whether they get it right. Ours does.

---

## Who benefits

Engineers get better AI assistance and spend less time tracking down context. New team members will onboard faster because the system is documented where the code lives.

We have an MCP server — product owners and business developers can already query the system in plain language and get answers grounded in real documentation, not assumptions.

---

## Roadmap

| Phase | Status | What |
|-------|--------|------|
| 1 — Unified technical docs | Done | Markdown hub, diagrams, multi-repo workspace, AI-readable structure |
| 2 — MCP server | Done | Expose the documentation to any AI assistant via natural language queries |
| 3 — Business + technical | Planned | Combine product requirements with technical docs into one queryable knowledge base |
