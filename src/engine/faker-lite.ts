/**
 * FakerLite: Zero-dependency smart mock data generator
 * Uses semantic field heuristics and types to synthesize realistic mock payloads.
 * Includes deterministic Mulberry32 PRNG for reproducible test seeding.
 */

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Sam', 'Riley', 'Jamie', 'Cameron', 'Dakota'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const DOMAINS = ['example.com', 'acme.org', 'devnull.io', 'hyperloop.net', 'cloudscale.ai'];
const COMPANIES = ['Acme Corp', 'Nexus Labs', 'Quantum Dynamics', 'Starlight Tech', 'Vortex Systems'];
const CITIES = ['San Francisco', 'New York', 'London', 'Tokyo', 'Berlin', 'Toronto', 'Singapore', 'Austin'];
const COUNTRIES = ['United States', 'United Kingdom', 'Germany', 'Japan', 'Canada', 'Australia'];
const STATUSES = ['active', 'pending', 'inactive', 'archived', 'completed'];
const CATEGORIES = ['Electronics', 'Home & Kitchen', 'Books', 'Software', 'Apparel', 'Productivity'];

// Mulberry32 deterministic PRNG state
let currentSeed: number | null = null;
let rngState: number = 0;

export function setRandomSeed(seed: number | null): void {
  currentSeed = seed;
  if (seed !== null) {
    rngState = seed >>> 0;
  }
}

export function getRandomSeed(): number | null {
  return currentSeed;
}

