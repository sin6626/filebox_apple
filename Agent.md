# FileBox Agent Notes

## Project Overview
- Stack: React 19 + TypeScript + Vite + Tauri 2
- Main UI surfaces:
  - Floating launcher: `src/components/AssistiveTouch.tsx`
  - File dashboard: `src/components/Dashboard.tsx`
  - Sticky note window: `src/components/Note.tsx`
- Native commands live in `src-tauri/src/lib.rs`

## Current Refactor Focus
- Reduce the maintenance burden of oversized frontend files without changing product behavior.
- First priority: split floating launcher state/behavior from rendering.
- Second priority: extract shared file import and dashboard filtering logic.
- Keep existing Tauri command names and local storage formats stable.

## Guardrails
- Do not batch-delete files or directories.
- Use git proactively for traceable changes.
- Keep temporary artifacts inside this project if needed.
- Prefer focused modules and helpers over continuing to grow component files.

## Hotspots
- `src/components/AssistiveTouch.tsx`: launcher state, drag/drop, app grid, file import, window control, toast UI.
- `src/components/Dashboard.tsx`: file library state, event handling, filtering, repeated import flow.

## Next Likely Follow-Ups
- Group Rust commands by storage / shell / icon extraction when native complexity grows.
- Add broader automated coverage once frontend test infrastructure becomes richer.
