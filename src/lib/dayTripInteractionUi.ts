import {
  addDayTripComment,
  createDayTripInteractionRepository,
  dayTripCommentsFor,
  dayTripReactionSummary,
  deleteDayTripComment,
  editDayTripComment,
  setDayTripReaction,
  type CreateDayTripInteractionRepositoryOptions,
  type DayTripComment,
  type DayTripInteractionState,
  type DayTripInteractionStatus,
  type DayTripReactionValue,
} from './dayTripInteractions.ts';
import { escapeHouseholdHtml, householdCommentWindow, householdPersonIconHtml } from './householdPeople.ts';
import type { FirebaseConfig } from './householdSession.ts';

const stamp = () => Date.now();
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const fmt = (value: number) => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(value));

function commentHtml(comment: DayTripComment) {
  const e = escapeHouseholdHtml;
  return `<li class="trip-comment" data-trip-comment-id="${e(comment.id)}">
    <div class="trip-comment__meta">
      <span class="trip-comment__author">${householdPersonIconHtml(comment.authorName, '评论', true)}<strong>${e(comment.authorName)}</strong></span>
      <span>${e(fmt(comment.createdAt))}${comment.updatedAt ? ' · 已编辑' : ''}</span>
    </div>
    <p>${e(comment.body)}</p>
    <div class="trip-comment__actions"><button type="button" data-trip-edit-comment="${e(comment.id)}">编辑</button><button type="button" data-trip-delete-comment="${e(comment.id)}">删除</button></div>
  </li>`;
}

function commentsHtml(comments: DayTripComment[], destinationId: string, displayName: string | null, connected: boolean) {
  const e = escapeHouseholdHtml;
  const windowed = householdCommentWindow(comments);
  const list = comments.length
    ? `<ul class="trip-comment-list">${windowed.leading.map(commentHtml).join('')}${windowed.middle.length ? `<li class="trip-comment-expand-row"><details class="trip-comment-expand"><summary><span class="trip-comment-expand__closed">展开中间 ${windowed.middle.length} 条</span><span class="trip-comment-expand__open">收起中间 ${windowed.middle.length} 条</span></summary><ul>${windowed.middle.map(commentHtml).join('')}</ul></details></li>` : ''}${windowed.trailing.map(commentHtml).join('')}</ul>`
    : '';
  if (!connected) return list;
  const enabled = Boolean(displayName);
  const add = `<details class="trip-comment-add"><summary>＋ 添加评论</summary><form data-trip-comment-add="${e(destinationId)}" class="trip-comment-form"><textarea name="comment" rows="2" aria-label="评论内容" required ${enabled ? '' : 'disabled'}></textarea><button type="submit" ${enabled ? '' : 'disabled'}>添加</button></form>${enabled ? '' : '<p class="trip-interaction-warning">添加评论前，需要先配置你的显示名字。</p>'}</details>`;
  return `${list}${add}`;
}

function reactionPeopleHtml(reactions: DayTripInteractionState['reactions'][string] | undefined) {
  return Object.entries(reactions ?? {})
    .sort(([, left], [, right]) => (left.value === right.value ? left.authorName.localeCompare(right.authorName) : left.value === 'up' ? -1 : 1))
    .map(([, reaction]) => `<span class="trip-reaction-person">${householdPersonIconHtml(reaction.authorName, reaction.value === 'up' ? '赞成' : '不赞成', true)}<span aria-hidden="true">${reaction.value === 'up' ? '👍' : '👎'}</span></span>`)
    .join('');
}

