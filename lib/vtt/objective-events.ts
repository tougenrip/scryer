export const VTT_OBJECTIVES_CHANGED_EVENT = "scryer:vtt-objectives-changed";

export function notifyVttObjectivesChanged(campaignId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(VTT_OBJECTIVES_CHANGED_EVENT, {
      detail: { campaignId },
    })
  );
}
