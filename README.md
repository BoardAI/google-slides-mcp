# Google Slides MCP Server

A Model Context Protocol server for managing Google Slides presentations.

## Features

- OAuth 2.0 authentication
- Full CRUD operations on presentations
- Slide management (create, delete, reorder)
- Element manipulation (text, images, shapes, tables)

## Setup

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Configure OAuth credentials in `config/credentials.json`
4. Run: `node dist/index.js`

## Development

- Build: `npm run build`
- Test: `npm test`
- Watch: `npm run dev`
