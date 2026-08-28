import {
  NOTEBOOK_PRIORITIES,
  isAfterCompletionNotebookRecurrence,
  isLegacyNotebookRecurrence,
  isScheduledNotebookRecurrence,
  type NotebookComment,
  type NotebookItem,
  type NotebookPriority,
  type NotebookState,
  type NotebookWeekday,
} from './notebookDomain.ts';
import {
  NOTEBOOK_COMPLETION_GRACE_MS,
  NOTEBOOK_PRIORITY_LABELS,
  NOTEBOOK_RECURRING_GROUPS,
  isNotebookCompletionInGrace,
  notebookRecurringActiveItems,
  notebookRecurringCompletionEntries,
  notebookRecurringGroupKey,
  notebookRecurringRemainingDays,
  notebookSectionEntries,
  notebookUrgentActiveItems,
  notebookUrgentVisibleItems,
  orderedNotebookBoards,
  type NotebookSectionEntry,
} from './notebookActions.ts';
import {
  getNotebookDueSoonState,
  notebookDueSoonItems,
  notebookDueSoonLabel,
  notebookLocalDateKey,
} from './notebookDueSoon.ts';
import {
  notebookAuthorIconKind,
  notebookCommentWindow,
  notebookCompletedByName,
  notebookItemAuthorName,
} from './notebookCardPresentation.ts';
import { NOTEBOOK_CAT_ICON_DATA_URI } from './notebookAuthorAssets.ts';
import { NOTEBOOK_DOG_ICON_DATA_URI } from './notebookDogAuthorAsset.ts';
import { notebookBoardShowsQueueAge, notebookQueueAgeDays } from './notebookQueueAge.ts';

