# AKSI Infinity Agent Console

Static frontend for the existing AKSI backend task API.

## What it does

- Configures a backend URL in browser local storage.
- Checks GET /health.
- Submits a task with explicit internet, page-reading, browser-read and memory permissions.
- Polls task state, renders the execution journal and report, links source pages, and exports the task as JSON.
- Allows stopping a task through the backend API.

## Backend contract

The backend must implement:
- GET /health
- POST /api/agent/tasks
- GET /api/agent/tasks/{task_id}
- POST /api/agent/tasks/{task_id}/stop

Set AKSI_CORS_ORIGINS on the backend to include https://milana808.github.io.

## Safety boundaries

- The UI sets external_actions to false; it does not place trades, submit forms, publish content, or send messages.
- Browser mode is read-only research mode in the current agent runtime.
- Never put provider secrets in this static frontend.
- Public website content is untrusted input; a URL in a report is provenance, not a guarantee that the page is true.
- A working frontend does not imply the backend is deployed, reachable, configured with a model provider, or available 24/7. Confirm those independently.

## Acceptance checks

1. Health check reports reachable backend or shows a useful error.
2. A task cannot start without a backend URL.
3. Task status and journal update from backend responses.
4. Completed reports render findings and the integrity receipt.
5. JSON export works.
6. No API secret is embedded in the static page.
