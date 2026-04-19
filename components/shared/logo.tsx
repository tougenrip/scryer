import { ScryerMark } from "./scryer-mark";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <ScryerMark size={26} />
      <div className="leading-tight">
        <div
          className="font-serif"
          style={{ fontSize: 16, letterSpacing: "0.04em" }}
        >
          SCRYER
        </div>
        <div
          className="text-muted-foreground"
          style={{ fontSize: 10, marginTop: -2 }}
        >
          D&amp;D 5e digital suite
        </div>
      </div>
    </div>
  );
}
