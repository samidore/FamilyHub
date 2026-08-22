import { NOTEBOOK_PRIORITIES, cloneNotebookState, isSupportedRecurrence, type NotebookItem, type NotebookPriority, type NotebookRecurrenceUnit, type NotebookState } from './notebookDomain.ts';
import { addNotebookItem, completeRecurringNotebookItem, notebookItemsForSection, orderedNotebookBoards, reorderNotebookSection, setNotebookItemBoards, setNotebookItemPriority, setNotebookItemStatus } from './notebookActions.ts';
import { renderNotebookBoardChoices } from './notebookView.ts';
import type { NotebookRepository } from './notebookRepository.ts';

export interface NotebookItemUiContext {
  repository: NotebookRepository;
  getState(): NotebookState;
  mutate(label: string, fn: (current: NotebookState) => NotebookState): Promise<void>;
  status(message: string, error?: boolean): void;
}

const stamp = () => Date.now();
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const selectedBoards = (form: HTMLFormElement) => [...form.querySelectorAll<HTMLInputElement>('input[name="boardIds"]')].filter((input) => input.checked).map((input) => input.value);
const localDate = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
const optionalRating = (data: FormData, name: string) => {
  const raw = String(data.get(name) ?? '').trim();
  if (!raw) return undefined;
  const rating = Number(raw);
  return Number.isFinite(rating) && rating >= 0 && rating <= 10 ? rating : null;
};

