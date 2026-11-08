# TALK AI

A starter full-stack TALK AI web app with an Express backend and browser frontend.

## Files

- `server.js` — backend API and web server
- `au.js` — A.U. improvement-report foundation
- `public/index.html` — app interface
- `public/style.css` — design
- `public/script.js` — frontend behavior
- `package.json` — dependencies and start commands
- `.gitignore` — excludes secrets and generated files

## Run locally

1. Install Node.js 20 or newer.
2. Open this project folder in a terminal.
3. Run `npm install`.
4. Set the `OPENAI_API_KEY` environment variable.
5. Run `npm start`.
6. Open `http://localhost:3000`.

Do not put your API key in frontend files or upload it to GitHub.

## Deploy on Render

Create a **Web Service** connected to this GitHub repository.

- Build command: `npm install`
- Start command: `npm start`
- Environment: `Node`
- Add environment variable `OPENAI_API_KEY` in Render's Environment settings.
- Optional variable: `OPENAI_MODEL` (default: `gpt-4.1-mini`).

The frontend is served by the same Render web service, so one deployment hosts both parts.

## Included

- AI chat using the OpenAI Responses API
- Optional web search in chat
- Browser-side chat history
- Copy and edit message actions
- Image and text-file attachments
- AI image generation endpoint
- A.U. issue/improvement report foundation
- Basic security headers and API rate limiting

## Important limitations

This is a working starter, not the complete final product. Chat history is stored in the user's browser, not synced between devices. Sign-in, cloud-synced history, camera capture, persistent A.U. reports, automatic testing, and safe automated deployment still need to be added. A.U. reports in this starter are kept in server memory and may reset when the service restarts. Review and test code changes before deploying them.

OpenAI API usage may incur charges. Check model and image-generation availability for your API account.