export const escapeNotebookHtml = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const fmt = (value?: number) => value ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(value)) : '';
const weekdayLabels: Record<NotebookWeekday, string> = { mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日' };

function commentsFor(state: NotebookState, itemId: string) {
  return Object.values(state.comments).filter((comment) => comment.itemId === itemId).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

function commentHtml(comment: NotebookComment) {
  const e = escapeNotebookHtml;
  return `<li class="notebook-comment" data-comment-id="${e(comment.id)}"><div class="notebook-comment__meta"><strong>${e(comment.authorName)}</strong><span>${e(fmt(comment.createdAt))}${comment.updatedAt ? ' · 已编辑' : ''}</span></div><p>${e(comment.body)}</p><div class="notebook-inline-actions"><button type="button" class="quiet-button" data-edit-comment="${e(comment.id)}">编辑</button><button type="button" class="quiet-button" data-delete-comment="${e(comment.id)}">删除</button></div></li>`;
}

function personIconHtml(name: string, action: '发起' | '完成', compact = false) {
  const e = escapeNotebookHtml;
  const kind = notebookAuthorIconKind(name);
  const compactClass = compact ? ' notebook-completer-icon' : '';
  const compactStyle = compact ? ' style="width:1.45rem;height:1.45rem;flex-basis:1.45rem"' : '';
  const common = `class="notebook-author-icon notebook-author-icon--${kind}${compactClass}" role="img" aria-label="${e(name)}${action}" title="${e(name)}" data-author-name="${e(name)}"${compactStyle}`;
  if (kind === 'cat') {
    return `<span ${common}><img src="${NOTEBOOK_CAT_ICON_DATA_URI}" alt="" aria-hidden="true" style="display:block;width:100%;height:100%;object-fit:contain" /></span>`;
  }
  if (kind === 'dog') {
    return `<span ${common}><img src="${NOTEBOOK_DOG_ICON_DATA_URI}" alt="" aria-hidden="true" style="display:block;width:100%;height:100%;object-fit:contain" /></span>`;
  }
  return `<span ${common}><svg viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle class="generic-bg" cx="18" cy="18" r="15"/><circle class="generic-head" cx="18" cy="14" r="5"/><path class="generic-body" d="M9.5 29c.8-5.2 4-8 8.5-8s7.7 2.8 8.5 8"/></svg></span>`;
}

function authorIconHtml(item: NotebookItem) {
  return personIconHtml(notebookItemAuthorName(item), '发起');
}

function completionMetaHtml(record: { completedAt: number; completedByName?: string }) {
  const completedByName = notebookCompletedByName(record);
  return `<span style="display:inline-flex;align-items:center;gap:.3rem">${personIconHtml(completedByName, '完成', true)}<span>完成 ${escapeNotebookHtml(fmt(record.completedAt))}</span></span>`;
}

function recurrenceText(item: NotebookItem) {
  const recurrence = item.recurrence;
  if (!recurrence) return '';
  if (isAfterCompletionNotebookRecurrence(recurrence)) return `完成后 ${recurrence.intervalDays} 天`;
  if (isScheduledNotebookRecurrence(recurrence)) {
    if (recurrence.unit === 'day') return recurrence.interval === 1 ? '每天' : `每 ${recurrence.interval} 天`;
    if (recurrence.unit === 'week') {
      const cadence = recurrence.interval === 1 ? '每周' : `每 ${recurrence.interval} 周`;
      const days = (recurrence.weekdays ?? []).map((weekday) => weekdayLabels[weekday]).join('、');
      return days ? `${cadence} · ${days}` : cadence;
    }
    if (recurrence.unit === 'month') return recurrence.interval === 1 ? '每月' : `每 ${recurrence.interval} 月`;
    return recurrence.interval === 1 ? '每年' : `每 ${recurrence.interval} 年`;
  }
  if (isLegacyNotebookRecurrence(recurrence)) {
    if (recurrence.unit === 'day') return recurrence.interval === 1 ? '每天' : `每 ${recurrence.interval} 天`;
    if (recurrence.unit === 'week') return '每周';
    if (recurrence.unit === 'month') return recurrence.interval === 1 ? '每月' : `每 ${recurrence.interval} 月`;
    return '每年';
  }
  return '';
}

function mediaDetails(item: NotebookItem) {
  const e = escapeNotebookHtml;
  const summary = [
    item.platform ? `<span>平台 ${e(item.platform)}</span>` : '',
    item.imdbRating !== undefined ? `<span>IMDb ${e(item.imdbRating)}/10</span>` : '',
    item.myRating !== undefined ? `<span>我的评分 ${e(item.myRating)}/10</span>` : '',
  ].filter(Boolean).join('');
  const text = [
    item.notes ? `<div><strong>Notes</strong><p>${e(item.notes)}</p></div>` : '',
    item.review ? `<div><strong>看后评价</strong><p>${e(item.review)}</p></div>` : '',
  ].filter(Boolean).join('');
  return { summary, text };
}

function dueSoonIconHtml(item: NotebookItem, today: string) {
  const dueSoon = getNotebookDueSoonState(item, today);
  if (!dueSoon) return '';
  const label = notebookDueSoonLabel(dueSoon);
  return `<span role="img" aria-label="${escapeNotebookHtml(label)}" title="${escapeNotebookHtml(label)}" style="width:1.7rem;height:1.7rem;border-radius:999px;display:grid;place-items:center;background:#fff0f1;color:#c83f4d;box-shadow:0 1px 4px rgb(160 43 57 / 18%)"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:1.08rem;height:1.08rem;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transform:rotate(-4deg)"><path d="M7 4h10M7 20h10M8 5c0 3 1.5 4.5 4 7-2.5 2.5-4 4-4 7h8c0-3-1.5-4.5-4-7 2.5-2.5 4-4 4-7H8z"/><path d="M9.6 7.2h4.8L12 10.1 9.6 7.2Zm.25 9.6h4.3L12 14.4l-2.15 2.4Z" style="fill:currentColor;stroke:none;opacity:.35"/></svg></span>`;
}

function remainingDaysLabel(remainingDays: number | null) {
  if (remainingDays === null) return '未定日期';
  if (remainingDays < 0) return `已过期 ${Math.abs(remainingDays)} 天`;
  if (remainingDays === 0) return '今天';
  if (remainingDays === 1) return '明天';
  return `还有 ${remainingDays} 天`;
}

function cornerStatus(state: NotebookState, item: NotebookItem, today: string, now: number, showQueueAge: boolean, recurringRemainingDays?: number | null) {
  if (recurringRemainingDays !== undefined) {
    const group = notebookRecurringGroupKey(recurringRemainingDays);
    const label = remainingDaysLabel(recurringRemainingDays);
    return {
      cardStyle: ' style="position:relative"',
      titleStyle: ' style="padding-right:7.5rem"',
      html: `<div class="notebook-corner-status"><span class="notebook-remaining-badge notebook-remaining-badge--${group}" aria-label="${escapeNotebookHtml(label)}">${escapeNotebookHtml(label)}</span></div>`,
      recurringGroup: group,
    };
  }
  const dueSoon = dueSoonIconHtml(item, today);
  const ageDays = showQueueAge ? notebookQueueAgeDays(state, item, now) : null;
  const age = ageDays === null ? '' : `<span aria-label="已排队 ${ageDays} 天" title="已排队 ${ageDays} 天" style="white-space:nowrap;border-radius:999px;background:#f3eee6;color:#665f56;padding:.2rem .45rem;font-size:.82rem;font-weight:700;line-height:1.25">${ageDays}天</span>`;
  if (!dueSoon && !age) return { cardStyle: '', titleStyle: '', html: '', recurringGroup: undefined };
  const reserve = dueSoon && age ? '5.5rem' : dueSoon ? '2.25rem' : '3.3rem';
  return {
    cardStyle: ' style="position:relative"',
    titleStyle: ` style="padding-right:${reserve}"`,
    html: `<div style="position:absolute;top:.5rem;right:.5rem;display:flex;align-items:center;gap:.3rem;z-index:1">${dueSoon}${age}</div>`,
    recurringGroup: undefined,
  };
}

function commentsHtml(comments: NotebookComment[], itemId: string, displayName: string | null) {
  const e = escapeNotebookHtml;
  const windowed = notebookCommentWindow(comments);
  const list = comments.length ? `<ul class="notebook-comment-list">${windowed.leading.map(commentHtml).join('')}${windowed.middle.length ? `<li class="notebook-comment-expand-row"><details class="notebook-comment-expand"><summary><span class="notebook-comment-expand__closed">展开中间 ${windowed.middle.length} 条</span><span class="notebook-comment-expand__open">收起中间 ${windowed.middle.length} 条</span></summary><ul>${windowed.middle.map(commentHtml).join('')}</ul></details></li>` : ''}${windowed.trailing.map(commentHtml).join('')}</ul>` : '';
  const add = `<details class="notebook-comment-add"><summary>＋ 添加评论</summary><form data-comment-add="${e(itemId)}" class="notebook-comment-form"><textarea name="comment" rows="2" aria-label="评论内容" required ${displayName ? '' : 'disabled'}></textarea><button type="submit" ${displayName ? '' : 'disabled'}>添加</button></form>${displayName ? '' : '<p class="notebook-warning">添加评论前，需要先配置你的显示名字。</p>'}</details>`;
  return `<section class="notebook-comments">${list}${add}</section>`;
}

function itemHtml(state: NotebookState, item: NotebookItem, boardId: string | null, movable: boolean, displayName: string | null, showGrace: boolean, now: number, today: string, showQueueAge: boolean, recurringRemainingDays?: number | null) {
  const e = escapeNotebookHtml;
  const comments = commentsFor(state, item.id);
  const moves = movable && item.status === 'active' && boardId ? `<button type="button" class="icon-button" data-move-item="up" aria-label="上移 ${e(item.title)}">↑</button><button type="button" class="icon-button" data-move-item="down" aria-label="下移 ${e(item.title)}">↓</button><button type="button" class="drag-handle" draggable="true" data-item-drag-handle aria-label="拖动排序">↕</button>` : '';
  const due = item.dueDate ? `<span>${item.recurrence ? '下次' : '截止'} ${e(item.dueDate)}${item.dueTime ? ` ${e(item.dueTime)}` : ''}</span>` : '';
  const completed = item.completedAt ? completionMetaHtml({ completedAt: item.completedAt, completedByName: item.completedByName }) : '';
  const recurrence = item.recurrence ? `<span>循环 ${e(recurrenceText(item))}</span>` : '';
  const media = mediaDetails(item);
  const corner = cornerStatus(state, item, today, now, showQueueAge, recurringRemainingDays);
  const statusControl = item.recurrence
    ? `<div class="notebook-recurring-status"><span>未完成</span><button type="button" class="secondary-button" data-complete-recurring="${e(item.id)}">完成本次</button></div>`
    : item.status === 'active'
      ? `<div class="notebook-completion-control"><span>未完成</span><button type="button" class="secondary-button" data-complete-item="${e(item.id)}">✓ 完成</button></div>`
      : isNotebookCompletionInGrace(item, now)
        ? `<div class="notebook-completion-control"><span>已完成</span><button type="button" class="secondary-button" data-restore-item="${e(item.id)}">撤销完成</button></div>`
        : `<div class="notebook-completion-control"><span>已完成</span></div>`;
  const graceMinutes = showGrace && item.completedAt
    ? Math.max(1, Math.ceil((item.completedAt + NOTEBOOK_COMPLETION_GRACE_MS - now) / 60000))
    : null;
  const grace = graceMinutes ? `<span class="notebook-grace-note">已完成 · 还会在这里保留 ${graceMinutes} 分钟</span>` : '';
  const body = `${item.details ? `<p class="notebook-details-text">${e(item.details)}</p>` : ''}${media.text ? `<section class="notebook-media-detail">${media.text}</section>` : ''}${commentsHtml(comments, item.id, displayName)}`;
  const recurringClass = corner.recurringGroup ? ` notebook-item--recurring-${corner.recurringGroup}` : '';
  return `<article class="notebook-item${graceMinutes ? ' notebook-item--grace' : ''}${recurringClass}"${corner.cardStyle} data-item-id="${e(item.id)}" data-board-id="${e(boardId ?? '')}">${corner.html}<div class="notebook-item__topline"><div class="notebook-item__heading">${authorIconHtml(item)}<strong${corner.titleStyle}>${e(item.title)}</strong></div><div class="notebook-inline-actions">${moves}<button type="button" class="quiet-button" data-edit-item="${e(item.id)}">编辑</button></div></div><div class="notebook-item__controls"><label>优先级<select data-item-priority="${e(item.id)}">${NOTEBOOK_PRIORITIES.map((p) => `<option value="${p}" ${item.priority === p ? 'selected' : ''}>${NOTEBOOK_PRIORITY_LABELS[p]}</option>`).join('')}</select></label>${statusControl}</div>${(due || completed || recurrence || grace || media.summary) ? `<div class="notebook-item__meta">${due}${completed}${recurrence}${grace}${media.summary}</div>` : ''}<div class="notebook-item__body">${body}</div></article>`;
}

function historyHtml(entry: NotebookSectionEntry) {
  const e = escapeNotebookHtml;
  if (entry.kind !== 'recurrence' || !entry.event) return '';
  return `<article class="notebook-item notebook-item--history" data-completion-event-id="${e(entry.event.id)}"><div class="notebook-item__topline"><div class="notebook-item__heading">${authorIconHtml(entry.item)}<strong>${e(entry.item.title)}</strong></div><span class="notebook-history-badge">循环记录</span></div><div class="notebook-item__meta">${completionMetaHtml(entry.event)}</div></article>`;
}

function sectionEntryHtml(state: NotebookState, entry: NotebookSectionEntry, boardId: string, displayName: string | null, filter: string, now: number, today: string, showQueueAge: boolean) {
  return entry.kind === 'recurrence'
    ? historyHtml(entry)
    : itemHtml(state, entry.item, boardId, true, displayName, filter === 'active' && entry.item.status === 'completed', now, today, showQueueAge);
}

function recurringBoardHtml(state: NotebookState, displayName: string | null, now: number, today: string) {
  const filter = state.settings.viewFilter;
  const active = filter === 'completed' ? [] : notebookRecurringActiveItems(state, today);
  const groups = NOTEBOOK_RECURRING_GROUPS.map((group) => {
    const items = active.filter((item) => notebookRecurringGroupKey(notebookRecurringRemainingDays(item, today)) === group.key);
    if (!items.length) return '';
    return `<section class="notebook-recurring-group notebook-recurring-group--${group.key}" data-recurring-group="${group.key}"><h3>${group.label} <span>${items.length}</span></h3><div class="notebook-item-list">${items.map((item) => itemHtml(state, item, null, false, displayName, false, now, today, false, notebookRecurringRemainingDays(item, today))).join('')}</div></section>`;
  }).join('');
  const history = filter === 'active' ? [] : notebookRecurringCompletionEntries(state);
  const historyHtmlBlock = history.length ? `<section class="notebook-recurring-history"><h3>完成记录 <span>${history.length}</span></h3><div class="notebook-item-list">${history.map(historyHtml).join('')}</div></section>` : '';
  const count = active.length + history.length;
  const body = groups || historyHtmlBlock ? `${groups}${historyHtmlBlock}` : '<p class="notebook-empty">这个筛选下没有反复事项。</p>';
  return `<section class="notebook-board notebook-board--recurring" data-recurring-board><header class="notebook-board__header"><div class="notebook-board__heading"><p class="eyebrow">Recurring</p><h2>反复干</h2><p>按剩余日数分组；组内按优先级和剩余天数自动排序。</p></div><span class="notebook-board__count notebook-board__count--recurring">${count}</span></header><div class="notebook-board__body">${body}</div></section>`;
}

export function renderNotebookBoards(state: NotebookState, displayName: string | null, now = Date.now()) {
  const filter = state.settings.viewFilter;
  const today = notebookLocalDateKey(now);
  const manualUrgent = filter === 'completed' ? [] : filter === 'active' ? notebookUrgentVisibleItems(state, now) : notebookUrgentActiveItems(state);
  const manualIds = new Set(manualUrgent.map((item) => item.id));
  const dueSoon = filter === 'completed' ? [] : notebookDueSoonItems(state, today).filter((item) => !manualIds.has(item.id));
  const urgent = [...manualUrgent, ...dueSoon];
  const smart = urgent.length ? `<section class="notebook-board notebook-board--urgent" data-smart-urgent><header class="notebook-board__header"><div><p class="eyebrow">Smart board</p><h2>紧急</h2></div><span class="notebook-board__count">${urgent.length}</span></header><div class="notebook-item-list">${urgent.map((item) => itemHtml(state, item, null, false, displayName, filter === 'active' && item.status === 'completed', now, today, true)).join('')}</div></section>` : '';
  const recurring = recurringBoardHtml(state, displayName, now, today);
  const boards = orderedNotebookBoards(state, true).map((board) => {
    let count = 0;
    const showQueueAge = notebookBoardShowsQueueAge(board);
    const sections = NOTEBOOK_PRIORITIES.map((priority: NotebookPriority) => {
      const entries = notebookSectionEntries(state, board.id, priority, filter, now);
      if (!entries.length) return '';
      count += entries.length;
      return `<section class="notebook-priority" data-priority-section data-board-id="${escapeNotebookHtml(board.id)}" data-priority="${priority}"><h3>${NOTEBOOK_PRIORITY_LABELS[priority]} <span>${entries.length}</span></h3><div class="notebook-item-list" data-item-list data-board-id="${escapeNotebookHtml(board.id)}" data-priority="${priority}">${entries.map((entry) => sectionEntryHtml(state, entry, board.id, displayName, filter, now, today, showQueueAge)).join('')}</div></section>`;
    }).join('');
    return `<section class="notebook-board" data-board-id="${escapeNotebookHtml(board.id)}"><header class="notebook-board__header"><button type="button" class="collapse-button" data-toggle-board="${escapeNotebookHtml(board.id)}" aria-expanded="${board.collapsed ? 'false' : 'true'}" aria-label="${board.collapsed ? '展开' : '收起'} ${escapeNotebookHtml(board.title)}">${board.collapsed ? '＋' : '−'}</button><div class="notebook-board__heading"><h2>${escapeNotebookHtml(board.title)}</h2>${board.description ? `<p>${escapeNotebookHtml(board.description)}</p>` : ''}</div><button type="button" class="quiet-button" data-new-item="${escapeNotebookHtml(board.id)}">＋事项</button></header><div class="notebook-board__body" ${board.collapsed ? 'hidden' : ''}>${count ? sections : '<p class="notebook-empty">这个筛选下没有事项。</p>'}</div></section>`;
  }).join('');
  return smart + recurring + boards;
}

export function renderNotebookBoardManager(state: NotebookState) {
  const e = escapeNotebookHtml;
  const boards = orderedNotebookBoards(state);
  if (!boards.length) return '<p class="notebook-muted">还没有 Board。</p>';
  return boards.map((board, index) => `<div class="board-manager-row" data-board-manager-row data-board-id="${e(board.id)}"><button type="button" class="drag-handle" draggable="true" data-board-drag-handle aria-label="拖动 ${e(board.title)} 排序">↕</button><div class="board-manager-row__fields"><label>名称<input data-board-title value="${e(board.title)}" /></label><label>类型<select data-board-kind><option value="task" ${board.kind === 'task' ? 'selected' : ''}>任务</option><option value="media" ${board.kind === 'media' ? 'selected' : ''}>影视</option></select></label><label>说明<input data-board-description value="${e(board.description ?? '')}" placeholder="可留空" /></label><label class="check-label"><input type="checkbox" data-board-visible ${board.visible ? 'checked' : ''} /> 首页显示</label><label class="check-label"><input type="checkbox" data-board-show-queue-age ${notebookBoardShowsQueueAge(board) ? 'checked' : ''} /> 显示排队天数</label></div><div class="board-manager-row__actions"><button type="button" class="icon-button" data-move-board="up" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" class="icon-button" data-move-board="down" ${index === boards.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="quiet-button" data-save-board>保存</button></div></div>`).join('');
}

export function renderNotebookBoardChoices(state: NotebookState, selected: Set<string>) {
  const e = escapeNotebookHtml;
  const boards = orderedNotebookBoards(state);
  return boards.length ? boards.map((board) => `<label class="board-choice"><input type="checkbox" name="boardIds" value="${e(board.id)}" ${selected.has(board.id) ? 'checked' : ''} /><span>${e(board.title)}</span></label>`).join('') : '<p class="notebook-warning">请先创建 Board。</p>';
}
