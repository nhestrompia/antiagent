# Issue tracker: Local Markdown

Issues and specs live under `.scratch/`.

## Conventions

- Use one directory per feature: `.scratch/<feature-slug>/`.
- Store its spec at `.scratch/<feature-slug>/spec.md`.
- Store implementation tickets separately at
  `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from 01.
- Record triage state in a `Status:` line near the top.
  Use the labels in `triage-labels.md`.
- Append comments under a `## Comments` heading.

## Publishing and fetching

When a skill says to publish, create the appropriate Markdown file.
When it says to fetch a ticket, read the referenced file.
