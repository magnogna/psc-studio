import { useRef, useState } from "react";
import { addDays, diffDays, fmtIt, type GanttRow } from "@/lib/dsf2/gantt";
import { mutate } from "@/lib/dsf2/store";

const DAY = 16;
const ROW = 30;

export function GanttChart({ rows, id, readOnly = false }: { rows: GanttRow[]; id: number; readOnly?: boolean }) {
  const dated = rows.filter((r) => r.start && !r.folder);
  const drag = useRef<{ row: GanttRow; x: number; mode: "move" | "resize"; orig: number } | null>(null);
  const [preview, setPreview] = useState<{ row: GanttRow; delta: number; mode: "move" | "resize" } | null>(null);
  if (!dated.length) return <p className="text-sm text-muted-foreground">Nessuna lavorazione con date nel cronoprogramma.</p>;
  const min = new Date(Math.min(...dated.map((r) => r.start!.getTime())));
  const max = new Date(Math.max(...dated.map((r) => addDays(r.start!, r.days).getTime())));
  const total = Math.max(14, diffDays(min, max) + 7);
  const width = total * DAY;
  const commit = (r: GanttRow, mode: "move" | "resize", delta: number) => {
    if (!r.task || !delta) return;
    mutate(id, () => {
      if (mode === "move") r.task!.setAttribute("DtInizio", fmtIt(addDays(r.start!, delta)));
      else r.task!.setAttribute("Durata", String(Math.max(1, r.days + delta)));
    });
  };
  const months: { x: number; label: string }[] = [];
  for (let d = 0; d < total; d++) {
    const dt = addDays(min, d);
    if (d === 0 || dt.getUTCDate() === 1) months.push({ x: d * DAY, label: dt.toLocaleDateString("it-IT", { month: "short", year: "numeric", timeZone: "UTC" }) });
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <svg width={width + 320} height={rows.length * ROW + 36} className="block select-none"
        onPointerMove={(e) => { const d = drag.current; if (d) setPreview({ row: d.row, mode: d.mode, delta: Math.round((e.clientX - d.x) / DAY) }); }}
        onPointerUp={() => { const d = drag.current; if (d && preview) commit(d.row, d.mode, preview.delta); drag.current = null; setPreview(null); }}
        onPointerLeave={() => { drag.current = null; setPreview(null); }}
      >
        {months.map((m, i) => (
          <g key={i}><line x1={m.x} x2={m.x} y1={0} y2={rows.length * ROW + 36} className="stroke-grid-line" /><text x={m.x + 4} y={14} className="fill-muted-foreground text-[10px]">{m.label}</text></g>
        ))}
        {Array.from({ length: Math.ceil(total / 7) }, (_, w) => <line key={w} x1={w * 7 * DAY} x2={w * 7 * DAY} y1={22} y2={rows.length * ROW + 36} className="stroke-grid-line" strokeDasharray="2 3" />)}
        {rows.map((r, i) => {
          const y = 30 + i * ROW;
          if (!r.start || r.folder) return <text key={i} x={4} y={y + 18} className="fill-foreground text-[11px] font-semibold">{r.title}</text>;
          let s = diffDays(min, r.start);
          let w = r.days;
          if (preview?.row === r) { if (preview.mode === "move") s += preview.delta; else w = Math.max(1, w + preview.delta); }
          return (
            <g key={i}>
              <rect x={s * DAY} y={y + 6} width={w * DAY} height={ROW - 12} rx={3} className={`fill-primary ${readOnly ? "" : "cursor-grab"}`}
                onPointerDown={readOnly ? undefined : (e) => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { row: r, x: e.clientX, mode: "move", orig: s }; }} />
              {!readOnly && <rect x={(s + w) * DAY - 6} y={y + 6} width={6} height={ROW - 12} className="cursor-ew-resize fill-accent-foreground/40"
                onPointerDown={(e) => { e.stopPropagation(); drag.current = { row: r, x: e.clientX, mode: "resize", orig: w }; }} />}
              <text x={(s + w) * DAY + 6} y={y + 19} className="fill-foreground text-[10px]">{r.title.slice(0, 60)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

