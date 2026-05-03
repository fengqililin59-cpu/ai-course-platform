const DISTRIBUTION_REFS_KEY = "distribution_refs_v1";
const PENDING_REF_KEY = "distribution_pending_ref_json";

export type PendingDistributionRef = { ref: string; courseId: string };

export function readDistributionRefMap(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(DISTRIBUTION_REFS_KEY);
    const o = raw ? (JSON.parse(raw) as unknown) : {};
    if (typeof o === "object" && o !== null && !Array.isArray(o)) {
      return o as Record<string, string>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function saveDistributionRefForCourse(courseId: string, ref: string) {
  const m = readDistributionRefMap();
  m[courseId] = ref.trim();
  sessionStorage.setItem(DISTRIBUTION_REFS_KEY, JSON.stringify(m));
}

export function getDistributionRefForCourse(courseId: string): string | undefined {
  const v = readDistributionRefMap()[courseId];
  const t = v != null ? String(v).trim() : "";
  return t || undefined;
}

export function setPendingDistributionRef(ref: string, courseId: string) {
  const payload: PendingDistributionRef = {
    ref: ref.trim(),
    courseId: courseId.trim(),
  };
  sessionStorage.setItem(PENDING_REF_KEY, JSON.stringify(payload));
}

export function consumePendingDistributionRefForCourse(courseId: string) {
  const raw = sessionStorage.getItem(PENDING_REF_KEY);
  if (!raw) return;
  try {
    const o = JSON.parse(raw) as Partial<PendingDistributionRef>;
    if (
      o.courseId === courseId &&
      o.ref &&
      String(o.ref).trim().length > 0
    ) {
      saveDistributionRefForCourse(courseId, String(o.ref).trim());
      sessionStorage.removeItem(PENDING_REF_KEY);
    }
  } catch {
    /* ignore */
  }
}
