import type { ReactNode } from "react";

export function SectionSeparator({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-auto bg-card">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-px bg-border/70"
      />
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-muted/25 to-transparent"
      />
      {children}
    </div>
  );
}
