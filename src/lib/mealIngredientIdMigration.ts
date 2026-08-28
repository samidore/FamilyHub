export const CANONICAL_CHICKEN_THIGH_ID = 'chicken-thighs';
export const LEGACY_CHICKEN_THIGH_IDS = ['boneless-skinless-chicken-thighs', 'bone-in-chicken-thighs'] as const;

const legacyChickenThighIds = new Set<string>(LEGACY_CHICKEN_THIGH_IDS);
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const canonicalIngredientId = (value: string) => legacyChickenThighIds.has(value) ? CANONICAL_CHICKEN_THIGH_ID : value;

function mergeValues(left: unknown, right: unknown): unknown {
  if (left === undefined) return right;
  if (typeof left === 'number' && typeof right === 'number') return left + right;
  if (typeof left === 'boolean' && typeof right === 'boolean') return left || right;
  if (typeof left === 'string' && typeof right === 'string' && DATE_KEY_PATTERN.test(left) && DATE_KEY_PATTERN.test(right)) return left.localeCompare(right) <= 0 ? left : right;
  if (Array.isArray(left) && Array.isArray(right)) {
    const combined = [...left, ...right];
    return combined.every((item) => typeof item === 'string') ? [...new Set(combined)] : combined;
  }
  if (isRecord(left) && isRecord(right)) return mergeRecords(left, right);
  return right;
}

function mergeRecords(left: Record<string, unknown>, right: Record<string, unknown>) {
  const result: Record<string, unknown> = { ...left };
  for (const [key, value] of Object.entries(right)) result[key] = mergeValues(result[key], value);
  return result;
}

function migrateValue(value: unknown): unknown {
  if (typeof value === 'string') return canonicalIngredientId(value);
  if (Array.isArray(value)) {
    const mapped = value.map(migrateValue);
    return mapped.every((item) => typeof item === 'string') ? [...new Set(mapped)] : mapped;
  }
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = canonicalIngredientId(rawKey);
    result[key] = mergeValues(result[key], migrateValue(rawValue));
  }
  return result;
}

export function hasLegacyChickenThighIngredientIds(value: unknown): boolean {
  if (typeof value === 'string') return legacyChickenThighIds.has(value);
  if (Array.isArray(value)) return value.some(hasLegacyChickenThighIngredientIds);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, entry]) => legacyChickenThighIds.has(key) || hasLegacyChickenThighIngredientIds(entry));
}

export function migrateLegacyChickenThighIngredientIds<T>(value: T): T {
  return (hasLegacyChickenThighIngredientIds(value) ? migrateValue(value) : value) as T;
}
