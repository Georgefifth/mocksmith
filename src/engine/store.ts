import fs from 'node:fs';
import path from 'node:path';
import { generateUUID } from './faker-lite.js';
import type { QueryFilter, PaginatedResult, StoreOptions } from '../types.js';

function compareFilterValue(
  itemVal: any,
  targetVal: any,
  operator: 'gte' | 'lte' | 'gt' | 'lt' | 'ne' | 'like' | 'eq'
): boolean {
  if (itemVal === undefined || itemVal === null) return operator === 'ne';

  if (operator === 'like') {
    return String(itemVal).toLowerCase().includes(String(targetVal).toLowerCase());
  }

  if (operator === 'ne') {
    return String(itemVal).toLowerCase() !== String(targetVal).toLowerCase();
  }

  if (operator === 'eq') {
    return String(itemVal).toLowerCase() === String(targetVal).toLowerCase();
  }

  // Numeric comparison if both parse cleanly
  const numA = Number(itemVal);
  const numB = Number(targetVal);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && typeof itemVal !== 'boolean') {
    if (operator === 'gte') return numA >= numB;
    if (operator === 'lte') return numA <= numB;
    if (operator === 'gt') return numA > numB;
    if (operator === 'lt') return numA < numB;
  }

  // Fallback to ISO date or string ordering
  const strA = String(itemVal);
  const strB = String(targetVal);
  if (operator === 'gte') return strA >= strB;
  if (operator === 'lte') return strA <= strB;
  if (operator === 'gt') return strA > strB;
  if (operator === 'lt') return strA < strB;

  return true;
}

export class RelationalStore {
  private tables: Map<string, Map<string | number, Record<string, any>>> = new Map();
  private options: StoreOptions;

  constructor(options: StoreOptions = {}) {
    this.options = options;
    if (this.options.persistPath && fs.existsSync(this.options.persistPath)) {
      this.loadFromFile(this.options.persistPath);
    }
  }

