// Story-timeline data and layout, ported unchanged from the approved prototype
// (CodexTasks sm-visuals/timeline-claude/template.html). The data is built by
// novel-knowledge-base site/timeline.py and read from the private Firebase mirror.

export interface NovelTimelineOwner { id: string; domain: string; name: string; desc: string; pts: [string, string, number][]; }
export interface NovelTimelinePoint {
  r: number; b: number; t: string; title: string; time: string; end: string; pt: string; story: string;
  roles: Record<string, string>; locs: string[];
}
export interface NovelTimelineData {
  bands: string[]; axis: string[]; axisLabel: string; defaultOn: string[];
  domains: [string, string][]; owners: NovelTimelineOwner[]; points: Record<string, NovelTimelinePoint>;
}

export interface TimelineLine extends NovelTimelineOwner { axis: boolean; text: Record<string, string>; color: string; dash: string; }
export interface TimelineModel {
  data: NovelTimelineData;
  axis: Set<string>;
  lines: Record<string, TimelineLine>;
  ordered: TimelineLine[];
  ownersOf: Record<string, string[]>;
  keyPoints: Set<string>;
}

export interface Excursion { o: string; s: number; e: number; open0: boolean; open1: boolean; pts: string[]; slot: Record<number, number>; }
export interface TimelineLayout {
  sel: TimelineLine[]; axisPts: Set<string>; pts: string[]; idx: Record<string, number>; primary: Record<string, string>;
  exc: Excursion[]; excOf: Record<string, number>; seqs: Record<string, string[]>;
  rowMax: number[]; textMax: number[]; gapMax: number[];
}

export const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
export const DASHES = ['', '7 4', '2 4', '10 3 2 3', '1 3', '12 5'];

/** The sync stores the timeline as one JSON string; anything else means it has not been synced. */
export function parseTimelineData(value: unknown): NovelTimelineData | null {
  if (typeof value !== 'string') return null;
  try {
    const data = JSON.parse(value);
    const lists = ['bands', 'axis', 'defaultOn', 'domains', 'owners'].every((key) => Array.isArray(data?.[key]));
    if (!lists || !data.points || typeof data.points !== 'object') return null;
    return { ...data, axisLabel: typeof data.axisLabel === 'string' ? data.axisLabel : '' };
  } catch {
    return null;
  }
}

export function buildModel(data: NovelTimelineData): TimelineModel {
  const axis = new Set(data.axis);
  const lines: Record<string, TimelineLine> = {};
  let k = 0;
  const ordered = data.owners.map((owner) => {
    const line: TimelineLine = { ...owner, axis: axis.has(owner.id), text: {}, color: '', dash: '' };
    owner.pts.forEach(([pid, text]) => { line.text[pid] = text; });
    // Colour and dash follow the Owner, never the current selection.
    if (!line.axis) { line.color = COLORS[k % 8]; line.dash = DASHES[Math.floor(k / 8) % DASHES.length]; k++; }
    lines[owner.id] = line;
    return line;
  });
  const ownersOf: Record<string, string[]> = {};
  data.owners.forEach((owner) => owner.pts.forEach(([pid]) => { (ownersOf[pid] ||= []).push(owner.id); }));
  const keyPoints = new Set<string>();
  ordered.filter((line) => line.axis).forEach((line) => line.pts.forEach(([pid, , key]) => { if (key) keyPoints.add(pid); }));
  return { data, axis, lines, ordered, ownersOf, keyPoints };
}

export function layoutTimeline(model: TimelineModel, selected: Set<string>): TimelineLayout {
  const { data } = model;
  const sel = model.ordered.filter((o) => selected.has(o.id) && !o.axis);
  const axisPts = new Set<string>();
  model.ordered.filter((o) => o.axis).forEach((o) => o.pts.forEach((p) => axisPts.add(p[0])));
  const vis = new Set(axisPts); sel.forEach((o) => o.pts.forEach((p) => vis.add(p[0])));
  const pts = [...vis].sort((a, b) => data.points[a].r - data.points[b].r);
  const idx: Record<string, number> = {}; pts.forEach((p, i) => { idx[p] = i; });
  // primary line of each off-axis point: first selected Owner (INDEX order) that has it
  const primary: Record<string, string> = {};
  sel.forEach((o) => o.pts.forEach((p) => { if (!axisPts.has(p[0]) && !primary[p[0]]) primary[p[0]] = o.id; }));
  // excursions: maximal runs of off-axis points, spanning from the axis contact before to the one after
  const exc: Excursion[] = [], seqs: Record<string, string[]> = {};
  for (const o of sel) {
    const seq = o.pts.map((p) => p[0]).sort((a, b) => idx[a] - idx[b]); seqs[o.id] = seq;
    let i = 0;
    while (i < seq.length) {
      if (axisPts.has(seq[i])) { i++; continue; }
      let j = i; while (j + 1 < seq.length && !axisPts.has(seq[j + 1])) j++;
      exc.push({ o: o.id, s: i > 0 ? idx[seq[i - 1]] : idx[seq[i]], e: j < seq.length - 1 ? idx[seq[j + 1]] : idx[seq[j]],
        open0: i === 0, open1: j === seq.length - 1, pts: seq.slice(i, j + 1), slot: {} });
      i = j + 1;
    }
  }
  exc.sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));
  // Pack row by row. Lines that rejoin the axis sooner sit nearer to it, so short
  // detours hug the axis and long independent stretches drift outward; lines
  // move inward when others end.
  const excOf: Record<string, number> = {};
  exc.forEach((x, k) => x.pts.forEach((p) => { if (primary[p] === x.o) excOf[p] = k; }));
  const rowMax = new Array<number>(pts.length).fill(-1);
  let active: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    active = active.filter((k) => exc[k].e >= i);
    exc.forEach((x, k) => { if (x.s === i) active.push(k); });
    active.sort((m, n) => exc[m].e - exc[n].e || exc[n].s - exc[m].s);
    active.forEach((k, pos) => { exc[k].slot[i] = pos; });
    rowMax[i] = active.length - 1;
  }
  // text indent: widest line set within two rows either side, so the text edge moves rarely
  const near = (i: number) => Math.max(...[-2, -1, 0, 1, 2].map((d) => (i + d >= 0 && i + d < rowMax.length ? rowMax[i + d] : -1)));
  const textMax = rowMax.map((_, i) => near(i));
  const gapMax = rowMax.map((_, i) => Math.max(textMax[i], (i + 1 < textMax.length ? textMax[i + 1] : -1)));
  return { sel, axisPts, pts, idx, primary, exc, excOf, seqs, rowMax, textMax, gapMax };
}

// Smooth line through row samples: straight while the slot holds, an S-bend where it moves.
export function smooth(samples: [number, number][]): string {
  let d = `M${samples[0][0]},${samples[0][1]}`;
  for (let i = 1; i < samples.length; i++) {
    const [x0, y0] = samples[i - 1], [x1, y1] = samples[i];
    if (Math.abs(x0 - x1) < .5) { d += `L${x1},${y1}`; continue; }
    const m = Math.min(y1 - y0, 34), ys = y1 - m;   // bend over the last stretch before the row
    d += `L${x0},${ys}C${x0},${ys + m * .55} ${x1},${ys + m * .45} ${x1},${y1}`;
  }
  return d;
}
