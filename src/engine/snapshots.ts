export interface SnapshotMetadata {
  name: string;
  timestamp: string;
  collectionCount: number;
  rowCount: number;
}

export class SnapshotManager {
  private snapshots: Map<
    string,
    { data: Record<string, Record<string, any>[]>; timestamp: string }
  > = new Map();

  constructor(initialSeed: Record<string, Record<string, any>[]> = {}) {
    // 1. Initial Seed Snapshot
    this.save('initial-seed', initialSeed);

    // 2. Empty State Snapshot
    const emptyState: Record<string, Record<string, any>[]> = {};
    for (const key of Object.keys(initialSeed)) {
      emptyState[key] = [];
    }
    this.save('empty-state', emptyState);
  }

  public save(name: string, data: Record<string, Record<string, any>[]>): void {
    // Deep clone to prevent accidental mutations
    const cloned = JSON.parse(JSON.stringify(data));
    this.snapshots.set(name, {
      data: cloned,
      timestamp: new Date().toISOString()
    });
  }

  public get(name: string): Record<string, Record<string, any>[]> | null {
    const entry = this.snapshots.get(name);
    if (!entry) return null;
    return JSON.parse(JSON.stringify(entry.data));
  }

  public list(): SnapshotMetadata[] {
    const result: SnapshotMetadata[] = [];
    for (const [name, entry] of this.snapshots.entries()) {
      let rowCount = 0;
      const collections = Object.keys(entry.data);
      for (const col of collections) {
        rowCount += entry.data[col]?.length || 0;
      }
      result.push({
        name,
        timestamp: entry.timestamp,
        collectionCount: collections.length,
        rowCount
      });
    }
    return result;
  }

  public delete(name: string): boolean {
    if (name === 'initial-seed' || name === 'empty-state') {
      return false; // protect built-in defaults
    }
    return this.snapshots.delete(name);
  }
}