  /**
   * Ensure a collection/table exists
   */
  public ensureTable(tableName: string): void {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new Map());
    }
  }

  /**
   * Get list of all table names
   */
  public getTableNames(): string[] {
    return Array.from(this.tables.keys());
  }

  /**
   * Seed a collection with initial mock records
   */
  public seed(tableName: string, records: Record<string, any>[]): void {
    this.ensureTable(tableName);
    const table = this.tables.get(tableName)!;
    for (const record of records) {
      const id = record.id ?? generateUUID();
      table.set(String(id), { ...record, id });
    }
    this.maybeSave();
  }

  /**
   * Query records with pagination, sorting, search, and field filtering
   */
  public list(tableName: string, filter: QueryFilter = {}): PaginatedResult {
    this.ensureTable(tableName);
    const table = this.tables.get(tableName)!;
    let items = Array.from(table.values());

    // 1. Param and Relational Operator Filtering (_gte, _lte, _gt, _lt, _ne, _like, exact)
    if (filter.params) {
      for (const [rawKey, value] of Object.entries(filter.params)) {
        if (value === undefined || value === null || value === '') continue;

        let field = rawKey;
        let op: 'gte' | 'lte' | 'gt' | 'lt' | 'ne' | 'like' | 'eq' = 'eq';

        if (rawKey.endsWith('_gte')) {
          field = rawKey.slice(0, -4);
          op = 'gte';
        } else if (rawKey.endsWith('_lte')) {
          field = rawKey.slice(0, -4);
          op = 'lte';
        } else if (rawKey.endsWith('_gt')) {
          field = rawKey.slice(0, -3);
          op = 'gt';
        } else if (rawKey.endsWith('_lt')) {
          field = rawKey.slice(0, -3);
          op = 'lt';
        } else if (rawKey.endsWith('_ne')) {
          field = rawKey.slice(0, -3);
          op = 'ne';
        } else if (rawKey.endsWith('_like')) {
          field = rawKey.slice(0, -5);
          op = 'like';
        }

        items = items.filter((item) => compareFilterValue(item[field], value, op));
      }
    }

    // 2. Full-Text Search across string fields
    if (filter.search && filter.search.trim().length > 0) {
      const searchLower = filter.search.toLowerCase();
      items = items.filter((item) => {
        return Object.values(item).some((v) => {
          if (v === null || v === undefined) return false;
          if (typeof v === 'string') return v.toLowerCase().includes(searchLower);
          if (typeof v === 'number' || typeof v === 'boolean') return String(v).includes(searchLower);
          return false;
        });
      });
    }

    // 3. Sorting
    if (filter.sort) {
      const sortField = filter.sort;
      const order = filter.order === 'desc' ? -1 : 1;
      items.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * order;
        }
        return String(valA).localeCompare(String(valB)) * order;
      });
    }

    const total = items.length;
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Number(filter.limit) || (filter.page ? 10 : Math.max(total, 50)));
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      data: paginatedItems,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Get single item by ID
   */
  public get(tableName: string, id: string | number): Record<string, any> | null {
    this.ensureTable(tableName);
    const table = this.tables.get(tableName)!;
    return table.get(String(id)) ?? null;
  }

  /**
   * Insert new record
   */
  public create(tableName: string, payload: Record<string, any>): Record<string, any> {
    this.ensureTable(tableName);
    const table = this.tables.get(tableName)!;

    // Generate ID if missing
    let id = payload.id;
    if (id === undefined || id === null || id === '') {
      // If table already has numeric IDs, increment max ID
      const existingIds = Array.from(table.keys());
      const numericIds = existingIds.map((k) => Number(k)).filter((n) => !Number.isNaN(n));
      if (numericIds.length > 0) {
        id = Math.max(...numericIds) + 1;
      } else {
        id = generateUUID();
      }
    }

    const now = new Date().toISOString();
    const newRecord = {
      ...payload,
      id,
      createdAt: payload.createdAt || now,
      updatedAt: now
    };

    table.set(String(id), newRecord);
    this.maybeSave();
    return newRecord;
  }

  /**
   * Full update (PUT)
   */
  public update(tableName: string, id: string | number, payload: Record<string, any>): Record<string, any> | null {
    this.ensureTable(tableName);
    const table = this.tables.get(tableName)!;
    const strId = String(id);
    if (!table.has(strId)) return null;

    const existing = table.get(strId)!;
    const updated = {
      ...payload,
      id: existing.id,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    table.set(strId, updated);
    this.maybeSave();
    return updated;
  }

  /**
   * Partial update (PATCH)
   */
  public patch(tableName: string, id: string | number, partial: Record<string, any>): Record<string, any> | null {
    this.ensureTable(tableName);
    const table = this.tables.get(tableName)!;
    const strId = String(id);
    if (!table.has(strId)) return null;

    const existing = table.get(strId)!;
    const updated = {
      ...existing,
      ...partial,
      id: existing.id, // preserve ID
      updatedAt: new Date().toISOString()
    };

    table.set(strId, updated);
    this.maybeSave();
    return updated;
  }

  /**
   * Delete item
   */
  public delete(tableName: string, id: string | number): boolean {
    this.ensureTable(tableName);
    const table = this.tables.get(tableName)!;
    const result = table.delete(String(id));
    if (result) this.maybeSave();
    return result;
  }

  /**
   * Query sub-resources (e.g. /users/:userId/posts)
   */
  public getSubResource(
    parentTable: string,
    parentId: string | number,
    childTable: string,
    foreignKeyName?: string
  ): Record<string, any>[] {
    // 1. Verify parent exists
    const parent = this.get(parentTable, parentId);
    if (!parent) return [];

    // 2. Infer foreign key if not provided (e.g. userId or user_id or parentId)
    this.ensureTable(childTable);
    const childRecords = Array.from(this.tables.get(childTable)!.values());

    const fkCandidates = foreignKeyName
      ? [foreignKeyName]
      : [
          `${parentTable.replace(/s$/, '')}Id`,
          `${parentTable.replace(/s$/, '')}_id`,
          `${parentTable}Id`,
          `${parentTable}_id`,
          'parentId',
          'parent_id'
        ];

    return childRecords.filter((child) => {
      for (const candidate of fkCandidates) {
        if (child[candidate] !== undefined && String(child[candidate]) === String(parentId)) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Reset all or specific tables
   */
  public clear(): void {
    this.tables.clear();
    this.maybeSave();
  }

  /**
   * Export all tables as snapshot object
   */
  public exportSnapshot(): Record<string, Record<string, any>[]> {
    const snapshot: Record<string, Record<string, any>[]> = {};
    for (const [tableName, map] of this.tables.entries()) {
      snapshot[tableName] = Array.from(map.values());
    }
    return snapshot;
  }

  /**
   * Import data snapshot
   */
  public importSnapshot(snapshot: Record<string, Record<string, any>[]>): void {
    this.tables.clear();
    for (const [tableName, records] of Object.entries(snapshot)) {
      this.seed(tableName, records);
    }
    this.maybeSave();
  }

  public saveToFile(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(this.exportSnapshot(), null, 2), 'utf-8');
  }

  public loadFromFile(filePath: string): void {
    if (!fs.existsSync(filePath)) return;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      this.importSnapshot(data);
    } catch (err) {
      console.error(`[MockSmith] Failed to load persisted state from ${filePath}:`, err);
    }
  }

  private maybeSave(): void {
    if (this.options.autoSave && this.options.persistPath) {
      this.saveToFile(this.options.persistPath);
    }
  }
}
