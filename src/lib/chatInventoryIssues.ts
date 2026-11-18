import { calendarDateKey } from './mealEngine.ts';
import { parseInventoryImport, type InventoryImportDraft, type InventoryImportIngredient } from './inventoryImport.ts';

/** Public one-off commands only; the live household inventory stays in Firebase. */
export const CHAT_IMPORT_ISSUE_PREFIX = '[familyhub-inventory-import-v1]';
export const CHAT_IMPORT_OWNER = 'samidore';
export const CHAT_IMPORT_ISSUES_URL =
  'https://api.github.com/repos/samidore/FamilyHub/issues?state=all&sort=created&direction=desc&per_page=100';

export interface ChatInventoryIssue {
  issueNumber: number;
  draft: InventoryImportDraft;
}
export interface ChatInventoryIssueScan {
  ready: ChatInventoryIssue[];
  errors: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export function scanChatInventoryIssues(
  response: unknown,
  ingredients: InventoryImportIngredient[],
  applied: Record<string, true> = {},
  today = calendarDateKey(),
): ChatInventoryIssueScan {
  if (!Array.isArray(response)) throw new Error('GitHub 入库列表格式不正确。');
  const ready: ChatInventoryIssue[] = [];
  const errors: string[] = [];
  for (const issue of response) {
    if (!isRecord(issue) || typeof issue.title !== 'string' || !issue.title.startsWith(CHAT_IMPORT_ISSUE_PREFIX)) continue;
    if (issue.pull_request || !isRecord(issue.user) || issue.user.login !== CHAT_IMPORT_OWNER || issue.author_association !== 'OWNER') continue;
    const number = issue.number;
    if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 1 || applied[String(number)]) continue;
    if (typeof issue.body !== 'string' || issue.body.length > 32_768) { errors.push(`#${number} 入库内容无效或过长`); continue; }
    const result = parseInventoryImport(issue.body, ingredients, today);
    if (!result.ok) { errors.push(`#${number} ${result.error}`); continue; }
    if (result.draft.unmatched.length > 0 || result.draft.items.length === 0) {
      errors.push(`#${number} 包含未匹配食材或空入库清单，未写入`);
      continue;
    }
    ready.push({ issueNumber: number, draft: result.draft });
  }
  ready.sort((a, b) => a.issueNumber - b.issueNumber);
  return { ready, errors };
}
