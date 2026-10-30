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
