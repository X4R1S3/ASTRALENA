<div align="center">

<img src="./assets/astralena-earth-orbit.jpg" width="100%" alt="Space shuttle above Earth's atmosphere" />
<img src="./assets/rolling-circle.svg" width="90" alt="ASTRALENA AI rolling circle" />
# ASTRALENA AI

### Space-inspired automation for safer, smarter WhatsApp communities

[![Version](https://img.shields.io/badge/version-3.0.0-00FFF0?style=for-the-badge&labelColor=07111F)](https://github.com/X4R1S3/ASTRALENA)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-7CFFB2?style=for-the-badge&logo=node.js&logoColor=white&labelColor=07111F)](https://nodejs.org/)
[![Baileys fork](https://img.shields.io/badge/Baileys-X4R1S3-25D366?style=for-the-badge&logo=whatsapp&logoColor=white&labelColor=07111F)](https://github.com/X4R1S3/baileys)
[![License](https://img.shields.io/badge/license-MIT-B88CFF?style=for-the-badge&labelColor=07111F)](LICENSE)

**Protect the conversation. Automate the ordinary. Expand what your community can do.**

</div>

---

## Mission control

ASTRALENA AI is a self-hosted WhatsApp automation platform built for communities, creators, developers, and teams that need more control with less operational noise.

It combines group protection, intelligent automation, developer tooling, media utilities, productivity commands, games, economy systems, and AI assistance inside one extensible command platform.

> **Design principle:** keep communities safer, make repetitive work smaller, and put useful intelligence where conversations already happen.

### Project identity

| Area | Detail |
|---|---|
| Project | ASTRALENA AI v3.0.0 |
| Focus | WhatsApp automation, community operations, AI, productivity, and media tooling |
| Runtime | Node.js 22 or newer |
| Process model | PM2-ready with health endpoints |
| Primary repository | [![X4R1S3/ASTRALENA](https://img.shields.io/badge/X4R1S3%2FASTRALENA-Open-00FFF0?style=for-the-badge&labelColor=07111F)](https://github.com/X4R1S3/ASTRALENA) |
| Core messaging layer | [![X4R1S3/baileys](https://img.shields.io/badge/X4R1S3%2Fbaileys-Open-00FFF0?style=for-the-badge&labelColor=07111F)](https://github.com/X4R1S3/baileys) |
| License | MIT |

## System map

ASTRALENA is organized like a small operations platform rather than a single-purpose bot.

| Module | What it does |
|---|---|
| **Community shield** | Moderation, anti-spam, anti-link, anti-raid, anti-scam, permissions, warnings, and group controls. |
| **AI deck** | Chatbot workflows, model integrations, voice, media understanding, and practical assistance. |
| **Command library** | Admin, group, owner, downloader, media, document, search, fun, games, economy, and utility commands. |
| **Developer bay** | Repository tools, code helpers, package utilities, file conversion, web capture, OCR, and automation helpers. |
| **Media lab** | Image effects, stickers, audio, video, documents, thumbnails, and format conversion. |
| **Operations core** | Session handling, process locks, health monitoring, scheduled work, stores, caching, and controlled restarts. |

## Requirements

- Node.js **22 or newer**.
- npm and pnpm.
- A WhatsApp account for the self-hosted bot.
- A private session ID or pairing flow.
- FFmpeg support through the project dependencies.
- A VPS, cloud host, Render service, hosting panel, or Android/Termux environment for long-running use.

## Quick start

```bash
git clone https://github.com/X4R1S3/ASTRALENA.git astralena-ai
cd astralena-ai
pnpm install
```

Create or update `config.json` using your private deployment values. Keep session credentials and API keys outside Git whenever possible.

```bash
# Recommended local start without PM2
npm run start:plain

# Production-style start through the project PM2 command
npm start
```

For a long-running server, use the PM2 commands described in [![Process operations](https://img.shields.io/badge/Process%20operations-Open-00FFF0?style=for-the-badge&labelColor=07111F)](#process-operations).

## Configuration

ASTRALENA reads its main project settings from `config.json` and can also read private environment values. Never commit live credentials, session IDs, provider keys, or personal tokens.

| Variable | Purpose |
|---|---|
| `SESSION_ID` | Preferred private WhatsApp session value for hosted deployments. |
| `GITHUB_TOKEN` | Authorized GitHub repository operations. |
| `GITHUB_USERNAME` | GitHub account lookups used by repository commands. |
| `GROQ_API_KEY` | Groq-powered chatbot, voice, image understanding, and model commands. |
| `OPENROUTER_API_KEY` | OpenRouter-backed model commands. |
| `PORT` | HTTP service port; health endpoints default to port `3000`. |

You may configure selected values through the bot's owner tools, but a protected host environment or secret manager is preferred for production.

## Deployment runbooks

### Render

1. Fork or connect [![X4R1S3/ASTRALENA](https://img.shields.io/badge/X4R1S3%2FASTRALENA-Open-00FFF0?style=for-the-badge&labelColor=07111F)](https://github.com/X4R1S3/ASTRALENA) in Render.
2. Create a **Web Service**.
3. Use `pnpm install` as the build command.
4. Use `npm start` as the start command.
5. Add `SESSION_ID` and other private variables in Render's environment settings.
6. Set the health check path to `/live`.

Render's free tier may sleep after inactivity. Choose a persistent instance for continuous operation.

### VPS with PM2

```bash
sudo apt update && sudo apt install -y nodejs npm git
sudo npm install -g pnpm pm2

git clone https://github.com/X4R1S3/ASTRALENA.git astralena-ai
cd astralena-ai
pnpm install

# Configure privately, then start one process only
export SESSION_ID="<your-session-id>"
npm run pm2:start
npm run pm2:logs
```

Useful process commands:

```bash
npm run pm2:status
npm run pm2:restart
npm run pm2:stop
pm2 save
pm2 startup
```

### Heroku

Heroku requires a suitable paid dyno for persistent operation.

```bash
heroku login
heroku create your-astralena-ai-app
git push heroku main
heroku ps:scale web=1
```

Configure session and provider values through Heroku config vars. Do not place credentials in the repository.

### Hosting panel

1. Create a Node.js application using Node 22 or newer.
2. Upload the project or connect the Git repository.
3. Set the startup command to `node index.js` or the panel's equivalent.
4. Run `pnpm install`.
5. Configure private session and provider values.
6. Start the service and monitor logs.

### Termux

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git
npm install -g pnpm

git clone https://github.com/X4R1S3/ASTRALENA.git astralena-ai
cd astralena-ai
pnpm install
node index.js
```

For longer Android sessions, use `termux-wake-lock`, disable battery optimization for Termux, and run the process inside `tmux` when appropriate.

## Process operations

ASTRALENA exposes health endpoints for host supervisors:

| Endpoint | Meaning |
|---|---|
| `/live` | The process is running. |
| `/ready` | WhatsApp is connected and the service is ready; returns `503` otherwise. |

Run exactly **one** instance against a given session directory. Starting a second copy with another PM2 name, another terminal, or another host process can corrupt the WhatsApp login state.

## Connect WhatsApp

1. Open the [![ASTRALENA session generator](https://img.shields.io/badge/ASTRALENA%20session%20generator-Open-00FFF0?style=for-the-badge&labelColor=07111F)](https://astralena-ai.site/session).
2. Choose pairing or QR connection.
3. Complete the WhatsApp linking flow.
4. Copy the generated session ID.
5. Store it privately as `SESSION_ID` or in the deployment configuration.
6. Start ASTRALENA and confirm `/ready` becomes healthy.

Keep session credentials private. Do not publish them in a repository, issue, screenshot, log, or public chat.

## Development workflow

```bash
# Install dependencies
pnpm install

# Run the main test suite
npm test

# Run a focused benchmark
npm run bench

# Run the bot without PM2
npm run start:plain
```

New commands should follow the existing category layout under `commands/`. Keep secrets out of source control, add focused tests where behavior changes, and run the relevant checks before opening a pull request.


## Safety and responsible use

ASTRALENA is an automation platform, not a guarantee of perfect moderation or security. Review every permission and integration before production use.

- Follow WhatsApp's terms and the terms of every connected provider.
- Use downloader and media features only for content you own or are authorized to access.
- Do not bypass login, payment, CAPTCHA, DRM, or provider access controls.
- Rotate exposed credentials immediately and invalidate leaked sessions.
- Use least-privilege tokens for GitHub and AI integrations.
- Keep backups of configuration and understand the persistence model of your host.

## Community and support

<div align="center">

[![WhatsApp Channel](https://img.shields.io/badge/WhatsApp%20Channel-Follow-25D366?style=for-the-badge&logo=whatsapp)](https://whatsapp.com/channel/0029Vb78BHmL2AU7fsANSH2y)
[![Backup Channel](https://img.shields.io/badge/Backup%20Channel-Follow-25D366?style=for-the-badge&logo=whatsapp)](https://whatsapp.com/channel/0029Vb6sMEy96H4VI2w3I50F)
[![Support Group](https://img.shields.io/badge/Support%20Group-Join-25D366?style=for-the-badge&logo=whatsapp)](https://chat.whatsapp.com/D4h54lfB8neBvOzXMW19Tm?s=cl&p=a&mlu=4&ilr=4)
[![Telegram Channel](https://img.shields.io/badge/Telegram%20Channel-Join-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/ASTRALENA_AIV3)
[![Telegram Group](https://img.shields.io/badge/Telegram%20Group-Join-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/ASTRALENAV3)
[![Website](https://img.shields.io/badge/Website-Visit-00FFF0?style=for-the-badge&logo=vercel&logoColor=black)](https://astralena-ai-site)
[![Pairing Site](https://img.shields.io/badge/Get%20Session%20ID-Pair%20Now-FF7A59?style=for-the-badge&logo=whatsapp)](https://astralena-ai.site/session)

</div>

## Project disclaimer

ASTRALENA AI was built by X4R1S3 and is developed under the ASTRALENA identity. The repository may include community contributions, third-party libraries, and optional integrations maintained independently.

No automated system can guarantee that every malicious or unwanted message will be detected. Configure the bot responsibly, protect session credentials, review permissions, and follow the rules of every platform you connect.

---

<div align="center">

## Thank you for visiting ASTRALENA

Thank you for visiting my repository and reading this README. If ASTRALENA helps, inspires, or gives you an idea to build on, please **star the repository** and **fork it** so you can explore, improve, and create your own mission.

Your star helps the project reach more builders. Your fork is an invitation to experiment.

<img src="./assets/astralena-orbit-astronaut.gif" alt="Astronaut standing on the moon while a shuttle loops around a glowing orbit" width="100%" />

**ASTRALENA AI — intelligent automation for modern communities.**

[![Back to mission control](https://img.shields.io/badge/Back%20to%20mission%20control-Open-00FFF0?style=for-the-badge&labelColor=07111F)](#mission-control) · [![View the repository](https://img.shields.io/badge/View%20the%20repository-Open-00FFF0?style=for-the-badge&labelColor=07111F)](https://github.com/X4R1S3/ASTRALENA)

</div>
