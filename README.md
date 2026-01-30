# AI Code Editor (Agent-based)

This project is a minimal agent-based AI code editor inspired by the
“How to Build an Agent – Amp” article.

## What this demonstrates

- Stateless LLM interaction with explicit, externalized conversation memory
- Agent loop: LLM generates tool requests, which are executed, then the results returned to the LLM
- Clear separation between tool schemas (for LLM) and actual execution (in Node.js)
- Safe local filesystem tools (reading, listing, writing files) with strong sandboxing—no access above project root
- Model-agnostic pattern (current code uses Anthropic Claude, but OpenAI/Gemini integration possible)

## What this is NOT

- Not a Cursor clone or production code editor
- No user interface or editor integration (CLI-only for now)
- Focuses strictly on agent flow and core mechanics—no UI polish

## Architecture

- `app.js` – Handles the agent loop, conversation context, user input, and LLM calls
- `tools.js` – Defines tool schemas and their guarded execution logic (read, list, write files)
- The LLM treats every message statelessly—full context is passed each time, so all memory is explicit

## Current tools

- `read_file` — Reads a file’s contents (relative path, sandboxed)
- `list_files` — Lists files and folders at a path (defaults to current directory, sandboxed)
- `write_file` — Creates/overwrites files (must be explicit about overwrite flag, sandboxed and guarded)

## Planned/Next Tools

- `search_code`
- Diff-based editing (`apply_diff`)
- More code-editing and analysis utilities

This project is intentionally minimal and focused on demonstrating agent mechanics and safe tool usage, in line with the referenced article and for learning purposes. The goal is to iteratively expand and improve its capabilities while keeping safety and clarity as top priorities.
