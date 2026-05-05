export const VTT_COMBAT_CHANGED_EVENT = "scryer:vtt-combat-changed";

export type VttCombatChangedDetail = {
  campaignId: string;
  mapId?: string | null;
  encounterId?: string | null;
  active?: boolean;
};

export function notifyVttCombatChanged(detail: VttCombatChangedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<VttCombatChangedDetail>(VTT_COMBAT_CHANGED_EVENT, {
      detail,
    })
  );
}
