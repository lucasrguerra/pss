// Legend items ordered as they appear in a typical lifecycle
const ITEMS: { label: string; cssVar: string; textClass: string }[] = [
  { label: "New",           cssVar: "var(--color-state-new)",        textClass: "text-white" },
  { label: "Ready",         cssVar: "var(--color-state-ready)",       textClass: "text-slate-900" },
  { label: "Running",       cssVar: "var(--color-state-running)",     textClass: "text-slate-900" },
  { label: "Waiting (I/O)", cssVar: "var(--color-state-waiting)",     textClass: "text-slate-900" },
  { label: "Terminated",    cssVar: "var(--color-state-terminated)",  textClass: "text-slate-900" },
  { label: "Context Switch",cssVar: "var(--color-state-ctx)",         textClass: "text-white" },
];

const GanttLegend = () => (
  <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-3 border-t border-slate-700/60">
    {ITEMS.map(({ label, cssVar, textClass }) => (
      <div key={label} className="flex items-center gap-1.5">
        <span
          className={`inline-block rounded-sm ${textClass}`}
          style={{ width: 14, height: 14, background: cssVar, flexShrink: 0 }}
        />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
    ))}
  </div>
);

export default GanttLegend;
