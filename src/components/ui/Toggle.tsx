interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        fontSize: 11,
        color: checked ? "var(--color-green)" : "var(--color-text-dim)",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: 32,
          height: 16,
          borderRadius: 8,
          background: checked
            ? "rgba(0, 255, 65, 0.3)"
            : "rgba(255, 255, 255, 0.1)",
          border: `1px solid ${checked ? "var(--color-green)" : "rgba(255,255,255,0.2)"}`,
          position: "relative",
          transition: "all 0.2s",
        }}
        onClick={() => onChange(!checked)}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            background: checked ? "var(--color-green)" : "#666",
            position: "absolute",
            top: 1,
            left: checked ? 17 : 1,
            transition: "left 0.2s",
          }}
        />
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ display: "none" }}
      />
      {label}
    </label>
  );
}
