import { OAuth2Client } from 'google-auth-library';
import { TokenStore, Tokens } from './token-store.js';
import * as http from 'http';
import { URL } from 'url';
import open from 'open';

export interface OAuthCredentials {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

// For Desktop app OAuth, Google allows any localhost port even if only
// "http://localhost" is registered. We use port 3000 with /callback path.
const REDIRECT_URI = 'http://localhost:3000/callback';

export class OAuthManager {
  private oauth2Client: OAuth2Client;
  private tokenStore: TokenStore;

  constructor(credentials: OAuthCredentials, tokenStore?: TokenStore) {
    this.oauth2Client = new OAuth2Client(
      credentials.client_id,
      credentials.client_secret,
      REDIRECT_URI
    );
    this.tokenStore = tokenStore || new TokenStore();
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.tokenStore.load();
    if (!tokens) {
      return false;
    }

    // Check if we have a refresh token or valid access token
    if (!tokens.refresh_token && (!tokens.expiry_date || tokens.expiry_date < Date.now())) {
      return false;
    }

    return true;
  }

  async getAccessToken(): Promise<string> {
    const tokens = await this.tokenStore.load();
    if (!tokens) {
      throw new Error('Not authenticated. Please run authentication flow first.');
    }

    // Check if access token is expired
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      if (!tokens.refresh_token) {
        throw new Error('Access token expired and no refresh token available.');
      }

      // Refresh the access token
      this.oauth2Client.setCredentials(tokens);
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Validate that we received essential token data
      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token: no access token received');
      }

      const newTokens: Tokens = {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || tokens.refresh_token,
        expiry_date: credentials.expiry_date || Date.now() + 3600000, // Default 1 hour if not provided
      };

      await this.tokenStore.save(newTokens);
      return newTokens.access_token;
    }

    return tokens.access_token;
  }

  async authenticate(autoOpenBrowser = true): Promise<void> {
    const authUrl = this.getAuthUrl();

    console.log('\n🔐 Google Slides Authentication Required\n');
    console.log('Opening browser for authentication...');
    console.log('If browser does not open, visit this URL:\n');
    console.log(authUrl);
    console.log('');

    if (autoOpenBrowser) {
      try {
        await open(authUrl);
      } catch (error) {
        console.log('Could not auto-open browser. Please visit the URL above manually.');
      }
    }

    const code = await this.startCallbackServer();
    await this.exchangeCodeForTokens(code);
  }

  private async startCallbackServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      let serverClosed = false;

      const closeServer = () => {
        if (!serverClosed) {
          serverClosed = true;
          server.close();
        }
      };

      const server = http.createServer(async (req, res) => {
        try {
          if (req.url?.startsWith('/callback')) {
            const url = new URL(req.url, 'http://localhost:3000');
            const code = url.searchParams.get('code');

            if (code) {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Slides MCP — Authenticated</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8f9fa;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #202124;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 48px 56px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08);
      max-width: 400px;
      width: 100%;
    }
    .icon {
      width: 56px;
      height: 56px;
      background: #e6f4ea;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 24px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #202124;
    }
    p {
      font-size: 14px;
      color: #5f6368;
      line-height: 1.5;
    }
    .close-hint {
      margin-top: 32px;
      font-size: 12px;
      color: #9aa0a6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>You're connected</h1>
    <p>Google Slides MCP has been authorized.<br>You can close this window.</p>
    <p class="close-hint">This window will close automatically.</p>
  </div>
  <script>setTimeout(() => window.close(), 1500);</script>
</body>
</html>`);
              closeServer();
              resolve(code);
            } else {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end('<h1>❌ Authentication Failed</h1><p>No authorization code received.</p>');
              closeServer();
              reject(new Error('No authorization code received'));
            }
          }
        } catch (error) {
          // Ensure server is closed on any error during request handling
          closeServer();
          reject(error);
        }
      });

      // Handle server listen errors (e.g., port already in use)
      server.on('error', (error: NodeJS.ErrnoException) => {
        closeServer();
        if (error.code === 'EADDRINUSE') {
          reject(new Error('Port 3000 is already in use. Please free the port and try again.'));
        } else {
          reject(new Error(`Server error: ${error.message}`));
        }
      });

      server.listen(3000, () => {
        console.log('Waiting for authentication callback on http://localhost:3000/callback');
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        closeServer();
        reject(new Error('Authentication timeout after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  }

  private async exchangeCodeForTokens(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);

    // Validate that we received essential token data
    if (!tokens.access_token) {
      throw new Error('Failed to exchange code for tokens: no access token received');
    }
    if (!tokens.refresh_token) {
      throw new Error('Failed to exchange code for tokens: no refresh token received');
    }

    const tokenData: Tokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date || Date.now() + 3600000, // Default 1 hour if not provided
    };

    await this.tokenStore.save(tokenData);
    console.log('\n✅ Authentication successful! Tokens saved.\n');
  }

  async clearTokens(): Promise<void> {
    await this.tokenStore.delete();
  }

  getOAuth2Client(): OAuth2Client {
    return this.oauth2Client;
  }
}
