# Pre-deployment Audit Report

Audit date: 29 June 2026

## Release Status

Conditionally ready. Source cleanup, tests, builds, dependency audits, API flows, and live database integrity checks pass. Before publishing, initialize or repair Git at the intended repository root and complete one manual browser/device pass because the in-app browser still could not attach to a page after the documented reconnect path.

## Critical Issues

- **Fixed - admin password disclosure:** Startup printed `ADMIN_PASSWORD` in clear text. All credential logging was removed.
- **Fixed - vulnerable upload dependency:** Multer was upgraded to `2.2.0`; the backend production dependency audit reports zero high-severity vulnerabilities.
- **Open - invalid Git metadata:** The outer workspace contains invalid Git metadata and `HostelManagement` is not recognized as a repository. Decide the intended repository root, repair or initialize Git there, then verify ignored files before the first commit.

## High-priority Issues

- **Fixed - unsafe upload trust:** JPEG, PNG, and WebP signatures are checked, uploads remain capped at 5 MB, failed temporary files are deleted, and Cloudinary uploads are restricted to image resources.
- **Fixed - brute-force exposure:** Student registration/login and admin/worker login have IP-based rate limits.
- **Fixed - secret quality:** Production startup rejects placeholder or short JWT secrets and weak default admin credentials.
- **Mitigated - unreliable automated priority:** Evaluation shows priority macro F1 around 0.40. The UI no longer exposes noisy confidence percentages, and administrators can explicitly review or override priority. Treat this model only as triage assistance.
- **Fixed - arbitrary workflow changes:** Complaint status now follows `pending -> assigned -> in progress -> resolved`; backward and impossible transitions return `409`.

## Medium-priority Issues

- **Fixed - persistent browser tokens:** Access tokens moved from `localStorage` to tab-scoped `sessionStorage`; refresh-token JSON handling was removed.
- **Fixed - missing browser protections:** CSP, frame denial, MIME sniffing protection, referrer policy, and disabled Express fingerprinting were added.
- **Fixed - unbounded notifications:** Notification retrieval is capped at 100 and query values are validated.
- **Fixed - weak schema limits:** User, complaint, and notification text fields have bounded lengths.
- **Fixed - Atlas URI compatibility:** Mongoose uses `dbName` instead of concatenating a database name onto the URI.
- **Open - hosted image privacy:** Production Cloudinary assets are ordinary hosted image URLs. If complaints can contain sensitive room imagery, configure authenticated/private delivery and retention rules.
- **Open - multi-instance rate limiting:** The current limiter is process-local. Replace it with Redis or an API-gateway limiter when running multiple backend instances.

## Low-priority Issues

- **Fixed:** Removed unused frontend assets, duplicate role navbar wrappers, stale QA logs, old scaffold files, and unused direct packages.
- **Fixed:** Changed the generic Vite page title and added description/theme metadata.
- **Fixed:** Added a catch-all route, lazy image loading, safe external image links, accessible dialog labels, minimum touch sizes, and inline form errors.
- **Open:** Add pagination if notification or complaint volume grows beyond the current small-hostel scale.

## UI/UX Improvements

- Replaced three inconsistent role navbars with one neutral HostelCare navigation system.
- Replaced three inconsistent login screens with one shared auth layout and field system.
- Reduced dashboards to task-focused summary values and cleaner complaint cards.
- Removed internal ML confidence bars, duplicate profile information, decorative risk cards, clocks, and repeated labels.
- Added admin search/status filters, a modal worker form, clear empty/loading/error states, and inline retry actions.
- Simplified student complaint cards to status, assignment, category, ETA, and evidence.
- Simplified worker cards to location, essential task data, and the next valid action.
- Made notification dropdown width safe on mobile.

## Performance Improvements

- Reduced generated frontend CSS/JS from about 403 KB to about 382 KB uncompressed during the previous build comparison.
- Removed unused dashboard primitives and public assets.
- Notification polling fetches only unread count; full content loads on demand.
- Complaint and notification query indexes are present for primary access patterns.
- Dashboard data requests run concurrently.

## Security Improvements

- Added rate limiting, security headers, strict production cookies, input bounds, image signature checking, safe error mapping, production secret checks, and upload cleanup.
- Role and record ownership checks cover protected mutation/read endpoints.
- `.env`, uploads, logs, build output, editor workspace files, and dependencies are ignored.
- Added `SECURITY.md` and a GitHub Actions dependency audit.

## Cleanup Results

- Flattened the frontend from the old Vite scaffold into `frontend/`.
- Removed duplicate navigation wrappers and a duplicate notification endpoint.
- Removed unused refresh-token code that had no route or consumer.
- Removed stale local runtime artifacts from the repository surface.
- Consolidated ignore rules at the app root.
- Deferred upload temp-folder creation until an upload request is handled, so importing or building the backend no longer creates empty runtime folders.
- Rewrote the public README with complete setup, environment, structure, API, and release guidance.

## Database Verification

Live audit from the final verification pass: 4 users, 2 complaints, 11 notifications; zero orphan complaint students, assigned workers, notification users, or notification complaints. Local upload storage is empty. Mongoose schemas define unique email and query indexes for complaint status/student/worker/category and notification user/read/date access.

## Verification Results

- Backend tests: 8/8 passed.
- Backend build/import: passed.
- Frontend ESLint: passed.
- Frontend production build: passed.
- Backend production dependency audit: 0 vulnerabilities.
- Frontend production dependency audit: 0 vulnerabilities.
- Backend dependency tree: clean.
- Frontend install: refreshed with `npm ci`; `npm prune` reports nothing removable. npm still labels several optional WASM packages from the Vite/Tailwind/Rolldown toolchain as extraneous, but they are present in `package-lock.json` and the lint/build/audit checks pass.
- Database audit: passed with zero orphan records.
- ML evaluation: completed; category F1 about 0.824, priority macro F1 about 0.404, duplicate detection precision 1.0 and recall about 0.615.
- Interactive browser viewport QA: not completed because the in-app browser timed out while attaching to a page after reconnect troubleshooting.

## Required Final Manual Gates

1. Repair or initialize Git at the intended project root and run `git status --ignored` to confirm `.env`, logs, uploads, dependencies, and build output are excluded.
2. Test the built UI at approximately `1440x900`, `768x1024`, and `390x844`, including login, modal forms, notification dropdown, and long complaint text.
3. Configure production HTTPS, CORS, MongoDB least-privilege credentials, Cloudinary privacy/retention, and centralized rate limiting if deploying more than one API instance.
