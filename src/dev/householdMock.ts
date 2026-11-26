/** Development-only synthetic household states, using the normal local repositories. */
import { LocalHouseholdRepository } from '../lib/householdRepository.ts';
import { LocalNotebookRepository } from '../lib/notebookRepository.ts';
import { normalizeHouseholdState, createCurrentMealFromInventory } from '../lib/household.ts';
import { normalizeNotebookState } from '../lib/notebookDomain.ts';
import type { FirebaseHouseholdSession, HouseholdSessionStatus } from '../lib/householdSession.ts';
import type { MealIngredient, MealRecipe } from '../lib/mealEngine.ts';

export const mockName = () => new URLSearchParams(window.location.search).get('mock') ?? '';
const marker = 'FamilyHub development preview';
const now = () => Date.now();

export function mockNotebookState() {
  const time = now();
  const date = new Date(time + 86400000);
  const dueDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const board = { id: 'preview-board', title: '演示事项', kind: 'task', visible: true, collapsed: false, order: 0, createdAt: time, updatedAt: time };
  const items = Object.fromEntries(['确认周末安排', '整理工具箱', '读完这本书'].map((title, index) => {
    const id = `preview-task-${index}`;
    return [id, { id, title, details: '这是开发预览的示例内容，可以展开、编辑和完成。', priority: index === 0 ? 'high' : 'normal', status: 'active', createdAt: time, updatedAt: time, ...(index === 0 ? { dueDate } : {}) }];
  }));
  return normalizeNotebookState({
    boards: { [board.id]: board }, items,
    memberships: { [board.id]: Object.fromEntries(Object.keys(items).map((id, order) => [id, { order }])) },
    comments: { 'preview-comment': { id: 'preview-comment', itemId: 'preview-task-0', body: '示例评论：已经记下了。', authorName: 'Preview User', createdAt: time } },
    inbox: { 'preview-ticket': { id: 'preview-ticket', text: '示例随手记：整理周末要做的事', createdAt: time, updatedAt: time } },
  });
}

export function mockMealState(ingredients: MealIngredient[]) {
  const inventory = Object.fromEntries(ingredients.filter((item) => !("visible" in item) || item.visible).map((item) => [item.id, item.inventoryTracking === 'presence-only' ? true as const : 4]));
  const currentMeal = createCurrentMealFromInventory(inventory, {}, ingredients);
  return normalizeHouseholdState({ inventory, currentMeal, activeStep: 'recipes' }, ingredients);
}

export function createMockHousehold(ingredients: MealIngredient[] = [], recipes: MealRecipe[] = []) {
  let value = JSON.stringify(mockMealState(ingredients));
  return new LocalHouseholdRepository('development-preview', {
    ingredients, recipes, broadcast: false,
    storage: { getItem: () => value, setItem: (_, next) => { value = next; }, removeItem: () => { value = 'null'; } },
  });
}

export function createMockNotebook() {
  const repository = new LocalNotebookRepository('development-preview', { initialState: mockNotebookState(), displayName: 'Preview User' });
  const mode = mockName();
  let status = mode.endsWith('pending') ? { connection: 'pending' as const, label: '等待家庭管理员批准；批准后会自动连接。', email: 'preview@example.test' }
    : mode.endsWith('loading') ? { connection: 'connecting' as const, label: '正在读取小本本…' }
    : mode.endsWith('error') ? { connection: 'error' as const, label: '小本本读取失败，请重新检查权限后重试', email: 'preview@example.test' }
    : { connection: 'local' as const, label: marker, networkConnected: !mode.endsWith('reconnecting'), displayName: 'Preview User' };
  repository.getStatus = () => ({ ...status });
  repository.refreshAccess = async () => {
    status = { connection: 'local', label: marker, networkConnected: true, displayName: 'Preview User' };
    await repository.update((state) => state);
  };
  return repository;
}

export function createTodayMock(ingredients: MealIngredient[], recipes: Pick<MealRecipe, 'id'>[]) {
  const mode = mockName();
  let status: HouseholdSessionStatus = mode === 'today-signed-out' ? { connection: 'signed-out', label: '需要登录' } : mode === 'today-pending'
    ? { connection: 'pending', label: '等待家庭管理员批准；批准后会自动连接。', uid: 'preview-member', email: 'preview@example.test' }
    : { connection: 'connected', label: marker, uid: 'preview-member', email: 'preview@example.test', networkConnected: mode !== 'today-reconnecting' };
  let notify: (status: HouseholdSessionStatus) => void = () => {};
  const session = {
    ready: Promise.resolve(), getStatus: () => status,
    subscribe(fn: typeof notify) { notify = fn; fn(status); return () => {}; },
    async signInWithGoogle() { status = { connection: 'connected', label: marker, uid: 'preview-member', email: 'preview@example.test' }; notify(status); },
    async refreshAccess() { status = { ...status, connection: 'connected' }; notify(status); },
    async signOut() { status = { connection: 'signed-out', label: '已退出开发预览' }; notify(status); },
  } as unknown as FirebaseHouseholdSession;
  let retried = false;
  const listen = (source: 'state' | 'notebook', success: (value: unknown) => void, failure: () => void) => {
    let active = true;
    queueMicrotask(() => {
      if (!active || mode === 'today-loading') return;
      if (!retried && (mode === 'today-error' || mode === `today-${source === 'state' ? 'meal' : 'notebook'}-error`)) failure();
      else {
        const meal = mockMealState(ingredients);
        if (meal.currentMeal) { meal.currentMeal.selectedRecipeIds = recipes.slice(0, 2).map((recipe) => recipe.id); meal.currentMeal.status = 'ready'; }
        success(source === 'state' ? meal : mockNotebookState());
      }
    });
    return () => { active = false; };
  };
  let enabled = mode === 'today-push-enabled' || mode === 'today-push-disabling';
  const push = {
    denied: mode === 'today-push-denied', available: mode !== 'today-push-unsupported',
    configured: mode !== 'today-push-unconfigured',
    action: mode === 'today-push-enabling' ? 'enable' : mode === 'today-push-disabling' ? 'disable' : '',
    async check(): Promise<boolean> {
      if (mode === 'today-push-checking') return new Promise(() => {});
      if (mode === 'today-push-error') throw new Error('Preview notification check');
      return enabled;
    },
    async enable() { if (mode === 'today-push-enabling') return new Promise<void>(() => {}); enabled = true; },
    async disable() { if (mode === 'today-push-disabling') return new Promise<void>(() => {}); enabled = false; },
  };
  return { session, listen, retry() { retried = true; }, push };
}