export function setupNotebookItemUi(context: NotebookItemUiContext) {
  const host = document.querySelector<HTMLElement>('#notebook-boards')!;
  const dialog = document.querySelector<HTMLDialogElement>('#notebook-item-dialog')!;
  const form = document.querySelector<HTMLFormElement>('#notebook-item-form')!;
  const dialogTitle = document.querySelector<HTMLElement>('#notebook-item-dialog-title')!;
  const boardChoices = document.querySelector<HTMLElement>('#notebook-item-board-choices')!;
  const recurrenceUnit = form.elements.namedItem('recurrenceUnit') as HTMLSelectElement;
  const recurrenceInterval = form.elements.namedItem('recurrenceInterval') as HTMLInputElement;
  const recurrenceIntervalLabel = document.querySelector<HTMLElement>('#notebook-recurrence-interval-label')!;
  const mediaFields = document.querySelector<HTMLElement>('#notebook-media-fields')!;
  let editingItemId: string | null = null;
  let draggedItem: { itemId: string; boardId: string; priority: NotebookPriority } | null = null;

  const refreshRecurrence = () => {
    const unit = recurrenceUnit.value;
    const fixed = unit === 'week' || unit === 'year';
    recurrenceIntervalLabel.hidden = unit === 'none' || fixed;
    if (fixed) recurrenceInterval.value = '1';
    if (!recurrenceInterval.value) recurrenceInterval.value = '1';
  };
  const refreshMedia = () => {
    const state = context.getState();
    mediaFields.hidden = !selectedBoards(form).some((boardId) => state.boards[boardId]?.kind === 'media');
  };
  const setValue = (name: string, value: string | number | undefined) => {
    const input = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (input) input.value = value === undefined ? '' : String(value);
  };

  const openItem = (itemId?: string, boardId?: string) => {
    editingItemId = itemId ?? null;
    const state = context.getState();
    const item = itemId ? state.items[itemId] : undefined;
    dialogTitle.textContent = item ? '编辑事项' : '新事项';
    setValue('title', item?.title);
    setValue('details', item?.details);
    (form.elements.namedItem('priority') as HTMLSelectElement).value = item?.priority ?? 'normal';
    setValue('dueDate', item?.dueDate);
    setValue('dueTime', item?.dueTime);
    recurrenceUnit.value = item?.recurrence?.unit ?? 'none';
    recurrenceInterval.value = String(item?.recurrence?.interval ?? 1);
    recurrenceUnit.disabled = item?.status === 'completed';
    recurrenceInterval.disabled = item?.status === 'completed';
    setValue('platform', item?.platform);
    setValue('imdbRating', item?.imdbRating);
    setValue('myRating', item?.myRating);
    setValue('notes', item?.notes);
    setValue('review', item?.review);
    const selected = new Set(item
      ? orderedNotebookBoards(state).filter((board) => state.memberships[board.id]?.[item.id]).map((board) => board.id)
      : boardId ? [boardId] : []);
    boardChoices.innerHTML = renderNotebookBoardChoices(state, selected);
    refreshRecurrence();
    refreshMedia();
    dialog.showModal();
  };

  host.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const toggle = target.closest('[data-toggle-board]') as HTMLButtonElement | null;
    if (toggle?.dataset.toggleBoard) {
      const boardId = toggle.dataset.toggleBoard;
      void context.mutate('更新 Board', (current) => {
        const board = current.boards[boardId];
        return board ? { ...current, boards: { ...current.boards, [boardId]: { ...board, collapsed: !board.collapsed, updatedAt: stamp() } } } : current;
      });
      return;
    }
    const recurring = target.closest('[data-complete-recurring]') as HTMLButtonElement | null;
    if (recurring?.dataset.completeRecurring) {
      const itemId = recurring.dataset.completeRecurring;
      const eventId = makeId('completion');
      const time = stamp();
      void context.mutate('完成本次', (current) => completeRecurringNotebookItem(current, itemId, eventId, time, localDate()));
      return;
    }
    const add = target.closest('[data-new-item]') as HTMLButtonElement | null;
    if (add?.dataset.newItem) { openItem(undefined, add.dataset.newItem); return; }
    const edit = target.closest('[data-edit-item]') as HTMLButtonElement | null;
    if (edit?.dataset.editItem) { openItem(edit.dataset.editItem); return; }
    const move = target.closest('[data-move-item]') as HTMLButtonElement | null;
    if (move) {
      const card = move.closest<HTMLElement>('[data-item-id]');
      const section = move.closest<HTMLElement>('[data-priority-section]');
      const itemId = card?.dataset.itemId;
      const boardId = section?.dataset.boardId;
      const priority = section?.dataset.priority as NotebookPriority | undefined;
      if (!itemId || !boardId || !priority) return;
      const ids = notebookItemsForSection(context.getState(), boardId, priority, 'active').map((item) => item.id);
      const index = ids.indexOf(itemId);
      const swap = move.dataset.moveItem === 'up' ? index - 1 : index + 1;
      if (index < 0 || swap < 0 || swap >= ids.length) return;
      [ids[index], ids[swap]] = [ids[swap], ids[index]];
      void context.mutate('调整事项顺序', (current) => reorderNotebookSection(current, boardId, priority, ids));
      return;
    }
    const editComment = target.closest('[data-edit-comment]') as HTMLButtonElement | null;
    if (editComment?.dataset.editComment) {
      const comment = context.getState().comments[editComment.dataset.editComment];
      if (!comment) return;
      const body = window.prompt('修改评论', comment.body)?.trim();
      if (body && body !== comment.body) void context.mutate('修改评论', (current) => ({ ...current, comments: { ...current.comments, [comment.id]: { ...comment, body, updatedAt: stamp() } } }));
      return;
    }
    const deleteComment = target.closest('[data-delete-comment]') as HTMLButtonElement | null;
    if (deleteComment?.dataset.deleteComment && window.confirm('删除这条评论？')) {
      const commentId = deleteComment.dataset.deleteComment;
      void context.mutate('删除评论', (current) => { const next = cloneNotebookState(current); delete next.comments[commentId]; return next; });
    }
  });

  host.addEventListener('change', (event) => {
    const priority = (event.target as HTMLElement).closest('[data-item-priority]') as HTMLSelectElement | null;
    if (priority?.dataset.itemPriority) {
      void context.mutate('修改优先级', (current) => setNotebookItemPriority(current, priority.dataset.itemPriority!, priority.value as NotebookPriority, stamp()));
      return;
    }
    const status = (event.target as HTMLElement).closest('[data-item-status]') as HTMLSelectElement | null;
    if (status?.dataset.itemStatus) void context.mutate('修改状态', (current) => setNotebookItemStatus(current, status.dataset.itemStatus!, status.value === 'completed' ? 'completed' : 'active', stamp()));
  });

  host.addEventListener('submit', (event) => {
    const commentForm = (event.target as HTMLElement).closest('[data-comment-add]') as HTMLFormElement | null;
    if (!commentForm?.dataset.commentAdd) return;
    event.preventDefault();
    const body = String(new FormData(commentForm).get('comment') ?? '').trim();
    const authorName = context.repository.getCurrentMemberDisplayName();
    if (!body || !authorName) { context.status('评论显示名字尚未配置', true); return; }
    const commentId = makeId('comment');
    const time = stamp();
    const itemId = commentForm.dataset.commentAdd;
    void context.mutate('添加评论', (current) => ({ ...current, comments: { ...current.comments, [commentId]: { id: commentId, itemId, body, authorName, createdAt: time } } })).then(() => commentForm.reset());
  });

  host.addEventListener('dragstart', (event) => {
    const card = (event.target as HTMLElement).closest('[data-item-id]') as HTMLElement | null;
    const list = card?.closest('[data-item-list]') as HTMLElement | null;
    const itemId = card?.dataset.itemId;
    const boardId = list?.dataset.boardId;
    const priority = list?.dataset.priority as NotebookPriority | undefined;
    if (!itemId || !boardId || !priority) return;
    draggedItem = { itemId, boardId, priority };
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  });
  host.addEventListener('dragover', (event) => {
    if (!draggedItem) return;
    const list = (event.target as HTMLElement).closest('[data-item-list]') as HTMLElement | null;
    if (!list || list.dataset.boardId !== draggedItem.boardId || list.dataset.priority !== draggedItem.priority) return;
    const target = (event.target as HTMLElement).closest('[data-item-id]') as HTMLElement | null;
    const dragged = [...list.querySelectorAll<HTMLElement>(':scope > [data-item-id]')].find((card) => card.dataset.itemId === draggedItem!.itemId);
    if (!target || !dragged || target === dragged || context.getState().items[target.dataset.itemId!]?.status !== 'active') return;
    event.preventDefault();
    const rect = target.getBoundingClientRect();
    list.insertBefore(dragged, event.clientY < rect.top + rect.height / 2 ? target : target.nextSibling);
  });
  host.addEventListener('drop', (event) => {
    if (!draggedItem) return;
    const list = (event.target as HTMLElement).closest('[data-item-list]') as HTMLElement | null;
    if (!list || list.dataset.boardId !== draggedItem.boardId || list.dataset.priority !== draggedItem.priority) return;
    event.preventDefault();
    const { boardId, priority } = draggedItem;
    const state = context.getState();
    const ids = [...list.querySelectorAll<HTMLElement>(':scope > [data-item-id]')].filter((card) => state.items[card.dataset.itemId!]?.status === 'active').map((card) => card.dataset.itemId!).filter(Boolean);
    draggedItem = null;
    void context.mutate('调整事项顺序', (current) => reorderNotebookSection(current, boardId, priority, ids));
  });

  recurrenceUnit.addEventListener('change', refreshRecurrence);
  boardChoices.addEventListener('change', refreshMedia);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    const details = String(data.get('details') ?? '').trim();
    const priority = String(data.get('priority') ?? 'normal') as NotebookPriority;
    const dueDate = String(data.get('dueDate') ?? '').trim();
    const dueTime = String(data.get('dueTime') ?? '').trim();
    const boardIds = selectedBoards(form);
    if (!title || !NOTEBOOK_PRIORITIES.includes(priority) || boardIds.length === 0) { context.status('事项需要标题和至少一个 Board', true); return; }
    if (dueTime && !dueDate) { context.status('设置时间前请先设置日期', true); return; }

    const recurrenceUnitValue = String(data.get('recurrenceUnit') ?? 'none') as NotebookRecurrenceUnit | 'none';
    const recurrenceIntervalValue = Number(data.get('recurrenceInterval') ?? 1);
    const recurrence = recurrenceUnitValue === 'none' ? undefined : { unit: recurrenceUnitValue, interval: (recurrenceUnitValue === 'week' || recurrenceUnitValue === 'year') ? 1 : recurrenceIntervalValue };
    if (recurrence && !isSupportedRecurrence(recurrence)) { context.status('重复周期无效', true); return; }

    const state = context.getState();
    const hasMediaBoard = boardIds.some((boardId) => state.boards[boardId]?.kind === 'media');
    const platform = String(data.get('platform') ?? '').trim();
    const imdbRating = optionalRating(data, 'imdbRating');
    const myRating = optionalRating(data, 'myRating');
    const notes = String(data.get('notes') ?? '').trim();
    const review = String(data.get('review') ?? '').trim();
    if (imdbRating === null || myRating === null) { context.status('评分必须在 0–10 之间', true); return; }

    const time = stamp();
    if (!editingItemId) {
      const itemId = makeId('item');
      const item: NotebookItem = {
        id: itemId,
        title,
        details,
        priority,
        status: 'active',
        ...(dueDate ? { dueDate } : {}),
        ...(dueTime ? { dueTime } : {}),
        ...(recurrence ? { recurrence } : {}),
        ...(hasMediaBoard && platform ? { platform } : {}),
        ...(hasMediaBoard && imdbRating !== undefined ? { imdbRating } : {}),
        ...(hasMediaBoard && myRating !== undefined ? { myRating } : {}),
        ...(hasMediaBoard && notes ? { notes } : {}),
        ...(hasMediaBoard && review ? { review } : {}),
        createdAt: time,
        updatedAt: time,
      };
      void context.mutate('创建事项', (current) => addNotebookItem(current, item, boardIds)).then(() => dialog.close());
      return;
    }
    const itemId = editingItemId;
    const existing = state.items[itemId];
    if (existing?.status === 'completed' && recurrence) { context.status('已完成的一次性事项不能改成循环事项；请先恢复为未完成', true); return; }
    void context.mutate('保存事项', (current) => {
      const currentItem = current.items[itemId];
      if (!currentItem) return current;
      let next = cloneNotebookState(current);
      const edited = { ...next.items[itemId], title, details, updatedAt: time };
      delete edited.dueDate; delete edited.dueTime; delete edited.recurrence;
      if (dueDate) edited.dueDate = dueDate;
      if (dueTime) edited.dueTime = dueTime;
      if (recurrence) edited.recurrence = recurrence;
      if (hasMediaBoard) {
        delete edited.platform; delete edited.imdbRating; delete edited.myRating; delete edited.notes; delete edited.review;
        if (platform) edited.platform = platform;
        if (imdbRating !== undefined) edited.imdbRating = imdbRating;
        if (myRating !== undefined) edited.myRating = myRating;
        if (notes) edited.notes = notes;
        if (review) edited.review = review;
      }
      next.items[itemId] = edited;
      if (currentItem.priority !== priority) next = setNotebookItemPriority(next, itemId, priority, time);
      return setNotebookItemBoards(next, itemId, boardIds, time);
    }).then(() => dialog.close());
  });
  dialog.addEventListener('close', () => {
    editingItemId = null;
    recurrenceUnit.disabled = false;
    recurrenceInterval.disabled = false;
  });
}
