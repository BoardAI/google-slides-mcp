import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope?: string;
  token_type?: string;
}

export class TokenStore {
  private readonly tokenPath: string;

  constructor(tokenPath?: string) {
    this.tokenPath = tokenPath || path.join(
      homedir(),
      '.config',
      'google-slides-mcp',
      'tokens.json'
    );
  }

  async save(tokens: Tokens): Promise<void> {
    const dir = path.dirname(this.tokenPath);
    await fs.mkdir(dir, { recursive: true });

    // Write with restrictive permissions (owner read/write only)
    await fs.writeFile(
      this.tokenPath,
      JSON.stringify(tokens, null, 2),
      { mode: 0o600 }
    );
  }

  async load(): Promise<Tokens | null> {
    try {
      const content = await fs.readFile(this.tokenPath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      // Corrupted file or other error
      return null;
    }
  }

  async delete(): Promise<void> {
    try {
      await fs.unlink(this.tokenPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, that's fine
        return;
      }
      throw error;
    }
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.tokenPath);
      return true;
    } catch {
      return false;
    }
  }
}
