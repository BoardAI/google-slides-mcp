# Setup Guide

Complete guide to setting up Google Slides MCP Server.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

## Step 2: Enable APIs

1. Go to **APIs & Services → Library**
2. Search for and enable **Google Slides API**
3. Search for and enable **Google Drive API**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. User Type: **External** (for personal use)
3. Fill in:
   - App name: `Google Slides MCP`
   - User support email: your email
   - Developer contact email: your email
4. Click **Save and Continue** through the Scopes step (no scopes needed — they are requested at runtime)
5. Add your Google account email as a **Test user**
6. Click **Save and Continue**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Desktop app**
3. Name: `Google Slides MCP Client`
4. Click **Create**
5. Download the JSON file

## Step 5: Configure Credentials

Copy the downloaded JSON to `config/credentials.json`:

```bash
cp ~/Downloads/client_secret_*.json config/credentials.json
```

The file should look like:

```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost"]
  }
}
```

## Step 6: Build and Register

```bash
npm install
npm run build

# Register with Claude Code
claude mcp add google-slides -- node /absolute/path/to/google-slides/dist/index.js
```

Or for Claude Desktop, add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-slides": {
      "command": "node",
      "args": ["/absolute/path/to/google-slides/dist/index.js"]
    }
  }
}
```

## Step 7: First Run & Authentication

On first use, a browser window opens for the Google OAuth consent screen. Sign in and grant access. Tokens are cached at `~/.config/google-slides-mcp/tokens.json` — subsequent starts are instant.

## Troubleshooting

### "Access blocked: This app's request is invalid"

Your email is not listed as a Test user on the OAuth consent screen:

1. Go to **OAuth consent screen** in Cloud Console
2. Add your email to **Test users**
3. Save and retry

### Token refresh fails

Delete stored tokens and re-authenticate:

```bash
rm ~/.config/google-slides-mcp/tokens.json
```

Then restart Claude Code / Claude Desktop to trigger a new OAuth flow.

### "Permission denied" accessing a presentation

The authenticated account does not have edit access:

1. Open the presentation in Google Slides
2. Click **Share**
3. Add your authenticated account with **Editor** access

### Re-authenticate after adding Drive scopes

If you need to reset authentication entirely:

```bash
rm ~/.config/google-slides-mcp/tokens.json
```

## Security Notes

- Keep `config/credentials.json` private — it is in `.gitignore`
- Tokens stored with 0600 permissions (owner read/write only)
- Never commit credentials or tokens to version control
