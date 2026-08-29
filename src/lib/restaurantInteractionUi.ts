import {
  addRestaurantComment,
  addRestaurantInboxTicket,
  clearRestaurantInbox,
  createRestaurantInboxChatPrompt,
  createRestaurantInteractionRepository,
  deleteRestaurantComment,
  deleteRestaurantInboxTicket,
  editRestaurantComment,
  editRestaurantInboxTicket,
  restaurantCommentsFor,
  restaurantRatingForAuthor,
  restaurantWantSummary,
  setRestaurantRating,
  setRestaurantWant,
  type CreateRestaurantInteractionRepositoryOptions,
  type RestaurantComment,
  type RestaurantInteractionState,
  type RestaurantInteractionStatus,
  type RestaurantRatingScore,
} from './restaurantInteractions.ts';
import { escapeHouseholdHtml, householdCommentWindow, householdPersonIconHtml } from './householdPeople.ts';
import { RESTAURANT_CAT_WANT_DATA_URI, RESTAURANT_DOG_WANT_DATA_URI } from './restaurantWantAssets.ts';
import type { FirebaseConfig } from './householdSession.ts';

const stamp = () => Date.now();
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const fmt = (value: number) => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(value));
const localDate = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('浏览器不允许自动复制');
}

const RATING_STAR_PATH = 'M12 2.6l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.16l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93L12 2.6Z';

function ratingStarSvgHtml(filled: boolean) {
  return `<svg class="restaurant-rating-star-icon${filled ? ' is-filled' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${RATING_STAR_PATH}"></path></svg>`;
}

function ratingStarsHtml(score: RestaurantRatingScore | undefined, editable: boolean, authorName: string) {
  const e = escapeHouseholdHtml;
  if (!editable) {
    const stars = Array.from({ length: 5 }, (_, index) => `<span class="restaurant-rating-star-slot">${ratingStarSvgHtml(index < (score ?? 0))}</span>`).join('');
    return `<span class="restaurant-rating-stars restaurant-rating-stars--static" aria-label="${e(authorName)} ${score ? `${score} 星` : '未评分'}">${stars}</span>`;
  }
  return `<span class="restaurant-rating-stars" aria-label="${e(authorName)}评分">${Array.from({ length: 5 }, (_, index) => {
    const value = index + 1;
    const filled = value <= (score ?? 0);
    const selected = score === value;
    const label = `${e(authorName)} ${value} 星${selected ? '，再点一次清除评分' : ''}`;
    return `<button type="button" data-restaurant-rating-score="${value}" aria-label="${label}" aria-pressed="${selected ? 'true' : 'false'}">${ratingStarSvgHtml(filled)}</button>`;
  }).join('')}</span>`;
}

function ratingsHtml(state: RestaurantInteractionState, restaurantId: string, displayName: string | null, connected: boolean) {
  return ['猫猫', '呜哇'].map((authorName) => {
    const rating = restaurantRatingForAuthor(state, restaurantId, authorName);
    const editable = connected && displayName === authorName;
    return `<div class="restaurant-rating-row" data-rating-author="${escapeHouseholdHtml(authorName)}">
      ${householdPersonIconHtml(authorName, '评分', true)}
      ${ratingStarsHtml(rating?.score, editable, authorName)}
      <span class="restaurant-rating-value">${rating ? `${rating.score}/5` : '—'}</span>
    </div>`;
  }).join('');
}

function wantPeopleHtml(state: RestaurantInteractionState, restaurantId: string) {
  const wants = Object.values(state.wants[restaurantId] ?? {}).sort((left, right) => {
    const order = (name: string) => name === '猫猫' ? 0 : name === '呜哇' ? 1 : 2;
    return order(left.authorName) - order(right.authorName) || left.authorName.localeCompare(right.authorName);
  });
  return wants.map((want) => {
    const e = escapeHouseholdHtml;
    if (want.authorName === '猫猫') return `<img class="restaurant-want-image" src="${RESTAURANT_CAT_WANT_DATA_URI}" alt="猫猫想吃" title="猫猫想吃" />`;
    if (want.authorName === '呜哇') return `<img class="restaurant-want-image" src="${RESTAURANT_DOG_WANT_DATA_URI}" alt="呜哇想吃" title="呜哇想吃" />`;
    return `<span class="restaurant-want-generic">${householdPersonIconHtml(want.authorName, '想吃', true)}<span>${e(want.authorName)}</span></span>`;
  }).join('');
}

