// Story-timeline view of the Novel Archive page: the approved prototype's page and
// interaction, scoped to one container. Styles live in src/styles/novelTimeline.css.
import {
  buildModel, layoutTimeline, smooth,
  type NovelTimelineData, type TimelineLayout, type TimelineLine,
} from './novelTimelineModel.ts';

export interface NovelTimelineState { sel: Set<string>; open: Set<string>; z: number; scrollY: number | null; }
/** Reader URL for a compiled page and fragment, or null when that page was not synced. */
export type ReaderHref = (path: string, hash: string) => string | null;

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const narrow = () => window.innerWidth <= 820;
const LOCATOR = /^C(\d+)#P(\d+)/;

const shell = `<div class="nt">
  <aside class="panel" data-nt="panel" aria-label="线路选择"></aside>
  <div class="scrim" data-nt="scrim"></div>
  <div class="main">
    <div class="bar" data-nt="bar">
      <div class="tools">
        <button type="button" class="btn primary lines-btn" data-nt="lines" aria-expanded="false">线路</button>
        <h2>故事时间线</h2>
        <span class="sp"></span>
        <div class="zoom">
          <button type="button" class="btn" data-nt="zout" aria-label="缩小">−</button>
          <input type="range" data-nt="zrange" min="25" max="220" value="100" aria-label="缩放">
          <button type="button" class="btn" data-nt="zin" aria-label="放大">＋</button>
          <button type="button" class="btn" data-nt="zfit">总览</button>
        </div>
      </div>
      <div class="strip" data-nt="strip" aria-hidden="true"></div>
    </div>
    <div class="tl" data-nt="tl"><svg data-nt="g" aria-hidden="true"></svg><div data-nt="rows"></div></div>
  </div>
</div>`;

function swatch(o: TimelineLine, w = 22) {
  if (o.axis) return `<svg class="sw" width="${w}" height="10" aria-hidden="true"><line x1="1" y1="5" x2="${w - 1}" y2="5" stroke="var(--axis)" stroke-width="4" stroke-linecap="round"/></svg>`;
  return `<svg class="sw" width="${w}" height="10" aria-hidden="true"><line x1="1" y1="5" x2="${w - 1}" y2="5" stroke="${o.color}" stroke-width="3" stroke-dasharray="${o.dash}" stroke-linecap="${o.dash ? 'butt' : 'round'}"/></svg>`;
}

