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

## Known Limitations (MVP)

This MVP implementation uses only the Google Slides API. Several features require the Google Drive API and are not yet implemented:

### Not Available

- **List presentations**: Cannot enumerate user's presentations. You must provide presentation IDs directly.
- **Delete presentations**: Cannot delete presentations programmatically. Use the Google Slides UI to delete.
- **Copy presentations**: Cannot duplicate presentations. Create new presentations and manually copy content as a workaround.
- **Search presentations**: No search functionality available.
- **Manage permissions**: Cannot modify sharing settings programmatically.

### Workarounds

- Get presentation IDs from the URL in Google Slides (e.g., `https://docs.google.com/presentation/d/PRESENTATION_ID/edit`)
- Use the Google Slides web interface for file management operations
- For copying, create a new presentation with `createPresentation()` and use batch updates to replicate content

### Future Enhancements

To support these features, the server would need to:
1. Add Google Drive API to OAuth scopes
2. Integrate the `@googleapis/drive` client library
3. Implement Drive API operations alongside Slides API operations

These limitations keep the MVP focused on core presentation editing capabilities while maintaining a clear path for future expansion.
