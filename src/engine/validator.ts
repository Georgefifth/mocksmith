export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a payload against an OpenAPI 3.x schema definition
 */
export function validatePayload(
  payload: any,
  schema?: Record<string, any>
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!schema || typeof schema !== 'object') {
    return { valid: true, errors };
  }

  // If payload is empty or not an object
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    errors.push({
      field: 'root',
      message: 'Request body must be a valid JSON object'
    });
    return { valid: false, errors };
  }

  // Handle oneOf polymorphic schema validation
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const results = schema.oneOf.map((v: any) => validatePayload(payload, v));
    const validCount = results.filter((r) => r.valid).length;
    if (validCount !== 1) {
      return {
        valid: false,
        errors: [
          {
            field: 'oneOf',
            message: `Payload must match exactly one 'oneOf' schema (matched ${validCount} of ${schema.oneOf.length})`
          }
        ]
      };
    }
    return { valid: true, errors: [] };
  }

  // Handle anyOf polymorphic schema validation
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    const results = schema.anyOf.map((v: any) => validatePayload(payload, v));
    const anyPassed = results.some((r) => r.valid);
    if (!anyPassed) {
      return {
        valid: false,
        errors: [
          {
            field: 'anyOf',
            message: `Payload does not match any of the ${schema.anyOf.length} 'anyOf' schema variants`
          }
        ]
      };
    }
    return { valid: true, errors: [] };
  }

  // 1. Required fields check
  const requiredFields: string[] = Array.isArray(schema.required) ? schema.required : [];
  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      errors.push({
        field,
        message: `Missing required property '${field}'`
      });
    }
  }

  // 2. Type validation
  const properties = schema.properties || {};
  for (const [propName, propDef] of Object.entries(properties)) {
    const val = payload[propName];
    if (val === undefined || val === null) continue; // missing optional fields are okay

    const expectedType = (propDef as any).type;
    if (!expectedType) continue;

    if (expectedType === 'string' && typeof val !== 'string') {
      errors.push({ field: propName, message: `Property '${propName}' must be a string` });
    } else if (expectedType === 'integer') {
      if (typeof val !== 'number' || !Number.isInteger(val)) {
        errors.push({ field: propName, message: `Property '${propName}' must be an integer` });
      }
    } else if (expectedType === 'number') {
      if (typeof val !== 'number' || Number.isNaN(val)) {
        errors.push({ field: propName, message: `Property '${propName}' must be a number` });
      }
    } else if (expectedType === 'boolean' && typeof val !== 'boolean') {
      errors.push({ field: propName, message: `Property '${propName}' must be a boolean` });
    } else if (expectedType === 'array' && !Array.isArray(val)) {
      errors.push({ field: propName, message: `Property '${propName}' must be an array` });
    } else if (expectedType === 'object' && (typeof val !== 'object' || Array.isArray(val))) {
      errors.push({ field: propName, message: `Property '${propName}' must be an object` });
    }

    // Enum check
    const enumValues = (propDef as any).enum;
    if (Array.isArray(enumValues) && enumValues.length > 0) {
      if (!enumValues.includes(val)) {
        errors.push({
          field: propName,
          message: `Property '${propName}' value '${val}' is not one of allowed values: [${enumValues.join(', ')}]`
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