export function mountNovelTimeline(root: HTMLElement, data: NovelTimelineData, readerHref: ReaderHref, saved?: NovelTimelineState) {
  const model = buildModel(data);
  const { lines: OWN, ownersOf: OWNERS_OF, keyPoints: KEYPT } = model;
  const st: NovelTimelineState = saved ?? { sel: new Set(data.defaultOn.filter((id) => OWN[id])), open: new Set(), z: 1, scrollY: null };
  root.innerHTML = shell;
  const part = <T extends Element>(name: string) => root.querySelector<T>(`[data-nt="${name}"]`)!;
  const panel = part<HTMLElement>('panel'), scrim = part<HTMLElement>('scrim'), linesBtn = part<HTMLButtonElement>('lines');
  const bar = part<HTMLElement>('bar'), strip = part<HTMLElement>('strip'), tl = part<HTMLElement>('tl');
  const svg = part<SVGSVGElement>('g'), rowsEl = part<HTMLElement>('rows'), zRange = part<HTMLInputElement>('zrange');
  const cleanups: (() => void)[] = [];
  const on = <E extends Event>(target: EventTarget, type: string, fn: (event: E) => void, options?: AddEventListenerOptions) => {
    target.addEventListener(type, fn as EventListener, options);
    cleanups.push(() => target.removeEventListener(type, fn as EventListener, options));
  };

  /* ---------------- links into the reader ---------------- */
  const domainOfPrefix: Record<string, string> = {};
  model.ordered.forEach((o) => { domainOfPrefix[o.id.split('-')[0]] = o.domain; });
  const ownerPath = (id: string, page: string) => {
    const domain = OWN[id]?.domain ?? domainOfPrefix[id.split('-')[0]];
    return domain ? `owners/${domain}/${id}/${page}` : null;
  };
  const pointNames: Record<string, string[]> = {};
  Object.keys(data.points).forEach((pid) => { const [eid, name] = pid.split('@'); if (name) (pointNames[eid] ||= []).push(name); });
  // `label` is already HTML; without a synced page it stays plain text.
  const link = (label: string, path: string | null, hash = '', cls = '') => {
    const href = path ? readerHref(path, hash) : null;
    const attr = cls ? ` class="${cls}"` : '';
    if (!href) return cls ? `<span${attr}>${label}</span>` : label;
    return `<a${attr} href="${esc(href)}" data-doc-path="${esc(path)}" data-doc-hash="${esc(hash)}">${label}</a>`;
  };
  const linkEvents = (text: string) => esc(text).replace(/(E-\d{4})((?:@[^\s，。；、：:,;（）()“”「」]+)?)/g, (all, eid: string, at: string) => {
    const name = at ? (pointNames[eid] ?? []).filter((n) => at.slice(1).startsWith(n)).sort((a, b) => b.length - a.length)[0] : '';
    const label = name ? `${eid}@${name}` : eid;
    return link(label, `events/${eid}.md`, name ? `#at-${name}` : '') + all.slice(label.length);
  });

  /* ---------------- Owner panel ---------------- */
  const renderPanel = () => {
    let h = `<h3>线路选择</h3><div class="global"><button type="button" class="btn" data-all="1">全部全选</button><button type="button" class="btn" data-all="0">全部清空</button></div>`;
    for (const [dom, label] of data.domains) {
      const list = model.ordered.filter((o) => o.domain === dom); if (!list.length) continue;
      h += `<div class="dom"><b>${esc(label)} <span class="n">${list.length}</span></b><button type="button" class="btn" data-dom="${esc(dom)}" data-v="1" aria-label="${esc(label)}全选">全选</button><button type="button" class="btn" data-dom="${esc(dom)}" data-v="0" aria-label="${esc(label)}全不选">全不选</button></div>`;
      for (const o of list) {
        const ax = o.axis;
        h += `<label class="own" title="${esc(o.desc)}"><input type="checkbox" data-o="${esc(o.id)}" ${ax || st.sel.has(o.id) ? 'checked' : ''} ${ax ? 'disabled' : ''}>${swatch(o)}<span class="nm">${esc(o.name)}</span>${ax ? '<span class="tag">主轴</span>' : `<span class="ct">${o.pts.length}</span>`}</label>`;
      }
    }
    panel.innerHTML = h;
    linesBtn.textContent = `线路 ${st.sel.size}`;
  };
  on<Event>(panel, 'change', (e) => {
    const input = e.target as HTMLInputElement; const id = input.dataset.o; if (!id) return;
    if (input.checked) st.sel.add(id); else st.sel.delete(id);
    renderPanel(); render();
    panel.querySelector<HTMLInputElement>(`input[data-o="${CSS.escape(id)}"]`)?.focus();
  });
  on<MouseEvent>(panel, 'click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button'); if (!b) return;
    const all = b.dataset.all !== undefined;
    const value = all ? b.dataset.all : b.dataset.v;
    model.ordered.filter((o) => !o.axis && (all || o.domain === b.dataset.dom))
      .forEach((o) => (value === '1' ? st.sel.add(o.id) : st.sel.delete(o.id)));
    renderPanel(); render();
  });
  const setDrawer = (open: boolean) => {
    panel.classList.toggle('show', open); scrim.classList.toggle('show', open);
    linesBtn.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector<HTMLElement>('button, input:not([disabled])')?.focus();
  };
  on(linesBtn, 'click', () => setDrawer(true));
  on(scrim, 'click', () => setDrawer(false));
  on<KeyboardEvent>(root, 'keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('show')) { setDrawer(false); linesBtn.focus(); } });

  /* ---------------- render ---------------- */
  type Geom = { axisX: number; laneW: number; rh: number };
  let L: { lay: TimelineLayout; g: Geom; X: (l: number) => number; y: Record<string, number> } | null = null;
  const geom = (): Geom => {
    const z = st.z, n = narrow();
    return { axisX: n ? 14 : 22, laneW: (n ? 13 : 18) * Math.min(1.4, Math.max(.75, z)), rh: Math.max(7, 30 * z) };
  };

  const render = () => {
    const lay = layoutTimeline(model, st.sel), g = geom(), z = st.z;
    const overview = z < .55;
    tl.classList.toggle('overview', overview);
    const fs = Math.round(Math.min(16, Math.max(11, 13 * Math.sqrt(z))));
    tl.style.setProperty('--fs', `${fs}px`);
    tl.style.setProperty('--lh', `${fs * 1.45}px`);
    tl.style.setProperty('--rh', `${g.rh}px`);
    tl.style.setProperty('--rp', overview ? '0px' : `${Math.max(2, (g.rh - fs * 1.45) / 2)}px`);
    const X = (l: number) => (l < 0 ? g.axisX : g.axisX + (l + 1) * g.laneW);
    const pad = (l: number) => X(l) + (overview ? 8 : 12);
    let h = '', lastBand = -1;
    lay.pts.forEach((pid, i) => {
      const P = data.points[pid];
      if (P.b !== lastBand) { lastBand = P.b; h += `<div class="band" style="padding-left:${pad(lay.textMax[i])}px"><b>${esc(data.bands[P.b])}</b></div>`; }
      const onAxis = lay.axisPts.has(pid);
      const lines = (OWNERS_OF[pid] || []).filter((id) => st.sel.has(id) && !OWN[id].axis);
      const owner = onAxis ? null : OWN[lay.primary[pid]];
      const text = owner ? (owner.text[pid] || P.t) : P.t;
      const who = lines.map((id) => `<i style="background:${OWN[id].color}">${esc(OWN[id].name)}</i>`).join('');
      const open = st.open.has(pid);
      h += `<div class="row${open ? ' open' : ''}" data-p="${esc(pid)}" role="button" tabindex="0" aria-expanded="${open}" style="padding-left:${pad(lay.textMax[i])}px">` +
           (KEYPT.has(pid) ? '<span class="key">★</span>' : '') +
           (who ? `<span class="who">${who}</span>` : '') +
           `<span class="tx">${esc(text)}</span><span class="id">${esc(pid)}</span></div>`;
      if (open) h += card(pid, pad(lay.gapMax[i]));
    });
    rowsEl.innerHTML = h;
    // node y = centre of the row's first text line
    const y: Record<string, number> = {};
    for (const r of rowsEl.children as HTMLCollectionOf<HTMLElement>) if (r.dataset.p) {
      const cs = getComputedStyle(r);
      y[r.dataset.p] = r.offsetTop + (overview ? r.offsetHeight / 2 : parseFloat(cs.paddingTop) + parseFloat(cs.lineHeight) / 2);
    }
    drawGraph(lay, g, X, y);
    L = { lay, g, X, y };
    updateStrip();
  };

  const drawGraph = (lay: TimelineLayout, g: Geom, X: (l: number) => number, y: Record<string, number>) => {
    svg.setAttribute('width', String(tl.offsetWidth)); svg.setAttribute('height', String(rowsEl.offsetHeight));
    const xOf = (p: string) => (lay.axisPts.has(p) ? g.axisX : X(lay.exc[lay.excOf[p]].slot[lay.idx[p]]));
    let under = '', lines = '', nodes = '';
    const axisList = lay.pts.filter((p) => lay.axisPts.has(p));
    if (axisList.length) lines += `<line x1="${g.axisX}" y1="${y[axisList[0]]}" x2="${g.axisX}" y2="${y[axisList[axisList.length - 1]]}" stroke="var(--axis)" stroke-width="4" stroke-linecap="round"/>`;
    // Only the off-axis stretches are drawn; where a line runs with the axis, the axis alone shows.
    for (const x of lay.exc) {
      const o = OWN[x.o], own = new Set(x.pts), samples: [number, number][] = [];
      for (let i = x.s; i <= x.e; i++) {
        const p = lay.pts[i];
        let sx;
        if ((i === x.s && !x.open0) || (i === x.e && !x.open1)) sx = g.axisX;          // touches the axis
        else if (own.has(p) && lay.primary[p] !== x.o) sx = xOf(p);                    // meets another line's node
        else sx = X(x.slot[i]);
        samples.push([sx, y[p]]);
      }
      if (samples.length > 1) {
        const d = smooth(samples);
        under += `<path d="${d}" fill="none" stroke="var(--surface)" stroke-width="6"/>`;
        lines += `<path d="${d}" fill="none" stroke="${o.color}" stroke-width="2.5" stroke-dasharray="${o.dash}" stroke-linecap="round"/>`;
      }
      if (x.open0) nodes += `<circle cx="${samples[0][0]}" cy="${samples[0][1] - 9}" r="2.5" fill="${o.color}"/>`;
      if (x.open1) { const [ex, ey] = samples[samples.length - 1]; nodes += `<line x1="${ex - 4}" y1="${ey + 9}" x2="${ex + 4}" y2="${ey + 9}" stroke="${o.color}" stroke-width="2.5"/>`; }
    }
    for (const p of lay.pts) {
      const cx = xOf(p), cy = y[p];
      const ax = lay.axisPts.has(p);
      const shared = (OWNERS_OF[p] || []).filter((id) => st.sel.has(id) && !OWN[id].axis);
      const fill = ax ? 'var(--axis)' : OWN[lay.primary[p]].color;
      const r = (st.z < .55 ? .6 : 1) * ((ax && KEYPT.has(p)) ? 6.5 : 5);
      const meet = !ax && shared.length > 1;
      nodes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${meet ? 'var(--axis)' : 'var(--surface)'}" stroke-width="${meet ? 2.5 : 2}"/>`;
      if (ax && shared.length && st.z >= .55) nodes += `<circle cx="${cx}" cy="${cy}" r="${r + 3.5}" fill="none" stroke="${OWN[shared[0]].color}" stroke-width="1.5" stroke-dasharray="${OWN[shared[0]].dash}"/>`;
      if (st.open.has(p)) nodes += `<circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
      nodes += `<circle class="hit" data-p="${esc(p)}" cx="${cx}" cy="${cy}" r="12" fill="transparent"/>`;
    }
    svg.innerHTML = under + lines + nodes;
  };

  const card = (pid: string, padLeft: number) => {
    const P = data.points[pid], [eid, pname] = pid.split('@');
    const all = OWNERS_OF[pid] || [];
    const persp = all.filter((id) => OWN[id].text[pid]).map((id) => `<div><span class="oc">${swatch(OWN[id], 14)}<b>${link(esc(OWN[id].name), ownerPath(id, 'TIMELINE_INDEX.md'))}</b></span>${linkEvents(OWN[id].text[pid])}</div>`).join('');
    const roles = Object.entries(P.roles || {}).map(([id, t]) => `<div><b>${link(esc(id.split('-').slice(1).join('-')), ownerPath(id, 'START_HERE.md'))}</b>：${linkEvents(t)}</div>`).join('');
    let dl = '';
    if (pname && P.pt) dl += `<dt>此点</dt><dd>${linkEvents(P.pt)}</dd>`;
    if (P.time) dl += `<dt>${pname ? '整件事时间' : '时间'}</dt><dd>${linkEvents(P.time)}</dd>`;
    if (P.end && !pname) dl += `<dt>结束</dt><dd>${linkEvents(P.end)}</dd>`;
    if (P.story) dl += `<dt>经过</dt><dd>${linkEvents(P.story)}</dd>`;
    if (roles) dl += `<dt>参与</dt><dd>${roles}</dd>`;
    if (persp) dl += `<dt>各线</dt><dd class="persp">${persp}</dd>`;
    const locs = P.locs || [];
    if (locs.length) dl += `<dt>出处</dt><dd>${locs.map((l) => { const m = LOCATOR.exec(l); return link(esc(l), m ? `source/C${m[1]}.md` : null, m ? `#p${m[2]}` : '', 'loc'); }).join('')}</dd>`;
    const heading = link(`${esc(P.title)}${pname ? ` · ${esc(pname)}` : ''}`, `events/${eid}.md`, pname ? `#at-${pname}` : '');
    return `<div class="card" style="margin-left:${padLeft}px" data-card="${esc(pid)}"><h4>${heading}</h4>` +
      `<div class="meta">${esc(pid)} · ${esc(data.bands[P.b])}</div><dl>${dl}</dl></div>`;
  };

  /* ---------------- node toggle ---------------- */
  const rowEl = (pid: string) => [...rowsEl.children as HTMLCollectionOf<HTMLElement>].find((r) => r.dataset.p === pid) ?? null;
  const rowTop = (pid: string) => rowEl(pid)?.getBoundingClientRect().top ?? null;
  const toggle = (pid: string) => {
    if (st.open.has(pid)) st.open.delete(pid); else st.open.add(pid);
    const before = rowTop(pid);
    render();
    const after = rowTop(pid);
    if (before != null && after != null) window.scrollBy({ top: after - before, behavior: 'instant' });   // keep the clicked row in place
  };
  on<MouseEvent>(tl, 'click', (e) => {
    const target = e.target as Element;
    if (target.closest('.card')) return;
    const t = target.closest<HTMLElement | SVGElement>('[data-p]'); if (t?.dataset.p) toggle(t.dataset.p);
  });
  on<KeyboardEvent>(tl, 'keydown', (e) => {
    const row = (e.target as Element).closest<HTMLElement>('.row');
    if (!row?.dataset.p || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); toggle(row.dataset.p); rowEl(row.dataset.p)?.focus({ preventScroll: true });
  });

  /* ---------------- sticky line names ---------------- */
  const updateStrip = () => {
    if (!L) return;
    const { lay, g, X, y } = L;
    const tlTop = tl.getBoundingClientRect().top + window.scrollY;
    const yy = window.scrollY + bar.offsetHeight - tlTop + 8;   // timeline y just below the sticky bar
    const yi = (i: number) => y[lay.pts[i]];
    let row = 0; while (row + 1 < lay.pts.length && yi(row + 1) <= yy) row++;
    const active = lay.exc.filter((x) => yi(x.s) <= yy && yy <= yi(x.e) && x.slot[row] !== undefined).sort((a, b) => a.slot[row] - b.slot[row]);
    const off = new Set(active.map((x) => x.o));
    const merged = lay.sel.filter((o) => { const s = lay.seqs[o.id]; return !off.has(o.id) && y[s[0]] <= yy && yy <= y[s[s.length - 1]]; });
    let h = '', left = 0;
    const axisName = `主轴 ${data.axisLabel}` + (merged.length ? ` ＋ ${merged.map((o) => o.name).join('、')}` : '');
    h += `<div class="tick" style="left:${g.axisX - 1}px;border-color:var(--axis)"></div>`;
    const chips = [{ x: g.axisX, html: `<span class="chip axis" style="LEFT">${esc(axisName)}</span>` }];
    active.forEach((x) => {
      const o = OWN[x.o];
      h += `<div class="tick" style="left:${X(x.slot[row]) - 1}px;border-color:${o.color}"></div>`;
      chips.push({ x: X(x.slot[row]), html: `<span class="chip" style="LEFT">${swatch(o, 16)}${esc(o.name)}</span>` });
    });
    // chips keep lane order; each starts at its lane unless the previous chip is in the way
    strip.innerHTML = h + chips.map((c) => c.html.replace('LEFT', 'left:0;visibility:hidden')).join('');
    strip.querySelectorAll<HTMLElement>('.chip').forEach((el, i) => {
      const l = Math.max(Math.max(4, chips[i].x - 8), left);
      el.style.left = `${l}px`; el.style.visibility = 'visible'; left = l + el.offsetWidth + 4;
    });
  };
  let raf = 0;
  on(window, 'scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; updateStrip(); }); }, { passive: true });

  /* ---------------- zoom ---------------- */
  const setZoom = (value: number, anchorY?: number) => {
    const z = Math.min(2.2, Math.max(.25, value));
    if (Math.abs(z - st.z) < .005) return;
    // keep the row under the anchor (viewport y) where it is
    const ay = anchorY ?? bar.offsetHeight + 40;
    let anchor: string | null = null, offset = 0;
    for (const r of rowsEl.children as HTMLCollectionOf<HTMLElement>) {
      const b = r.getBoundingClientRect();
      if (r.dataset.p && b.bottom >= ay) { anchor = r.dataset.p; offset = b.top - ay; break; }
    }
    st.z = z; zRange.value = String(Math.round(z * 100));
    render();
    const r = anchor ? rowEl(anchor) : null;
    if (r) window.scrollBy({ top: r.getBoundingClientRect().top - ay - offset, behavior: 'instant' });
  };
  on<Event>(zRange, 'input', () => setZoom(Number(zRange.value) / 100));
  on(part('zin'), 'click', () => setZoom(st.z * 1.25));
  on(part('zout'), 'click', () => setZoom(st.z / 1.25));
  on(part('zfit'), 'click', () => {   // whole structure on one screen, as far as possible
    const avail = window.innerHeight - bar.offsetHeight - 40;
    const n = L ? L.lay.pts.length : 200;
    setZoom(Math.max(.25, Math.min(1, avail / (n * 30 * 1.15))), 0);
    const top = bar.parentElement!.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: 'instant' });
  });
  on<WheelEvent>(root, 'wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(st.z * Math.exp(-e.deltaY * 0.002), e.clientY); }, { passive: false });
  let pinch: { d: number; z: number; cy: number } | null = null;
  on<TouchEvent>(tl, 'touchstart', (e) => { if (e.touches.length === 2) { const [a, b] = e.touches; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: st.z, cy: (a.clientY + b.clientY) / 2 }; } }, { passive: true });
  on<TouchEvent>(tl, 'touchmove', (e) => { if (pinch && e.touches.length === 2) { e.preventDefault(); const [a, b] = e.touches; setZoom(pinch.z * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.d, pinch.cy); } }, { passive: false });
  on<TouchEvent>(tl, 'touchend', (e) => { if (e.touches.length < 2) pinch = null; });
  let rw = 0;
  on(window, 'resize', () => { clearTimeout(rw); rw = window.setTimeout(render, 120); });

  zRange.value = String(Math.round(st.z * 100));
  renderPanel(); render();
  if (st.scrollY != null) window.scrollTo({ top: st.scrollY, behavior: 'instant' });

  return {
    state: st,
    unmount() {
      st.scrollY = window.scrollY;
      cleanups.forEach((cleanup) => cleanup());
      cancelAnimationFrame(raf); clearTimeout(rw);
      root.replaceChildren();
    },
  };
}
