import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';

export interface SlideRegistryEntry {
  name: string;
  presentationId: string;
  slideId: string;
  description?: string;
  tags?: string[];
  addedAt: string;
}

interface RegistryData {
  entries: SlideRegistryEntry[];
}

export class SlideRegistry {
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(
      homedir(),
      '.config',
      'google-slides-mcp',
      'slide-registry.json'
    );
  }

  private async load(): Promise<RegistryData> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { entries: [] };
      }
      return { entries: [] };
    }
  }

  private async save(data: RegistryData): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
  }

  async list(query?: string): Promise<SlideRegistryEntry[]> {
    const data = await this.load();
    if (!query) return data.entries;
    const q = query.toLowerCase();
    return data.entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.description?.toLowerCase().includes(q)) ||
        (e.tags?.some((t) => t.toLowerCase().includes(q)))
    );
  }

  async get(name: string): Promise<SlideRegistryEntry | undefined> {
    const data = await this.load();
    return data.entries.find((e) => e.name === name);
  }

  async saveEntry(entry: Omit<SlideRegistryEntry, 'addedAt'>): Promise<SlideRegistryEntry> {
    const data = await this.load();
    // Remove existing entry with same name (upsert)
    data.entries = data.entries.filter((e) => e.name !== entry.name);
    const full: SlideRegistryEntry = {
      ...entry,
      addedAt: new Date().toISOString(),
    };
    data.entries.push(full);
    await this.save(data);
    return full;
  }

  async remove(name: string): Promise<boolean> {
    const data = await this.load();
    const before = data.entries.length;
    data.entries = data.entries.filter((e) => e.name !== name);
    if (data.entries.length === before) return false;
    await this.save(data);
    return true;
  }
}
