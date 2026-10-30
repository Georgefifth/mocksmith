/**
 * FakerLite: Zero-dependency smart mock data generator
 * Uses semantic field heuristics and types to synthesize realistic mock payloads.
 */

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Sam', 'Riley', 'Jamie', 'Cameron', 'Dakota'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const DOMAINS = ['example.com', 'acme.org', 'devnull.io', 'hyperloop.net', 'cloudscale.ai'];
const COMPANIES = ['Acme Corp', 'Nexus Labs', 'Quantum Dynamics', 'Starlight Tech', 'Vortex Systems'];
const CITIES = ['San Francisco', 'New York', 'London', 'Tokyo', 'Berlin', 'Toronto', 'Singapore', 'Austin'];
const COUNTRIES = ['United States', 'United Kingdom', 'Germany', 'Japan', 'Canada', 'Australia'];
const STATUSES = ['active', 'pending', 'inactive', 'archived', 'completed'];
const CATEGORIES = ['Electronics', 'Home & Kitchen', 'Books', 'Software', 'Apparel', 'Productivity'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateUUID(): string {
  // Simple RFC4122 v4 UUID generator without native deps
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
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
    return new Date(Date.now() - pastDays * 24 * 3600 * 1000).toISOString();
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
    return Number((Math.random() * 500 + 10).toFixed(2));
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
    return Math.random() > 0.5;
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
export function generateEntityFromSchema(schema: Record<string, any>, defaultId?: string | number): Record<string, any> {
  const result: Record<string, any> = {};

  if (!schema || typeof schema !== 'object') {
    return { id: defaultId || generateUUID(), name: 'Sample Item' };
  }

  const properties = schema.properties || {};
  const propNames = Object.keys(properties);

  if (propNames.length === 0) {
    return {
      id: defaultId || generateUUID(),
      name: schema.title || 'Sample Entity',
      createdAt: new Date().toISOString()
    };
  }

  for (const [key, propSchema] of Object.entries(properties)) {
    const s = propSchema as Record<string, any>;
    if (s.type === 'object' && s.properties) {
      result[key] = generateEntityFromSchema(s);
    } else if (s.type === 'array') {
      const itemsSchema = s.items || {};
      result[key] = [generateValueForProperty(key, itemsSchema)];
    } else {
      result[key] = generateValueForProperty(key, s);
    }
  }

  if (!result.id) {
    result.id = defaultId || generateUUID();
  }

  return result;
}
