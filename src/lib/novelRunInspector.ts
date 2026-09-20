import { FirebaseHouseholdSession, hasCompleteFirebaseConfig, type FirebaseConfig, type HouseholdSessionStatus } from './householdSession.ts';

export type NovelRunStatus = 'running' | 'complete' | 'blocked' | 'failed';
export type NovelStepStatus = 'completed' | 'running' | 'pending' | 'blocked' | 'failed';

export interface NovelStepDetail {
  agent?: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: string;
  task?: string;
  commits?: string[];
  finding?: string;
  result?: string;
  role?: string;
  reason?: string;
}

export interface NovelRunStep {
  id: string;
  label: string;
  status: NovelStepStatus;
  stateLabel: string;
  meta?: string;
  annotation?: string;
  detail: NovelStepDetail;
}

export interface NovelRunActivity {
  time: string;
  text: string;
}

export interface NovelRunInspectorRun {
  runId: string;
  act: string;
  chapterStart: number;
  chapterEnd: number;
  workflow: string;
  status: NovelRunStatus;
  startedAt: string;
  finishedAt?: string;
  elapsed: string;
  statusTitle?: string;
  statusNote?: string;
  steps: NovelRunStep[];
  activity: NovelRunActivity[];
}

export const mockNovelRuns: NovelRunInspectorRun[] = [
  {
    runId: 'run-20260920-relationship-overlay-17-22',
    act: 'Act II',
    chapterStart: 17,
    chapterEnd: 22,
    workflow: 'Relationship Overlay',
    status: 'running',
    startedAt: '01:58',
    elapsed: '1h 08m',
    statusNote: 'Review #2 is evaluating the repaired overlay.',
    steps: [
      { id: 'q1', label: 'Qualification', status: 'completed', stateLabel: 'Completed · 02:06', meta: '8m', detail: { agent: 'Sol', startedAt: '01:58', finishedAt: '02:06', duration: '8m', task: '20260920015801_qualification', commits: ['1f7c3d2'], result: 'PASS' } },
      { id: 'm1', label: 'Materialize', status: 'completed', stateLabel: 'Completed · 02:41', meta: '35m', detail: { agent: 'Luna', startedAt: '02:06', finishedAt: '02:41', duration: '35m', task: '20260920020611_materialize', commits: ['937bb4f', 'a82ce21'], result: 'PASS' } },
      { id: 'r1', label: 'Review #1', status: 'completed', stateLabel: 'Completed · 02:47', meta: '6m', annotation: 'REVISE', detail: { agent: 'Sol', role: 'Reviewer', startedAt: '02:41', finishedAt: '02:47', duration: '6m', task: '20260920024109_review-1', finding: 'Relationship source binding required correction.', result: 'REVISE' } },
      { id: 'p1', label: 'Repair #1', status: 'completed', stateLabel: 'Completed · 03:07', meta: '20m', detail: { agent: 'Luna', startedAt: '02:47', finishedAt: '03:07', duration: '20m', task: '20260920024740_repair-1', commits: ['2a9fc17'], finding: 'Corrected source binding and regenerated the affected overlay records.', result: 'PASS' } },
      { id: 'r2', label: 'Review #2', status: 'running', stateLabel: 'Running · 8m', meta: 'Reviewer', detail: { agent: 'Sol', role: 'Reviewer', startedAt: '03:07', duration: '8m', task: '20260920030718_review-2', finding: 'Checking repaired relationship bindings and downstream consistency.' } },
      { id: 'a1', label: 'Acceptance', status: 'pending', stateLabel: 'Waiting', detail: {} },
    ],
    activity: [
      { time: '02:47', text: 'Review #1 requested revision' },
      { time: '03:07', text: 'Repair #1 completed' },
      { time: '03:08', text: 'Review #2 started' },
      { time: '03:14', text: 'Validation checkpoint reached' },
    ],
  },
  {
    runId: 'run-20260919-character-state-13-16',
    act: 'Act II',
    chapterStart: 13,
    chapterEnd: 16,
    workflow: 'Character State',
    status: 'complete',
    startedAt: '22:16',
    finishedAt: '23:47',
    elapsed: '1h 31m',
    statusNote: 'All stages accepted.',
    steps: [
      { id: 'q2', label: 'Qualification', status: 'completed', stateLabel: 'Completed · 22:24', meta: '8m', detail: { agent: 'Sol', startedAt: '22:16', finishedAt: '22:24', duration: '8m', result: 'PASS' } },
      { id: 'm2', label: 'Materialize', status: 'completed', stateLabel: 'Completed · 23:01', meta: '37m', detail: { agent: 'Luna', startedAt: '22:24', finishedAt: '23:01', duration: '37m', commits: ['a193b64'], result: 'PASS' } },
      { id: 'r3', label: 'Review #1', status: 'completed', stateLabel: 'Completed · 23:18', meta: '17m', annotation: 'PASS', detail: { agent: 'Sol', role: 'Reviewer', startedAt: '23:01', finishedAt: '23:18', duration: '17m', result: 'PASS' } },
      { id: 'a2', label: 'Acceptance', status: 'completed', stateLabel: 'Completed · 23:47', meta: '29m', detail: { agent: 'Sol', startedAt: '23:18', finishedAt: '23:47', duration: '29m', result: 'ACCEPTED' } },
    ],
    activity: [
      { time: '23:01', text: 'Materialize completed' },
      { time: '23:18', text: 'Review #1 passed' },
      { time: '23:47', text: 'Run accepted' },
    ],
  },
  {
    runId: 'run-20260919-qualification-28-32',
    act: 'Act I',
    chapterStart: 28,
    chapterEnd: 32,
    workflow: 'Qualification',
    status: 'blocked',
    startedAt: '18:02',
    elapsed: '42m',
    statusTitle: 'Review #2',
    statusNote: 'Needs attention',
    steps: [
      { id: 'q3', label: 'Qualification', status: 'completed', stateLabel: 'Completed · 18:10', meta: '8m', detail: { agent: 'Sol', startedAt: '18:02', finishedAt: '18:10', duration: '8m', result: 'PASS' } },
      { id: 'm3', label: 'Materialize', status: 'completed', stateLabel: 'Completed · 18:31', meta: '21m', detail: { agent: 'Luna', startedAt: '18:10', finishedAt: '18:31', duration: '21m', commits: ['44fd10a'], result: 'PASS' } },
      { id: 'r4', label: 'Review #1', status: 'completed', stateLabel: 'Completed · 18:37', meta: '6m', annotation: 'REVISE', detail: { agent: 'Sol', role: 'Reviewer', startedAt: '18:31', finishedAt: '18:37', duration: '6m', finding: 'Producer source checksum was incomplete.', result: 'REVISE' } },
      { id: 'p2', label: 'Repair #1', status: 'completed', stateLabel: 'Completed · 18:42', meta: '5m', detail: { agent: 'Luna', startedAt: '18:37', finishedAt: '18:42', duration: '5m', result: 'PASS' } },
      { id: 'r5', label: 'Review #2', status: 'blocked', stateLabel: 'BLOCKED', meta: 'Source binding mismatch', detail: { agent: 'Sol', role: 'Reviewer', startedAt: '18:42', task: '20260919184203_review-2', reason: 'Frozen producer source SHA-256 cannot be resolved from the current execution window.', finding: 'Source binding mismatch.', result: 'BLOCKED' } },
      { id: 'a3', label: 'Acceptance', status: 'pending', stateLabel: 'Waiting', detail: {} },
    ],
    activity: [
      { time: '18:37', text: 'Review #1 requested revision' },
      { time: '18:42', text: 'Repair #1 completed' },
      { time: '18:44', text: 'Review #2 blocked on source binding' },
    ],
  },
  {
    runId: 'run-20260918-relationship-overlay-23-27',
    act: 'Act I',
    chapterStart: 23,
    chapterEnd: 27,
    workflow: 'Relationship Overlay',
    status: 'complete',
    startedAt: '14:05',
    finishedAt: '15:44',
    elapsed: '1h 39m',
    statusNote: 'Accepted after one repair loop.',
    steps: [
      { id: 'q4', label: 'Qualification', status: 'completed', stateLabel: 'Completed · 14:12', meta: '7m', detail: { agent: 'Sol', startedAt: '14:05', finishedAt: '14:12', duration: '7m', result: 'PASS' } },
      { id: 'm4', label: 'Materialize', status: 'completed', stateLabel: 'Completed · 14:46', meta: '34m', detail: { agent: 'Luna', startedAt: '14:12', finishedAt: '14:46', duration: '34m', result: 'PASS' } },
      { id: 'r6', label: 'Review #1', status: 'completed', stateLabel: 'Completed · 14:55', meta: '9m', annotation: 'REVISE', detail: { agent: 'Sol', role: 'Reviewer', startedAt: '14:46', finishedAt: '14:55', duration: '9m', finding: 'Two relationship transitions lacked explicit causal anchors.', result: 'REVISE' } },
      { id: 'p3', label: 'Repair #1', status: 'completed', stateLabel: 'Completed · 15:19', meta: '24m', detail: { agent: 'Luna', startedAt: '14:55', finishedAt: '15:19', duration: '24m', commits: ['0ad26e8', '2ed91a0'], result: 'PASS' } },
      { id: 'r7', label: 'Review #2', status: 'completed', stateLabel: 'Completed · 15:31', meta: '12m', annotation: 'PASS', detail: { agent: 'Sol', role: 'Reviewer', startedAt: '15:19', finishedAt: '15:31', duration: '12m', result: 'PASS' } },
      { id: 'a4', label: 'Acceptance', status: 'completed', stateLabel: 'Completed · 15:44', meta: '13m', detail: { agent: 'Sol', startedAt: '15:31', finishedAt: '15:44', duration: '13m', result: 'ACCEPTED' } },
    ],
    activity: [
      { time: '14:55', text: 'Review #1 requested revision' },
      { time: '15:19', text: 'Repair #1 completed' },
      { time: '15:31', text: 'Review #2 passed' },
      { time: '15:44', text: 'Run accepted' },
    ],
  },
  {
    runId: 'run-20260918-qualification-17',
    act: 'Act II',
    chapterStart: 17,
    chapterEnd: 17,
    workflow: 'Qualification',
    status: 'failed',
    startedAt: '09:12',
    elapsed: '27m',
    statusTitle: 'Materialize',
    statusNote: 'Execution stopped',
    steps: [
      { id: 'q5', label: 'Qualification', status: 'completed', stateLabel: 'Completed · 09:19', meta: '7m', detail: { agent: 'Sol', startedAt: '09:12', finishedAt: '09:19', duration: '7m', result: 'PASS' } },
      { id: 'm5', label: 'Materialize', status: 'failed', stateLabel: 'FAILED', meta: 'Output contract mismatch', detail: { agent: 'Luna', startedAt: '09:19', finishedAt: '09:39', duration: '20m', task: '20260918091944_materialize', reason: 'The produced relationship record did not satisfy the expected output contract.', result: 'FAILED' } },
      { id: 'r8', label: 'Review #1', status: 'pending', stateLabel: 'Not started', detail: {} },
      { id: 'a5', label: 'Acceptance', status: 'pending', stateLabel: 'Not started', detail: {} },
    ],
    activity: [
      { time: '09:19', text: 'Qualification passed' },
      { time: '09:39', text: 'Materialize failed contract validation' },
      { time: '09:39', text: 'Execution stopped' },
    ],
  },
];