function random(): number {
  if (currentSeed === null) {
    return Math.random();
  }
  // Mulberry32 32-bit PRNG
  let t = (rngState += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function generateUUID(): string {
  // Deterministic or Math.random RFC4122 v4 UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateValueForProperty(propName: string, schema?: Record<string, any>): any {
  const lowerName = propName.toLowerCase();
  const type = schema?.type || inferTypeFromName(lowerName);

  // 1. Explicit Schema Enums
  if (schema?.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return pick(schema.enum);
  }

  // 2. Format checks
  if (schema?.format === 'date-time' || lowerName.includes('at') || lowerName.endsWith('_date') || lowerName === 'date') {
    const pastDays = randomInt(1, 90);
    // Use fixed reference timestamp if seeded, else Date.now()
    const baseTime = currentSeed !== null ? 1700000000000 : Date.now();
    return new Date(baseTime - pastDays * 24 * 3600 * 1000).toISOString();
  }

  if (schema?.format === 'uuid' || lowerName === 'uuid' || lowerName === 'guid') {
    return generateUUID();
  }

  // 3. Name-based heuristics
  if (lowerName === 'id' || lowerName.endsWith('_id') || lowerName.endsWith('id')) {
    if (type === 'integer' || type === 'number') {
      return randomInt(1, 1000);
    }
    return generateUUID();
  }

  if (lowerName.includes('email') || lowerName === 'mail') {
    const first = pick(FIRST_NAMES).toLowerCase();
    const last = pick(LAST_NAMES).toLowerCase();
    return `${first}.${last}${randomInt(1, 99)}@${pick(DOMAINS)}`;
  }

  if (lowerName.includes('avatar') || lowerName.includes('image') || lowerName.includes('photo') || lowerName.includes('thumbnail')) {
    const id = randomInt(1, 70);
    return `https://i.pravatar.cc/150?img=${id}`;
  }

  if (lowerName === 'name' || lowerName === 'fullname' || lowerName === 'full_name') {
    return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  }

  if (lowerName === 'firstname' || lowerName === 'first_name') {
    return pick(FIRST_NAMES);
  }

  if (lowerName === 'lastname' || lowerName === 'last_name') {
    return pick(LAST_NAMES);
  }

  if (lowerName.includes('company') || lowerName.includes('organization')) {
    return pick(COMPANIES);
  }

  if (lowerName.includes('city')) {
    return pick(CITIES);
  }

  if (lowerName.includes('country')) {
    return pick(COUNTRIES);
  }

  if (lowerName.includes('price') || lowerName.includes('cost') || lowerName.includes('amount') || lowerName === 'salary') {
    return Number((random() * 500 + 10).toFixed(2));
  }

  if (lowerName.includes('status') || lowerName === 'state') {
    return pick(STATUSES);
  }

  if (lowerName.includes('category') || lowerName === 'tag') {
    return pick(CATEGORIES);
  }

  if (lowerName.includes('phone') || lowerName.includes('mobile')) {
    return `+1-555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`;
  }

  if (lowerName === 'ip' || lowerName === 'ipv4' || lowerName.includes('ip_address')) {
    return `192.168.${randomInt(1, 254)}.${randomInt(1, 254)}`;
  }

  if (lowerName.includes('currency')) {
    return pick(['USD', 'EUR', 'GBP', 'CAD', 'JPY']);
  }

  if (lowerName.includes('zip') || lowerName.includes('postal')) {
    return String(randomInt(10000, 99999));
  }

  if (lowerName.includes('sku')) {
    return `SKU-${randomInt(1000, 9999)}-${pick(['A', 'B', 'X'])}`;
  }

  if (lowerName.includes('color') || lowerName === 'colour') {
    return pick(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']);
  }

  if (lowerName.includes('title') || lowerName.includes('headline')) {
    return `Sample ${propName.charAt(0).toUpperCase() + propName.slice(1)} Item #${randomInt(10, 99)}`;
  }

  if (lowerName.includes('description') || lowerName.includes('summary') || lowerName.includes('bio') || lowerName.includes('notes')) {
    return `Reliable and automated mock resource generated dynamically by MockSmith for ${propName}.`;
  }

  if (lowerName.includes('url') || lowerName.includes('website') || lowerName.includes('link')) {
    return `https://${pick(DOMAINS)}/${propName}`;
  }

  if (lowerName.startsWith('is_') || lowerName.startsWith('has_') || lowerName.startsWith('can_') || type === 'boolean') {
    return random() > 0.5;
  }

  // 4. Default type-based fallbacks
  if (type === 'integer' || type === 'number') {
    return randomInt(1, 100);
  }

  if (type === 'boolean') {
    return true;
  }

  if (type === 'array') {
    return [];
  }

  return `Mock ${propName}`;
}

function inferTypeFromName(name: string): string {
  if (name.startsWith('is_') || name.startsWith('has_')) return 'boolean';
  if (name.includes('count') || name.includes('total') || name.includes('age') || name.includes('number')) return 'integer';
  if (name.includes('price') || name.includes('rate') || name.includes('score')) return 'number';
  return 'string';
}

/**
 * Generate a full mock entity from an OpenAPI Schema Object
 */
export function generateEntityFromSchema(
  schema: Record<string, any>,
  defaultId?: string | number,
  allSchemas: Record<string, any> = {},
  depth = 0
): Record<string, any> {
  const result: Record<string, any> = {};

  if (!schema || typeof schema !== 'object') {
    return { id: defaultId || generateUUID(), name: 'Sample Item' };
  }

  // Guard against deep circular schema references
  if (depth > 8) {
    return { id: defaultId || generateUUID(), name: schema.title || 'Referenced Entity' };
  }

  // Dereference if root schema has $ref
  let targetSchema = schema;
  if (targetSchema.$ref && typeof targetSchema.$ref === 'string') {
    const refKey = targetSchema.$ref.split('/').pop();
    if (refKey && allSchemas[refKey]) {
      targetSchema = allSchemas[refKey];
    }
  }

  // Handle polymorphic oneOf / anyOf with optional discriminator
  const variants = targetSchema.oneOf || targetSchema.anyOf;
  if (Array.isArray(variants) && variants.length > 0) {
    let chosenVariant = variants[0];
    const discriminator = targetSchema.discriminator;

    if (discriminator && discriminator.propertyName) {
      const prop = discriminator.propertyName;
      if (discriminator.mapping && typeof discriminator.mapping === 'object') {
        const mappingKeys = Object.keys(discriminator.mapping);
        if (mappingKeys.length > 0) {
          const chosenKey = pick(mappingKeys);
          const mappedRef = discriminator.mapping[chosenKey];
          const refName = mappedRef?.split('/').pop();
          if (refName && allSchemas[refName]) {
            const entity = generateEntityFromSchema(allSchemas[refName], defaultId, allSchemas, depth + 1);
            entity[prop] = chosenKey;
            return entity;
          }
        }
      }
    }

    return generateEntityFromSchema(chosenVariant, defaultId, allSchemas, depth + 1);
  }

  const properties = targetSchema.properties || {};
  const propNames = Object.keys(properties);

  if (propNames.length === 0) {
    return {
      id: defaultId || generateUUID(),
      name: targetSchema.title || 'Sample Entity',
      createdAt: new Date().toISOString()
    };
  }

  for (const [key, propSchema] of Object.entries(properties)) {
    const s = propSchema as Record<string, any>;
    if (s.$ref && typeof s.$ref === 'string') {
      const refKey = s.$ref.split('/').pop();
      if (refKey && allSchemas[refKey]) {
        result[key] = generateEntityFromSchema(allSchemas[refKey], undefined, allSchemas, depth + 1);
        continue;
      }
    }

    if (s.type === 'object' && s.properties) {
      result[key] = generateEntityFromSchema(s, undefined, allSchemas, depth + 1);
    } else if (s.type === 'array') {
      const itemsSchema = s.items || {};
      if (itemsSchema.$ref && typeof itemsSchema.$ref === 'string') {
        const refKey = itemsSchema.$ref.split('/').pop();
        if (refKey && allSchemas[refKey]) {
          result[key] = [generateEntityFromSchema(allSchemas[refKey], undefined, allSchemas, depth + 1)];
          continue;
        }
      }
      result[key] = [generateValueForProperty(key, itemsSchema)];
    } else {
      result[key] = generateValueForProperty(key, s);
    }
  }

  if (defaultId !== undefined) {
    result.id = defaultId;
  } else if (!result.id) {
    result.id = generateUUID();
  }

  return result;
}