function commentHtml(comment: RestaurantComment, currentName: string | null) {
  const e = escapeHouseholdHtml;
  const own = Boolean(currentName && comment.authorName === currentName);
  return `<li class="restaurant-comment" data-restaurant-comment-id="${e(comment.id)}">
    <div class="restaurant-comment__meta">
      <span class="restaurant-comment__author">${householdPersonIconHtml(comment.authorName, '评论', true)}<strong>${e(comment.authorName)}</strong></span>
      <span>${e(fmt(comment.createdAt))}${comment.updatedAt ? ' · 已编辑' : ''}</span>
    </div>
    <p>${e(comment.body)}</p>
    ${own ? `<div class="restaurant-comment__actions"><button type="button" data-restaurant-edit-comment="${e(comment.id)}">编辑</button><button type="button" data-restaurant-delete-comment="${e(comment.id)}">删除</button></div>` : ''}
  </li>`;
}

function commentsHtml(comments: RestaurantComment[], restaurantId: string, displayName: string | null, connected: boolean) {
  const e = escapeHouseholdHtml;
  const windowed = householdCommentWindow(comments);
  const list = comments.length
    ? `<ul class="restaurant-comment-list">${windowed.leading.map((comment) => commentHtml(comment, displayName)).join('')}${windowed.middle.length ? `<li class="restaurant-comment-expand-row"><details class="restaurant-comment-expand"><summary><span class="restaurant-comment-expand__closed">展开中间 ${windowed.middle.length} 条</span><span class="restaurant-comment-expand__open">收起中间 ${windowed.middle.length} 条</span></summary><ul>${windowed.middle.map((comment) => commentHtml(comment, displayName)).join('')}</ul></details></li>` : ''}${windowed.trailing.map((comment) => commentHtml(comment, displayName)).join('')}</ul>`
    : '';
  if (!connected) return list;
  const enabled = Boolean(displayName);
  return `${list}<details class="restaurant-comment-add"><summary>＋ 评论${comments.length ? ` ${comments.length}` : ''}</summary><form data-restaurant-comment-add="${e(restaurantId)}" class="restaurant-comment-form"><textarea name="comment" rows="2" aria-label="评论内容" required ${enabled ? '' : 'disabled'}></textarea><button type="submit" ${enabled ? '' : 'disabled'}>添加</button></form>${enabled ? '' : '<p class="restaurant-interaction-warning">添加评论前，需要先配置你的显示名字。</p>'}</details>`;
}

