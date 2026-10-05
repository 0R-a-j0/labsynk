# LABSYNk

React/Vite frontend and FastAPI backend for lab inventory, schedules, and virtual labs.

## Local setup

Requires Python 3.12 and Node 24 (npm 11).

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
cd frontend
npm ci
```

Copy `backend/.env.example` to `backend/.env`. Set a unique `SECRET_KEY` generated with
`python -c "import secrets; print(secrets.token_urlsafe(48))"`. The backend refuses to
start with a missing, short, or previous hardcoded signing key.

For a new installation, set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`
for the first startup. New passwords must be 12–72 UTF-8 bytes. Remove both settings
after the account exists. Bootstrap never overwrites an existing account.

Start each component in its own terminal:

```bash
cd backend
../.venv/bin/uvicorn main:app --reload --port 8000 --no-proxy-headers
```

```bash
cd frontend
npm run dev
```

The frontend opens at `http://localhost:5173/`; backend readiness is `/health`.
During development, browser requests use `/api` on the frontend origin; Vite
forwards them to port 8000. Start both services, including after sandbox restoration.
Do not set a loopback `VITE_API_URL` for a remotely accessed preview.
For production, set `VITE_API_URL` to the reachable HTTPS backend before building
(the committed production default uses Render), or configure your host to proxy
`/api` to the backend. Vite's development proxy is not part of the static build.
The backend's `FRONTEND_URL` must match the deployed frontend origin for direct API
calls. Upload proxy timeouts must exceed the scanner's 90-second limit.
SQLite is the local default. Production can set `DATABASE_URL` to PostgreSQL;
connections use psycopg2 with required SSL. Set `FRONTEND_URL` to the frontend origin.
`GEMINI_API_KEY` enables Gemini; otherwise the assistant reports offline mode.

## Syllabus PDF scanning

The syllabus scanner runs locally; uploading a PDF does not send its contents to an
AI provider. Sign in as an assistant, HOD, or principal and open **Syllabus AI**.
Choose a PDF, click **Scan syllabus**, then correct or uncheck extracted experiments
before selecting a college, department and semester to save them to Virtual Labs.
Source page numbers and OCR warnings help you review the extraction. For full
semester PDFs, select the applicable subjects and electives in the review checklist.
Theory, term work, equipment lists and repeated assessment tables are excluded from
the laboratory import. Practical course codes are taken from the practical section,
including courses that share a combined theory/lab/sessional syllabus.

Supported input: selectable text, numbered practical lists, experiment headings,
unit/content tables, and English image scans. The scanner keeps subject context
across pages and combines wrapped table rows. Layouts vary, so review is required;
it does not infer experiments from arbitrary prose or guarantee handwriting recognition.

Scanned pages require the **Tesseract CLI and English language data** on the backend
host. On Amazon Linux:

```bash
sudo dnf install -y tesseract tesseract-langpack-eng
tesseract --version
```

PDFium and Pillow are pinned in the Python requirements. OCR is optional for
searchable PDFs; image scans return an actionable error if Tesseract is missing.
Install these OS packages in your production image/build environment as well.
The scanner worker currently requires a Linux/Unix host (`resource` limits and
process-group termination).

Limits: 10 MiB, 200 total pages, 20 OCR pages, and 300 extracted experiments per
file. Each worker has a 90-second wall timeout, 80-second CPU limit, and 1.5 GiB
virtual-memory limit; two workers may run per API process. OCR subprocesses have
20-second page timeouts. Split large documents into smaller PDFs. Temporary OCR
images are removed after each scan, including timed-out workers. **Cancel scan**
cancels the browser request; server work may continue until its worker timeout.
Password-protected, damaged, empty and unrecognized PDFs return actionable validation
errors. The legacy `/ai/parse-syllabus` endpoint shares the same scanner.

Scanner regression tests generate text, table and image-only PDFs locally, including
real Tesseract OCR when installed:

```bash
.venv/bin/python -m pytest backend/tests/test_syllabus_scanner.py -q
```

## Security upgrade / deployment

- **Rotate the JWT signing secret and reset or remove the old default
  `admin@labsynk.com` account before exposing an existing deployment.** The previous
  signing key and default password were public in source. Removing their automatic
  creation does not change accounts already stored in your database. Use an existing
  principal to reset the password, or provision a new principal with a different email
  through the bootstrap settings and then remove/reset the old account.
- Deploy backend and frontend together. Old tokens are invalid after this upgrade;
  users must sign in again. Tokens use stable user IDs and are invalidated by password
  resets. Permissions are read from the database on every authenticated request.
- Public inventory, schedule, and virtual-lab reads remain available. Staff changes
  require assistant or higher; college/department and user management require HOD or
  higher. HODs cannot modify peers or principals or grant equal/higher roles.
- HTTPS is required at the production ingress. Apply shared rate limits, body limits,
  connection/time limits, and provider quotas there. Application limits are per worker,
  use the socket peer, and do not replace distributed abuse protection. If behind a
  proxy, configure trusted proxy addresses explicitly; never trust arbitrary forwarded
  IP headers. Limit guest AI chat separately from staff traffic.
- PDFs are limited to 10 MiB, parsing to 200 pages; requests to 128 KiB except upload
  envelopes (11 MiB). Login, chat, and anonymous reports have per-IP minute limits.
  PDFs are downloaded as attachments. Syllabus scanning uses bounded child processes;
  this is not a malware scanner or a full OS security sandbox. Use deployment-level
  storage quotas and isolation for hostile workloads.
- Browser bearer tokens still use local storage. Keep the site free of injected
  scripts; a future server-session design with HttpOnly cookies would reduce token
  exposure from XSS. Staff authorization is currently global by role; department IDs
  are filters, not tenant isolation boundaries.
- Tailwind was upgraded to v4 to remove the vulnerable `braces` dependency. This
  requires modern browsers supported by Tailwind 4; verify your institution's browser
  fleet before deployment.

## Verification

```bash
.venv/bin/python -m pip install pytest
.venv/bin/python -m pytest backend/tests -q
cd frontend
npm test
npm run build
npm run lint
npm audit
```

Tests use isolated in-memory SQLite, synthetic accounts, and no live provider calls.
Four parser integration tests require the untracked `5th Sem labs.pdf` fixture.
ESLint currently has existing React hook/unused-variable violations; see the task
report for the measured baseline and outstanding checks.

Python dependencies are fully pinned in UTF-8 `backend/requirements.txt`; edit
`requirements.in` then regenerate with Python 3.12 and pip-tools:

```bash
pip-compile --upgrade --strip-extras --no-emit-index-url --no-emit-trusted-host --output-file=backend/requirements.txt backend/requirements.in
pip-audit -r backend/requirements.txt
```

Commit `frontend/package-lock.json` together with dependency changes and install with
`npm ci`. Repeat both audits regularly; a clean audit only covers known advisories.
