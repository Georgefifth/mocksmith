import { describe, it, expect, beforeEach } from 'vitest';
import { RelationalStore } from '../src/engine/store.js';

describe('RelationalStore', () => {
  let store: RelationalStore;

  beforeEach(() => {
    store = new RelationalStore();
  });

  it('should seed and list records with pagination', () => {
    store.seed('users', [
      { id: 1, name: 'Alice', role: 'admin' },
      { id: 2, name: 'Bob', role: 'user' },
      { id: 3, name: 'Charlie', role: 'user' }
    ]);

    const res = store.list('users', { page: 1, limit: 2 });
    expect(res.total).toBe(3);
    expect(res.data.length).toBe(2);
    expect(res.totalPages).toBe(2);
    expect(res.data[0].name).toBe('Alice');
  });

  it('should filter by query parameters', () => {
    store.seed('items', [
      { id: 1, status: 'active', category: 'book' },
      { id: 2, status: 'pending', category: 'book' },
      { id: 3, status: 'active', category: 'music' }
    ]);

    const res = store.list('items', { params: { status: 'active', category: 'book' } });
    expect(res.total).toBe(1);
    expect(res.data[0].id).toBe(1);
  });

  it('should perform full-text search', () => {
    store.seed('docs', [
      { id: 1, title: 'Introduction to MockSmith' },
      { id: 2, title: 'Database setup guide' },
      { id: 3, title: 'Chaos engineering overview' }
    ]);

    const res = store.list('docs', { search: 'mocksmith' });
    expect(res.total).toBe(1);
    expect(res.data[0].id).toBe(1);
  });

  it('should create, get, patch, and delete records statefully', () => {
    // 1. Create
    const created = store.create('users', { name: 'Dave', email: 'dave@example.com' });
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Dave');

    // 2. Get
    const fetched = store.get('users', created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.email).toBe('dave@example.com');

    // 3. Patch
    const patched = store.patch('users', created.id, { email: 'dave.new@example.com' });
    expect(patched!.email).toBe('dave.new@example.com');
    expect(patched!.name).toBe('Dave');

    // 4. Delete
    const deleted = store.delete('users', created.id);
    expect(deleted).toBe(true);

    const afterDelete = store.get('users', created.id);
    expect(afterDelete).toBeNull();
  });

  it('should query sub-resources by foreign key relationship', () => {
    store.seed('users', [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' }
    ]);

    store.seed('posts', [
      { id: 'p1', userId: 'u1', title: 'Post 1 by Alice' },
      { id: 'p2', userId: 'u1', title: 'Post 2 by Alice' },
      { id: 'p3', userId: 'u2', title: 'Post 3 by Bob' }
    ]);

    const alicePosts = store.getSubResource('users', 'u1', 'posts');
    expect(alicePosts.length).toBe(2);
    expect(alicePosts.map((p) => p.id)).toEqual(['p1', 'p2']);

    const bobPosts = store.getSubResource('users', 'u2', 'posts');
    expect(bobPosts.length).toBe(1);
    expect(bobPosts[0].id).toBe('p3');
  });
});