const statusGlyph: Record<NovelStepStatus, string> = {
  completed: '✓',
  running: '●',
  pending: '○',
  blocked: '!',
  failed: '×',
};

const runGlyph: Record<NovelRunStatus, string> = {
  running: '●',
  complete: '✓',
  blocked: '!',
  failed: '×',
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] ?? character));

const chapterLabel = (run: NovelRunInspectorRun) => run.chapterStart === run.chapterEnd
  ? `Ch. ${run.chapterStart}`
  : `Ch. ${run.chapterStart}–${run.chapterEnd}`;

const runLabel = (run: NovelRunInspectorRun) => `${run.act} · ${chapterLabel(run)} · ${run.workflow}`;

const countCompleted = (run: NovelRunInspectorRun) => run.steps.filter((step) => step.status === 'completed').length;

const detailRow = (label: string, value?: string) => value
  ? `<div class="novel-detail-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
  : '';

function renderStepDetail(run: NovelRunInspectorRun, step: NovelRunStep) {
  const detail = step.detail;
  const commits = detail.commits?.length
    ? `<div class="novel-detail-row novel-detail-row--stack"><dt>Commits</dt><dd>${detail.commits.map((commit) => `<code>${escapeHtml(commit)}</code>`).join(' ')}</dd></div>`
    : '';
  const taskAction = detail.task
    ? `<button type="button" class="novel-copy-button" data-copy-task="${escapeHtml(detail.task)}">Copy Task</button>`
    : '';
  return `
    <div class="novel-detail-heading">
      <div>
        <p class="eyebrow">Step details</p>
        <h3>${escapeHtml(step.label)}</h3>
      </div>
      <span class="novel-status-pill novel-status-pill--${step.status}">${escapeHtml(step.status.toUpperCase())}</span>
    </div>
    <dl class="novel-detail-list">
      ${detailRow('Status', step.stateLabel)}
      ${detailRow('Agent', detail.agent)}
      ${detailRow('Role', detail.role)}
      ${detailRow('Started', detail.startedAt)}
      ${detailRow('Finished', detail.finishedAt)}
      ${detailRow('Duration', detail.duration)}
      ${detailRow('Task', detail.task)}
      ${commits}
      ${detailRow('Review finding', detail.finding)}
      ${detailRow('Reason', detail.reason)}
      ${detailRow('Result', detail.result)}
    </dl>
    <div class="novel-detail-actions">
      ${taskAction}
      <button type="button" class="novel-secondary-button" disabled title="GitHub integration is intentionally not connected in this UI-only round">Open GitHub</button>
    </div>
    <p class="novel-detail-footnote">Technical metadata is mock-only in this round. Run: ${escapeHtml(run.runId)}</p>
  `;
}

function renderRun(app: HTMLElement, run: NovelRunInspectorRun) {
  const title = app.querySelector<HTMLElement>('[data-run-title]')!;
  const workflow = app.querySelector<HTMLElement>('[data-run-workflow]')!;
  const status = app.querySelector<HTMLElement>('[data-run-status]')!;
  const progress = app.querySelector<HTMLElement>('[data-run-progress]')!;
  const elapsed = app.querySelector<HTMLElement>('[data-run-elapsed]')!;
  const note = app.querySelector<HTMLElement>('[data-run-note]')!;
  const steps = app.querySelector<HTMLElement>('[data-run-steps]')!;
  const activity = app.querySelector<HTMLElement>('[data-run-activity]')!;
  const detail = app.querySelector<HTMLElement>('[data-step-detail]')!;

  title.textContent = `${run.act} · ${chapterLabel(run)}`;
  workflow.textContent = run.workflow;
  status.className = `novel-run-status novel-run-status--${run.status}`;
  status.innerHTML = `<span aria-hidden="true">${runGlyph[run.status]}</span><strong>${run.status.toUpperCase()}</strong>`;
  const completed = countCompleted(run);
  progress.textContent = run.status === 'complete'
    ? `${run.steps.length} / ${run.steps.length} stages`
    : `${completed} / ${run.steps.length} stages complete`;
  elapsed.textContent = run.status === 'blocked' || run.status === 'failed'
    ? (run.statusTitle ?? `Elapsed ${run.elapsed}`)
    : `Elapsed ${run.elapsed}`;
  note.textContent = run.statusNote ?? '';

  steps.innerHTML = run.steps.map((step, index) => `
    <div class="novel-step-wrap">
      <button type="button" class="novel-step novel-step--${step.status}" data-step-id="${escapeHtml(step.id)}" aria-expanded="false">
        <span class="novel-step__icon" aria-hidden="true">${statusGlyph[step.status]}</span>
        <span class="novel-step__copy">
          <span class="novel-step__title">${escapeHtml(step.label)}</span>
          <span class="novel-step__state">${escapeHtml(step.stateLabel)}</span>
          ${step.meta ? `<span class="novel-step__meta">${escapeHtml(step.meta)}</span>` : ''}
        </span>
        <span class="novel-step__chevron" aria-hidden="true">›</span>
      </button>
      ${step.annotation ? `<div class="novel-step-annotation novel-step-annotation--${step.annotation.toLowerCase()}">${escapeHtml(step.annotation)}</div>` : ''}
      ${index < run.steps.length - 1 ? '<div class="novel-connector" aria-hidden="true"><span></span><b>▼</b></div>' : ''}
    </div>
  `).join('');

  activity.innerHTML = run.activity.map((entry) => `<li><time>${escapeHtml(entry.time)}</time><span>${escapeHtml(entry.text)}</span></li>`).join('');

  const showDetail = (step: NovelRunStep) => {
    steps.querySelectorAll<HTMLButtonElement>('[data-step-id]').forEach((button) => button.setAttribute('aria-expanded', String(button.dataset.stepId === step.id)));
    detail.innerHTML = renderStepDetail(run, step);
    detail.hidden = false;
    detail.querySelector<HTMLButtonElement>('[data-copy-task]')?.addEventListener('click', async (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      const task = button.dataset.copyTask ?? '';
      try {
        await navigator.clipboard.writeText(task);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Copy unavailable';
      }
    });
  };

  steps.querySelectorAll<HTMLButtonElement>('[data-step-id]').forEach((button) => button.addEventListener('click', () => {
    const step = run.steps.find((candidate) => candidate.id === button.dataset.stepId);
    if (!step) return;
    if (button.getAttribute('aria-expanded') === 'true') {
      button.setAttribute('aria-expanded', 'false');
      detail.hidden = true;
      return;
    }
    showDetail(step);
    if (window.matchMedia('(max-width: 767px)').matches) detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));

  const initialStep = run.steps.find((step) => ['running', 'blocked', 'failed'].includes(step.status)) ?? run.steps.at(-1);
  if (initialStep) showDetail(initialStep);
}

function renderSelector(select: HTMLSelectElement, runs: NovelRunInspectorRun[]) {
  select.innerHTML = runs.map((run, index) => `<option value="${escapeHtml(run.runId)}" ${index === 0 ? 'selected' : ''}>${runGlyph[run.status]} ${escapeHtml(runLabel(run))}</option>`).join('');
}

function authMessage(status: HouseholdSessionStatus) {
  if (status.error) return `${status.label}: ${status.error}`;
  return status.label;
}

export function mountNovelRunInspector(config: Partial<FirebaseConfig>, runs: NovelRunInspectorRun[] = mockNovelRuns) {
  const authShell = document.querySelector<HTMLElement>('#novel-auth-shell');
  const app = document.querySelector<HTMLElement>('#novel-inspector-app');
  const message = document.querySelector<HTMLElement>('#novel-auth-message');
  const signIn = document.querySelector<HTMLButtonElement>('#novel-sign-in');
  const refresh = document.querySelector<HTMLButtonElement>('#novel-refresh-access');
  const signOut = document.querySelector<HTMLButtonElement>('#novel-sign-out');
  const select = document.querySelector<HTMLSelectElement>('#novel-run-select');
  if (!authShell || !app || !message || !signIn || !refresh || !signOut || !select) throw new Error('Novel Run Inspector shell is incomplete.');

  if (!hasCompleteFirebaseConfig(config)) {
    message.textContent = 'FamilyHub login configuration is unavailable.';
    signIn.hidden = true;
    refresh.hidden = true;
    signOut.hidden = true;
    return;
  }

  const session = new FirebaseHouseholdSession(config);
  let inspectorMounted = false;

  select.addEventListener('change', () => {
    if (!inspectorMounted) return;
    const run = runs.find((candidate) => candidate.runId === select.value) ?? runs[0];
    renderRun(app, run);
  });

  session.subscribe((status) => {
    const connected = status.connection === 'connected';
    authShell.hidden = connected;
    app.hidden = !connected;
    if (connected && !inspectorMounted) {
      renderSelector(select, runs);
      renderRun(app, runs[0]);
      inspectorMounted = true;
    }
    message.textContent = authMessage(status);
    signIn.hidden = status.connection !== 'signed-out' && !(status.connection === 'error' && !status.email);
    refresh.hidden = status.connection !== 'pending' && !(status.connection === 'error' && Boolean(status.email));
    signOut.hidden = !status.email;
  });

  signIn.addEventListener('click', () => void session.signInWithGoogle());
  refresh.addEventListener('click', () => void session.refreshAccess());
  signOut.addEventListener('click', () => void session.signOut());
  window.addEventListener('beforeunload', () => session.dispose(), { once: true });
}
