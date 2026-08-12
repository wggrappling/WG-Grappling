import { Injectable } from '@nestjs/common';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, resolve, sep } from 'node:path';
import { StorageService } from './storage.service';

@Injectable()
export class LocalStorageAdapter extends StorageService {
  private readonly root = resolve(process.env.DOCUMENT_STORAGE_PATH ?? './storage/documents');

  private pathFor(key: string) {
    if (!key || isAbsolute(key) || key.includes('..') || key.includes('/') || key.includes('\\')) throw new Error('Invalid storage key.');
    const target = resolve(this.root, key);
    if (!target.startsWith(`${this.root}${sep}`)) throw new Error('Invalid storage key.');
    return target;
  }

  async save(key: string, data: Buffer) { await mkdir(this.root, { recursive: true }); await writeFile(this.pathFor(key), data, { flag: 'wx' }); }
  async get(key: string) { return readFile(this.pathFor(key)); }
  async delete(key: string) { await rm(this.pathFor(key), { force: true }); }
  async exists(key: string) { try { await access(this.pathFor(key)); return true; } catch { return false; } }
}
