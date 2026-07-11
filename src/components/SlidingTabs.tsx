'use client';

// Segmented control with a pill that physically slides to the active tab
// instead of the selection jumping between buttons. Buttons stay above the
// pill (z-10) so labels are always clickable/readable.
export default function SlidingTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: ReadonlyArray<{ key: T; label: string }>;
  active: T;
  onChange: (key: T) => void;
}) {
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === active));

  return (
    <div className="relative flex gap-0 bg-background border border-surface-border rounded-[10px] p-1">
      <div
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-lg bg-surface-1 shadow-sm transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
        style={{
          width: `calc((100% - 8px) / ${tabs.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          aria-pressed={active === t.key}
          className={`relative z-10 flex-1 text-center py-2 rounded-lg text-[13px] transition-colors duration-200 ${
            active === t.key ? 'font-bold text-foreground' : 'font-semibold text-muted'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
