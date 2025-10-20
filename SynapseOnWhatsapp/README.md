# SynapseOnWhatsapp

A lightweight WhatsApp interface for SynapseX using wppconnect. It exposes three core functions via a conversational menu:

1. Paper Explorer – search papers across local DB, arXiv, and Semantic Scholar.
2. Related Research Finder – get related work and a summary graph description.
3. Chat with Paper – chat about a specific paper by ID using the Reasoning agent.

## Prerequisites
- Your server running locally (defaults to http://localhost:5000). Set `SERVER_BASE_URL` if different.
- Node 18+.
- A phone with WhatsApp to scan the QR code.

## Quick start

1. Install dependency and run the bot:

```bash
# Install deps if not already installed
npm install

# Start your API server in one terminal
npm run server

# Start WhatsApp bot in another
npm run whatsapp
```

2. Scan the QR code in the terminal with your WhatsApp app.

3. Send any message to the paired number, you'll receive the main menu.

## Environment variables
- `SERVER_BASE_URL` – Base URL of your running SynapseX server (default: http://localhost:5000)
- `WORKSPACE_ID` – Optional default workspace for operations that need it.

## Notes
- This bot is stateless per contact with a small in-memory session store. For production, switch `SessionStore` to something persistent like Redis.
- Error messages are kept short for WhatsApp constraints.
