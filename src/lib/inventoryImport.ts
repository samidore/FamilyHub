import type { MealIngredient } from './mealEngine.ts';
import { calendarDateKey } from './mealEngine.ts';
import {
  COUNTED_INVENTORY_STEP,
  addStock,
  normalizeHouseholdState,
  roundCountedInventoryValue,
  type HouseholdState,
} from './household.ts';

export const INVENTORY_IMPORT_SCHEMA = 'meal-builder-inventory-import';
export const INVENTORY_IMPORT_VERSION = 1;

export type InventoryImportIngredient = MealIngredient & { visible?: boolean };
export type InventoryImportStorage = 'inventory' | 'freezer';

export interface InventoryImportItem {
  ingredientId: string;
  quantity: number;
  storage: InventoryImportStorage;
}

export interface InventoryImportUnmatched {
  label: string;
  reason: 'producer-unmatched' | 'invalid-ingredient-id';
}

export interface InventoryImportDraft {
  stockedOn: string;
  items: InventoryImportItem[];
  unmatched: InventoryImportUnmatched[];
}

export type InventoryImportParseResult =
  | { ok: true; draft: InventoryImportDraft }
  | { ok: false; error: string };

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const isStepAligned = (value: number) => Number.isFinite(value) && Math.abs(value / COUNTED_INVENTORY_STEP - Math.round(value / COUNTED_INVENTORY_STEP)) < 1e-9;

function isRealCalendarDate(value: string) {
  if (!DATE_KEY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidInventoryImportDate(value: string, today = calendarDateKey()) {
  return isRealCalendarDate(value) && isRealCalendarDate(today) && value <= today;
}

function quantityIsValid(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && isStepAligned(value);
}

function importStorageForIngredient(
  ingredient: InventoryImportIngredient,
  rawStorage: unknown,
): InventoryImportStorage | null {
  if (rawStorage !== undefined && rawStorage !== 'inventory' && rawStorage !== 'freezer') return null;
  const storage = (rawStorage ?? (ingredient.freezerBehavior === 'direct' ? 'freezer' : 'inventory')) as InventoryImportStorage;
  if (ingredient.freezerBehavior === 'direct') return storage === 'freezer' ? storage : null;
  if (ingredient.freezerBehavior === 'thaw-required') return storage;
  return storage === 'inventory' ? storage : null;
}

export function parseInventoryImport(
  input: string,
  ingredients: InventoryImportIngredient[],
  today = calendarDateKey(),
): InventoryImportParseResult {
  let payload: unknown;
  try {
    payload = JSON.parse(input);
  } catch {
    return { ok: false, error: '不是有效的 JSON。' };
  }
  if (!isRecord(payload)) return { ok: false, error: '入库 JSON 必须是一个对象。' };
  if (payload.schema !== INVENTORY_IMPORT_SCHEMA) return { ok: false, error: '不支持的入库 schema。' };
  if (payload.version !== INVENTORY_IMPORT_VERSION) return { ok: false, error: '不支持的入库 version。' };
  if (typeof payload.stocked_on !== 'string' || !isValidInventoryImportDate(payload.stocked_on, today)) {
    return { ok: false, error: 'stocked_on 必须是真实且不晚于今天的 YYYY-MM-DD 日期。' };
  }
  if (!Array.isArray(payload.items)) return { ok: false, error: 'items 必须是数组。' };
  if (!Array.isArray(payload.unmatched) || payload.unmatched.some((item) => typeof item !== 'string' || !item.trim())) {
    return { ok: false, error: 'unmatched 必须是非空字符串数组。' };
  }

  const importableById = new Map(ingredients.filter((ingredient) => ingredient.visible !== false).map((ingredient) => [ingredient.id, ingredient]));
  const mergedItems = new Map<string, InventoryImportItem>();
  const unmatched: InventoryImportUnmatched[] = (payload.unmatched as string[]).map((label) => ({ label: label.trim(), reason: 'producer-unmatched' }));

  for (const raw of payload.items) {
    if (!isRecord(raw) || typeof raw.ingredient_id !== 'string' || !raw.ingredient_id.trim() || !quantityIsValid(raw.quantity)) {
      return { ok: false, error: '每个 items 条目都必须包含有效 ingredient_id 和正的 0.5 倍数 quantity。' };
    }
    if (raw.storage !== undefined && raw.storage !== 'inventory' && raw.storage !== 'freezer') {
      return { ok: false, error: 'storage 只能是 inventory 或 freezer。' };
    }
    const id = raw.ingredient_id.trim();
    const ingredient = importableById.get(id);
    if (!ingredient) {
      unmatched.push({ label: id, reason: 'invalid-ingredient-id' });
      continue;
    }
    const storage = importStorageForIngredient(ingredient, raw.storage);
    if (!storage) return { ok: false, error: `${ingredient.nameZh ?? id} 不支持这个存放位置。` };
    const key = `${id}\u0000${storage}`;
    const existing = mergedItems.get(key);
    mergedItems.set(key, {
      ingredientId: id,
      storage,
      quantity: roundCountedInventoryValue((existing?.quantity ?? 0) + raw.quantity),
    });
  }

  return {
    ok: true,
    draft: {
      stockedOn: payload.stocked_on,
      items: [...mergedItems.values()],
      unmatched,
    },
  };
}

export function applyInventoryImport(
  state: HouseholdState,
  draft: Pick<InventoryImportDraft, 'stockedOn' | 'items'>,
  ingredients: InventoryImportIngredient[],
  today = calendarDateKey(),
): HouseholdState {
  if (!isValidInventoryImportDate(draft.stockedOn, today)) throw new Error('入库日期无效。');
  const importableById = new Map(ingredients.filter((ingredient) => ingredient.visible !== false).map((ingredient) => [ingredient.id, ingredient]));
  let next = state;

  for (const item of draft.items) {
    const ingredient = importableById.get(item.ingredientId);
    if (!ingredient || !quantityIsValid(item.quantity)) throw new Error('入库草稿包含无效食材或数量。');
    const storage = importStorageForIngredient(ingredient, item.storage);
    if (!storage) throw new Error('入库草稿包含无效存放位置。');
    const internalStorage = ingredient.freezerBehavior === 'direct' ? 'inventory' : storage;
    next = addStock(next, item.ingredientId, internalStorage, item.quantity, ingredients, draft.stockedOn);
  }

  return normalizeHouseholdState(next, ingredients);
}
