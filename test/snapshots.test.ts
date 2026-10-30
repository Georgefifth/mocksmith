import { describe, it, expect } from 'vitest';
import { SnapshotManager } from '../src/engine/snapshots.js';

describe('SnapshotManager', () => {
  it('should initialize with initial-seed and empty-state', () => {
    const initial = {
      users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
      orders: [{ id: 101, amount: 99.5 }]
    };
    const manager = new SnapshotManager(initial);

    const list = manager.list();
    expect(list.some((s) => s.name === 'initial-seed')).toBe(true);
    expect(list.some((s) => s.name === 'empty-state')).toBe(true);

    const empty = manager.get('empty-state');
    expect(empty!.users.length).toBe(0);
    expect(empty!.orders.length).toBe(0);
  });

  it('should save and retrieve custom named snapshots', () => {
    const manager = new SnapshotManager({ users: [] });

    manager.save('heavy-users', {
      users: [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
        { id: 3, name: 'User 3' }
      ]
    });

    const list = manager.list();
    const heavy = list.find((s) => s.name === 'heavy-users');
    expect(heavy).toBeDefined();
    expect(heavy!.rowCount).toBe(3);

    const data = manager.get('heavy-users');
    expect(data!.users.length).toBe(3);
  });

  it('should prevent deletion of protected defaults', () => {
    const manager = new SnapshotManager({ users: [] });
    expect(manager.delete('initial-seed')).toBe(false);
    expect(manager.delete('empty-state')).toBe(false);
  });
});
