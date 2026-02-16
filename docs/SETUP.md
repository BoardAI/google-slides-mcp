# Setup Guide

Complete guide to setting up Google Slides MCP Server.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your project ID

## Step 2: Enable Google Slides API

1. In Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Slides API"
3. Click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External (for personal use) or Internal (for organization)
   - App name: "Google Slides MCP"
   - User support email: your email
   - Scopes: Add `https://www.googleapis.com/auth/presentations`
   - Test users: Add your email
4. Application type: "Desktop app"
5. Name: "Google Slides MCP Client"
6. Click "Create"
7. Download JSON credentials

## Step 4: Configure Credentials

1. Copy downloaded JSON to `config/credentials.json`:

```bash
cp ~/Downloads/client_secret_*.json config/credentials.json
```

2. Verify format matches:

```json
{
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uris": ["http://localhost:3000/callback"]
}
```

## Step 5: First Run & Authentication

1. Build and run:

```bash
npm run build
node dist/index.js
```

2. Browser opens automatically to Google OAuth consent screen
3. Sign in and grant permissions
4. Browser shows "Authentication Successful"
5. Tokens saved to `~/.config/google-slides-mcp/tokens.json`

## Troubleshooting

### Browser doesn't open automatically

If automatic browser open fails, manually visit the displayed URL.

### "redirect_uri_mismatch" error

Ensure OAuth credentials include `http://localhost:3000/callback` as an authorized redirect URI:

1. Go to Cloud Console > Credentials
2. Edit your OAuth client ID
3. Add `http://localhost:3000/callback` to "Authorized redirect URIs"
4. Save and retry

### "Access blocked: This app's request is invalid"

OAuth consent screen not properly configured:

1. Go to "OAuth consent screen" in Cloud Console
2. Add required scopes: `https://www.googleapis.com/auth/presentations`
3. Add your email to "Test users" if using External user type
4. Save and retry

### Token refresh fails

Delete stored tokens and re-authenticate:

```bash
rm ~/.config/google-slides-mcp/tokens.json
node dist/index.js
```

### Permission denied accessing presentation

Check presentation sharing settings in Google Slides:
- Open presentation in browser
- Click "Share"
- Ensure your authenticated account has edit access

## Security Notes

- Keep `config/credentials.json` private (in `.gitignore`)
- Tokens stored with 0600 permissions (owner read/write only)
- Never commit credentials or tokens to version control
- Use separate credentials for development vs production
