export type CheckoutDraftValue = number | boolean;
export type CheckoutDraftSnapshot = Record<string, CheckoutDraftValue>;

type SaveHandlers<Result> = {
  saved: (result: Result) => void;
  failed: (error: unknown) => void;
};

/** Keeps optimistic checkout edits visible while serializing immutable remote writes. */
export class CheckoutDraftSync<Result> {
  private authoritative: CheckoutDraftSnapshot = {};
  private displayed: CheckoutDraftSnapshot = {};
  private mealId: string | null = null;
  private revision = 0;
  private readonly pending = new Map<number, string>();
  private queue: Promise<void> = Promise.resolve();

  get value(): CheckoutDraftSnapshot { return { ...this.displayed }; }

  hasPending(mealId: string) { return [...this.pending.values()].includes(mealId); }

  sync(mealId: string, authoritative: CheckoutDraftSnapshot) {
    const takeOver = this.mealId !== mealId || !this.hasPending(mealId);
    this.mealId = mealId;
    this.authoritative = { ...authoritative };
    if (takeOver) this.displayed = { ...authoritative };
    return this.value;
  }

  clear() {
    this.mealId = null;
    this.authoritative = {};
    this.displayed = {};
  }

  edit(mealId: string, next: CheckoutDraftSnapshot, save: (snapshot: CheckoutDraftSnapshot) => Promise<Result>, handlers: SaveHandlers<Result>) {
    this.mealId = mealId;
    this.displayed = { ...next };
    const revision = ++this.revision;
    const snapshot = { ...next };
    this.pending.set(revision, mealId);
    this.queue = this.queue.catch(() => undefined).then(async () => {
      try {
        const result = await save(snapshot);
        this.pending.delete(revision);
        if (this.mealId === mealId && revision === this.revision) handlers.saved(result);
      } catch (error) {
        this.pending.delete(revision);
        if (this.mealId === mealId && revision === this.revision) {
          this.displayed = { ...this.authoritative };
          handlers.failed(error);
        }
      }
    });
    return this.value;
  }

  whenIdle() { return this.queue; }
}
