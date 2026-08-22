import { NOTEBOOK_PRIORITIES, type NotebookComment, type NotebookItem, type NotebookPriority, type NotebookState } from './notebookDomain.ts';
import { NOTEBOOK_PRIORITY_LABELS, notebookBoardIdsForItem, notebookItemsForSection, notebookUrgentActiveItems, orderedNotebookBoards } from './notebookActions.ts';

export const escapeNotebookHtml = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const fmt = (value?: number) => value ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(value)) : '';

function commentsFor(state: NotebookState, itemId: string) {
  return Object.values(state.comments).filter((comment) => comment.itemId === itemId).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

function commentHtml(comment: NotebookComment) {
  const e = escapeNotebookHtml;
  return `<li class="notebook-comment" data-comment-id="${e(comment.id)}"><div class="notebook-comment__meta"><strong>${e(comment.authorName)}</strong><span>${e(fmt(comment.createdAt))}${comment.updatedAt ? ' · 已编辑' : ''}</span></div><p>${e(comment.body)}</p><div class="notebook-inline-actions"><button type="button" class="quiet-button" data-edit-comment="${e(comment.id)}">编辑</button><button type="button" class="quiet-button" data-delete-comment="${e(comment.id)}">删除</button></div></li>`;
}

function itemHtml(state: NotebookState, item: NotebookItem, boardId: string | null, movable: boolean, displayName: string | null) {
  const e = escapeNotebookHtml;
  const comments = commentsFor(state, item.id);
  const boardNames = notebookBoardIdsForItem(state, item.id).map((id) => state.boards[id]?.title).filter(Boolean).join(' · ');
  const moves = movable && item.status === 'active' && boardId ? `<button type="button" class="icon-button" data-move-item="up" aria-label="上移 ${e(item.title)}">↑</button><button type="button" class="icon-button" data-move-item="down" aria-label="下移 ${e(item.title)}">↓</button><button type="button" class="drag-handle" draggable="true" data-item-drag-handle aria-label="拖动排序">↕</button>` : '';
  const due = item.dueDate ? `<span>截止 ${e(item.dueDate)}${item.dueTime ? ` ${e(item.dueTime)}` : ''}</span>` : '';
  const completed = item.completedAt ? `<span>完成 ${e(fmt(item.completedAt))}</span>` : '';
  return `<article class="notebook-item" data-item-id="${e(item.id)}" data-board-id="${e(boardId ?? '')}"><div class="notebook-item__topline"><strong>${e(item.title)}</strong><div class="notebook-inline-actions">${moves}<button type="button" class="quiet-button" data-edit-item="${e(item.id)}">编辑</button></div></div><div class="notebook-item__controls"><label>优先级<select data-item-priority="${e(item.id)}">${NOTEBOOK_PRIORITIES.map((p) => `<option value="${p}" ${item.priority === p ? 'selected' : ''}>${NOTEBOOK_PRIORITY_LABELS[p]}</option>`).join('')}</select></label><label>状态<select data-item-status="${e(item.id)}" ${item.recurrence ? 'disabled' : ''}><option value="active" ${item.status === 'active' ? 'selected' : ''}>未完成</option><option value="completed" ${item.status === 'completed' ? 'selected' : ''}>完成</option></select></label></div>${(due || completed || boardNames) ? `<div class="notebook-item__meta">${due}${completed}${boardNames ? `<span>${e(boardNames)}</span>` : ''}</div>` : ''}<details class="notebook-item__details"><summary>内容与评论${comments.length ? ` · ${comments.length}` : ''}</summary><div class="notebook-item__details-body">${item.details ? `<p class="notebook-details-text">${e(item.details)}</p>` : '<p class="notebook-muted">暂无内容。</p>'}<section class="notebook-comments">${comments.length ? `<ul>${comments.map(commentHtml).join('')}</ul>` : '<p class="notebook-muted">暂无评论。</p>'}<form data-comment-add="${e(item.id)}" class="notebook-comment-form"><label>添加评论<textarea name="comment" rows="2" required ${displayName ? '' : 'disabled'}></textarea></label><button type="submit" ${displayName ? '' : 'disabled'}>添加</button></form>${displayName ? '' : '<p class="notebook-warning">添加评论前，需要先配置你的显示名字。</p>'}</section></div></details></article>`;
}

export function renderNotebookBoards(state: NotebookState, displayName: string | null) {
  const filter = state.settings.viewFilter;
  const urgent = filter === 'completed' ? [] : notebookUrgentActiveItems(state);
  const smart = urgent.length ? `<section class="notebook-board notebook-board--urgent" data-smart-urgent><header class="notebook-board__header"><div><p class="eyebrow">Smart board</p><h2>紧急</h2></div><span class="notebook-board__count">${urgent.length}</span></header><div class="notebook-item-list">${urgent.map((item) => itemHtml(state, item, null, false, displayName)).join('')}</div></section>` : '';
  const boards = orderedNotebookBoards(state, true).map((board) => {
    let count = 0;
    const sections = NOTEBOOK_PRIORITIES.map((priority: NotebookPriority) => {
      const items = notebookItemsForSection(state, board.id, priority, filter);
      if (!items.length) return '';
      count += items.length;
      return `<section class="notebook-priority" data-priority-section data-board-id="${escapeNotebookHtml(board.id)}" data-priority="${priority}"><h3>${NOTEBOOK_PRIORITY_LABELS[priority]} <span>${items.length}</span></h3><div class="notebook-item-list" data-item-list data-board-id="${escapeNotebookHtml(board.id)}" data-priority="${priority}">${items.map((item) => itemHtml(state, item, board.id, true, displayName)).join('')}</div></section>`;
    }).join('');
    return `<section class="notebook-board" data-board-id="${escapeNotebookHtml(board.id)}"><header class="notebook-board__header"><button type="button" class="collapse-button" data-toggle-board="${escapeNotebookHtml(board.id)}" aria-expanded="${board.collapsed ? 'false' : 'true'}" aria-label="${board.collapsed ? '展开' : '收起'} ${escapeNotebookHtml(board.title)}">${board.collapsed ? '＋' : '−'}</button><div class="notebook-board__heading"><h2>${escapeNotebookHtml(board.title)}</h2>${board.description ? `<p>${escapeNotebookHtml(board.description)}</p>` : ''}</div><button type="button" class="quiet-button" data-new-item="${escapeNotebookHtml(board.id)}">＋事项</button></header><div class="notebook-board__body" ${board.collapsed ? 'hidden' : ''}>${count ? sections : '<p class="notebook-empty">这个筛选下没有事项。</p>'}</div></section>`;
  }).join('');
  return smart + boards || '<section class="notebook-empty-panel"><h2>还没有 Board</h2><p>先用“管理 Boards”创建一个。Board 名称和类型来自共享 registry，不在代码里写死。</p></section>';
}

export function renderNotebookBoardManager(state: NotebookState) {
  const e = escapeNotebookHtml;
  const boards = orderedNotebookBoards(state);
  if (!boards.length) return '<p class="notebook-muted">还没有 Board。</p>';
  return boards.map((board, index) => `<div class="board-manager-row" data-board-manager-row data-board-id="${e(board.id)}"><button type="button" class="drag-handle" draggable="true" data-board-drag-handle aria-label="拖动 ${e(board.title)} 排序">↕</button><div class="board-manager-row__fields"><label>名称<input data-board-title value="${e(board.title)}" /></label><label>类型<select data-board-kind><option value="task" ${board.kind === 'task' ? 'selected' : ''}>任务</option><option value="media" ${board.kind === 'media' ? 'selected' : ''}>影视</option></select></label><label>说明<input data-board-description value="${e(board.description ?? '')}" placeholder="可留空" /></label><label class="check-label"><input type="checkbox" data-board-visible ${board.visible ? 'checked' : ''} /> 首页显示</label></div><div class="board-manager-row__actions"><button type="button" class="icon-button" data-move-board="up" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" class="icon-button" data-move-board="down" ${index === boards.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="quiet-button" data-save-board>保存</button></div></div>`).join('');
}

export function renderNotebookBoardChoices(state: NotebookState, selected: Set<string>) {
  const e = escapeNotebookHtml;
  const boards = orderedNotebookBoards(state);
  return boards.length ? boards.map((board) => `<label class="board-choice"><input type="checkbox" name="boardIds" value="${e(board.id)}" ${selected.has(board.id) ? 'checked' : ''} /><span>${e(board.title)}</span></label>`).join('') : '<p class="notebook-warning">请先创建 Board。</p>';
}
