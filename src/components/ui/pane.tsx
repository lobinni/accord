import type { ReactNode } from "react";

export function Pane({
  label,
  right,
  children,
  raised = false,
  className = "",
}: {
  label?: string;
  right?: ReactNode;
  children: ReactNode;
  raised?: boolean;
  className?: string;
}) {
  return (
    <section className={`pane ${raised ? "pane--raised" : ""} ${className}`}>
      {label && (
        <header className="pane-head">
          <span className={`label ${raised ? "label--mint" : ""}`}>{label}</span>
          {right}
        </header>
      )}
      <div className="pane-body">{children}</div>
    </section>
  );
}