export function mountRestaurantInteractionUi(config: Partial<FirebaseConfig>, options: CreateRestaurantInteractionRepositoryOptions = {}) {
  const repository = createRestaurantInteractionRepository(config, options);
  const cards = [...document.querySelectorAll<HTMLElement>('[data-restaurant]')];
  const host = document.querySelector<HTMLElement>('#restaurant-list');
  const authShell = document.querySelector<HTMLElement>('#restaurant-household-auth');
  const authMessage = document.querySelector<HTMLElement>('#restaurant-household-auth-message');
  const signIn = document.querySelector<HTMLButtonElement>('#restaurant-household-sign-in');
  const refresh = document.querySelector<HTMLButtonElement>('#restaurant-household-refresh');
  const signOut = document.querySelector<HTMLButtonElement>('#restaurant-household-sign-out');
  const inboxShell = document.querySelector<HTMLElement>('#restaurant-inbox');
  const inboxForm = document.querySelector<HTMLFormElement>('#restaurant-inbox-form');
  const inboxInput = document.querySelector<HTMLInputElement>('#restaurant-inbox-input');
  const inboxCount = document.querySelector<HTMLElement>('#restaurant-inbox-count');
  const inboxList = document.querySelector<HTMLElement>('#restaurant-inbox-list');
  const copyAll = document.querySelector<HTMLButtonElement>('#restaurant-inbox-copy');
  const clearAll = document.querySelector<HTMLButtonElement>('#restaurant-inbox-clear');
  const live = document.querySelector<HTMLElement>('#restaurant-household-live');
  if (!host || !authShell || !authMessage || !signIn || !refresh || !signOut || !inboxShell || !inboxForm || !inboxInput || !inboxCount || !inboxList || !copyAll || !clearAll || !live) return repository;

  let state = repository.getSnapshot();
  let currentStatus = repository.getStatus();
  const isConnected = () => currentStatus.connection === 'connected' || currentStatus.connection === 'local';
  const statusMessage = (message: string, error = false) => {
    live.textContent = message;
    live.dataset.error = error ? 'true' : 'false';
  };

  const renderCards = () => {
    const uid = repository.getCurrentUid();
    const displayName = repository.getCurrentMemberDisplayName();
    const connected = isConnected();
    for (const card of cards) {
      const restaurantId = card.dataset.id ?? '';
      const summary = restaurantWantSummary(state.wants[restaurantId]);
      card.dataset.wantCount = String(summary.count);
      card.dataset.wantCat = summary.cat ? '1' : '0';
      card.dataset.wantDog = summary.dog ? '1' : '0';
      const ratings = card.querySelector<HTMLElement>('[data-restaurant-ratings]');
      if (ratings) ratings.innerHTML = ratingsHtml(state, restaurantId, displayName, connected);
      const wantButton = card.querySelector<HTMLButtonElement>('[data-restaurant-want]');
      if (wantButton) {
        wantButton.disabled = !connected || !displayName;
        wantButton.setAttribute('aria-pressed', uid && state.wants[restaurantId]?.[uid] ? 'true' : 'false');
      }
      const wantPeople = card.querySelector<HTMLElement>('[data-restaurant-want-people]');
      if (wantPeople) wantPeople.innerHTML = wantPeopleHtml(state, restaurantId);
      const comments = card.querySelector<HTMLElement>('[data-restaurant-comments]');
      if (comments) comments.innerHTML = commentsHtml(restaurantCommentsFor(state, restaurantId), restaurantId, displayName, connected);
    }
    window.dispatchEvent(new Event('restaurantinteractionschange'));
  };

  const renderInbox = () => {
    const connected = isConnected();
    inboxShell.hidden = !connected;
    if (!connected) return;
    const tickets = Object.values(state.inbox).sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
    inboxCount.textContent = tickets.length ? `${tickets.length} 条待整理` : '暂无待整理';
    copyAll.disabled = tickets.length === 0;
    clearAll.disabled = tickets.length === 0;
    inboxList.innerHTML = tickets.length
      ? tickets.map((ticket) => `<article class="restaurant-inbox-row" data-restaurant-ticket-id="${escapeHouseholdHtml(ticket.id)}"><p>${escapeHouseholdHtml(ticket.text)}</p><div><button type="button" data-restaurant-edit-ticket>编辑</button><button type="button" data-restaurant-delete-ticket>删除</button></div></article>`).join('')
      : '<p class="restaurant-inbox-empty">Inbox 现在是空的。</p>';
  };

  const renderStatus = (status: RestaurantInteractionStatus) => {
    currentStatus = status;
    const connected = isConnected();
    if (connected) {
      authShell.dataset.state = 'connected';
      authMessage.textContent = status.displayName ? `家庭口味 · ${status.displayName}` : '家庭口味已连接 · 尚未配置显示名字';
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
    renderInbox();
  };

  repository.subscribe((next, status) => {
    state = next;
    renderStatus(status);
  });

  signIn.addEventListener('click', () => void repository.signInWithGoogle().catch((error) => statusMessage(error instanceof Error ? error.message : String(error), true)));
  refresh.addEventListener('click', () => void repository.refreshAccess().catch((error) => statusMessage(error instanceof Error ? error.message : String(error), true)));
  signOut.addEventListener('click', () => void repository.signOut());

  host.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const card = target.closest<HTMLElement>('[data-restaurant]');
    const restaurantId = card?.dataset.id;
    if (!restaurantId) return;

    const ratingButton = target.closest<HTMLButtonElement>('[data-restaurant-rating-score]');
    if (ratingButton) {
      const uid = repository.getCurrentUid();
      const authorName = repository.getCurrentMemberDisplayName();
      const score = Number(ratingButton.dataset.restaurantRatingScore) as RestaurantRatingScore;
      if (!uid || !authorName || !Number.isInteger(score) || score < 1 || score > 5) return;
      const nextScore = ratingButton.getAttribute('aria-pressed') === 'true' ? null : score;
      void repository.transaction((snapshot) => setRestaurantRating(snapshot, restaurantId, uid, authorName, nextScore, stamp()));
      return;
    }

    const wantButton = target.closest<HTMLButtonElement>('[data-restaurant-want]');
    if (wantButton) {
      const uid = repository.getCurrentUid();
      const authorName = repository.getCurrentMemberDisplayName();
      if (!uid || !authorName) return;
      const active = !Boolean(state.wants[restaurantId]?.[uid]);
      void repository.transaction((snapshot) => setRestaurantWant(snapshot, restaurantId, uid, authorName, active, stamp()));
      return;
    }

    const edit = target.closest<HTMLButtonElement>('[data-restaurant-edit-comment]');
    if (edit?.dataset.restaurantEditComment) {
      const comment = state.comments[edit.dataset.restaurantEditComment];
      if (!comment || comment.authorName !== repository.getCurrentMemberDisplayName()) return;
      const body = window.prompt('修改评论', comment.body)?.trim();
      if (body && body !== comment.body) void repository.transaction((snapshot) => editRestaurantComment(snapshot, comment.id, body, stamp()));
      return;
    }

    const remove = target.closest<HTMLButtonElement>('[data-restaurant-delete-comment]');
    if (remove?.dataset.restaurantDeleteComment && window.confirm('删除这条评论？')) {
      const comment = state.comments[remove.dataset.restaurantDeleteComment];
      if (!comment || comment.authorName !== repository.getCurrentMemberDisplayName()) return;
      void repository.transaction((snapshot) => deleteRestaurantComment(snapshot, comment.id));
    }
  });

  host.addEventListener('submit', (event) => {
    const form = (event.target as HTMLElement).closest<HTMLFormElement>('[data-restaurant-comment-add]');
    if (!form?.dataset.restaurantCommentAdd) return;
    event.preventDefault();
    const body = String(new FormData(form).get('comment') ?? '').trim();
    const authorName = repository.getCurrentMemberDisplayName();
    if (!body || !authorName) return;
    const comment: RestaurantComment = { id: makeId('restaurant-comment'), restaurantId: form.dataset.restaurantCommentAdd, body, authorName, createdAt: stamp() };
    void repository.transaction((snapshot) => addRestaurantComment(snapshot, comment)).then(() => form.reset());
  });

  inboxForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = inboxInput.value.trim();
    if (!text) return;
    const now = stamp();
    const id = makeId('restaurant-inbox');
    void repository.transaction((snapshot) => addRestaurantInboxTicket(snapshot, { id, text, createdAt: now, updatedAt: now }))
      .then(() => { inboxForm.reset(); statusMessage('记下了'); })
      .catch((error) => statusMessage(error instanceof Error ? error.message : String(error), true));
  });

  inboxList.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-restaurant-ticket-id]');
    const ticketId = row?.dataset.restaurantTicketId;
    if (!ticketId) return;
    const ticket = state.inbox[ticketId];
    if (!ticket) return;
    if (target.closest('[data-restaurant-edit-ticket]')) {
      const text = window.prompt('修改随手记', ticket.text)?.trim();
      if (text && text !== ticket.text) void repository.transaction((snapshot) => editRestaurantInboxTicket(snapshot, ticketId, text, stamp()));
      return;
    }
    if (target.closest('[data-restaurant-delete-ticket]') && window.confirm('删除这条随手记？')) {
      void repository.transaction((snapshot) => deleteRestaurantInboxTicket(snapshot, ticketId));
    }
  });

  copyAll.addEventListener('click', () => {
    const text = createRestaurantInboxChatPrompt(state, localDate());
    void copyText(text).then(() => statusMessage('给 GPT 的 Restaurants Inbox 已复制')).catch((error) => statusMessage(error instanceof Error ? error.message : String(error), true));
  });

  clearAll.addEventListener('click', () => {
    if (!Object.keys(state.inbox).length || !window.confirm('清空全部 Restaurants 随手记？复制给 GPT 后也不会自动清空。')) return;
    void repository.transaction(clearRestaurantInbox).then(() => statusMessage('随手记已清空'));
  });

  window.addEventListener('beforeunload', () => repository.dispose(), { once: true });
  renderStatus(currentStatus);
  return repository;
}
