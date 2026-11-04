/**
 * A shade's indicative colour next to its code and name. The swatch is only a
 * hint: paint colours look different on screens (DESIGN_SYSTEM §9), so the
 * code and name are always shown as text.
 */
export function ShadeSwatch({
  shade,
}: {
  shade: { code: string; name: string; previewHex: string | null };
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="size-8 shrink-0 rounded-swatch border border-swatch-border"
        // Catalogue data, not a design token (DESIGN_SYSTEM §2).
        style={
          shade.previewHex ? { backgroundColor: shade.previewHex } : undefined
        }
      />
      <span className="flex flex-col">
        <span className="text-body font-semibold text-text-primary">
          {shade.code}
        </span>
        <span className="text-body text-text-secondary">{shade.name}</span>
      </span>
    </div>
  );
}