export function mountDayTripInteractionUi(config: Partial<FirebaseConfig>, options: CreateDayTripInteractionRepositoryOptions = {}) {
  const repository = createDayTripInteractionRepository(config, options);
  const cards = [...document.querySelectorAll<HTMLElement>('[data-destination]')];
  const host = document.querySelector<HTMLElement>('#trip-list');
  const authShell = document.querySelector<HTMLElement>('#trip-household-auth');
  const authMessage = document.querySelector<HTMLElement>('#trip-household-auth-message');
  const signIn = document.querySelector<HTMLButtonElement>('#trip-household-sign-in');
  const refresh = document.querySelector<HTMLButtonElement>('#trip-household-refresh');
  const signOut = document.querySelector<HTMLButtonElement>('#trip-household-sign-out');
  if (!host || !authShell || !authMessage || !signIn || !refresh || !signOut) return repository;

  let state = repository.getSnapshot();
  let currentStatus = repository.getStatus();
  const isConnected = () => currentStatus.connection === 'connected' || currentStatus.connection === 'local';

  const renderCards = () => {
    const uid = repository.getCurrentUid();
    const displayName = repository.getCurrentMemberDisplayName();
    const connected = isConnected();
    for (const card of cards) {
      const destinationId = card.dataset.id ?? '';
      const reactions = state.reactions[destinationId];
      const summary = dayTripReactionSummary(reactions);
      card.dataset.reactionRank = String(summary.rank);
      card.dataset.reactionUps = String(summary.upCount);
      card.querySelectorAll<HTMLButtonElement>('[data-trip-reaction]').forEach((button) => {
        const value = button.dataset.tripReaction as DayTripReactionValue;
        const active = Boolean(uid && reactions?.[uid]?.value === value);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        button.disabled = !connected || !displayName;
      });
      const people = card.querySelector<HTMLElement>('[data-trip-reaction-people]');
      if (people) people.innerHTML = reactionPeopleHtml(reactions);
      const comments = card.querySelector<HTMLElement>('[data-trip-comments]');
      if (comments) comments.innerHTML = commentsHtml(dayTripCommentsFor(state, destinationId), destinationId, displayName, connected);
    }
    window.dispatchEvent(new Event('daytripinteractionschange'));
  };

  const renderStatus = (status: DayTripInteractionStatus) => {
    currentStatus = status;
    const connected = isConnected();
    if (connected) {
      authShell.dataset.state = 'connected';
      authMessage.textContent = status.displayName ? `家庭评价 · ${status.displayName}` : '家庭评价已连接 · 尚未配置显示名字';
    } else if (status.connection === 'error') {
      authShell.dataset.state = 'error';
      authMessage.textContent = status.error ? `${status.label}：${status.error}` : status.label;
    } else {
      authShell.dataset.state = status.connection;
      authMessage.textContent = status.label;
    }
    signIn.hidden = status.connection !== 'signed-out' && !(status.connection === 'error' && !status.email);
    refresh.hidden = status.connection !== 'pending' && !(status.connection === 'error' && Boolean(status.email));
    signOut.hidden = !status.email;
    renderCards();
  };

  repository.subscribe((next, status) => {
    state = next;
    renderStatus(status);
  });

  signIn.addEventListener('click', () => void repository.signInWithGoogle());
  refresh.addEventListener('click', () => void repository.refreshAccess());
  signOut.addEventListener('click', () => void repository.signOut());

  host.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const reactionButton = target.closest<HTMLButtonElement>('[data-trip-reaction]');
    if (reactionButton) {
      const card = reactionButton.closest<HTMLElement>('[data-destination]');
      const destinationId = card?.dataset.id;
      const uid = repository.getCurrentUid();
      const authorName = repository.getCurrentMemberDisplayName();
      const value = reactionButton.dataset.tripReaction as DayTripReactionValue;
      if (!destinationId || !uid || !authorName) return;
      const current = state.reactions[destinationId]?.[uid]?.value;
      const nextValue = current === value ? null : value;
      void repository.transaction((snapshot) => setDayTripReaction(snapshot, destinationId, uid, authorName, nextValue, stamp()));
      return;
    }

    const edit = target.closest<HTMLButtonElement>('[data-trip-edit-comment]');
    if (edit?.dataset.tripEditComment) {
      const comment = state.comments[edit.dataset.tripEditComment];
      if (!comment) return;
      const body = window.prompt('修改评论', comment.body)?.trim();
      if (body && body !== comment.body) void repository.transaction((snapshot) => editDayTripComment(snapshot, comment.id, body, stamp()));
      return;
    }

    const remove = target.closest<HTMLButtonElement>('[data-trip-delete-comment]');
    if (remove?.dataset.tripDeleteComment && window.confirm('删除这条评论？')) {
      const commentId = remove.dataset.tripDeleteComment;
      void repository.transaction((snapshot) => deleteDayTripComment(snapshot, commentId));
    }
  });

  host.addEventListener('submit', (event) => {
    const form = (event.target as HTMLElement).closest<HTMLFormElement>('[data-trip-comment-add]');
    if (!form?.dataset.tripCommentAdd) return;
    event.preventDefault();
    const body = String(new FormData(form).get('comment') ?? '').trim();
    const authorName = repository.getCurrentMemberDisplayName();
    if (!body || !authorName) return;
    const id = makeId('trip-comment');
    const comment: DayTripComment = { id, destinationId: form.dataset.tripCommentAdd, body, authorName, createdAt: stamp() };
    void repository.transaction((snapshot) => addDayTripComment(snapshot, comment)).then(() => form.reset());
  });

  window.addEventListener('beforeunload', () => repository.dispose(), { once: true });
  renderStatus(currentStatus);
  return repository;
}
