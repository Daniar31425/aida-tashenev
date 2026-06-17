import { forwardRef } from "react";

export interface VacancyCardProps {
  position: string;
  description: string;
  requirements: string[];
  conditions: string[];
}

const RED = "#CC0000";
const BLACK = "#1a1a1a";
const GRAY = "#6b6b6b";
const DIVIDER = "#e5e5e5";

// 1080 x 1920 canvas, designed at native resolution. Use CSS transform to scale for preview.
export const VacancyCard = forwardRef<HTMLDivElement, VacancyCardProps>(function VacancyCard(
  { position, description, requirements, conditions },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        background: "#FFFFFF",
        color: BLACK,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Top red line */}
      <div style={{ height: 6, background: RED, width: "100%" }} />

      {/* Header */}
      <div style={{ padding: "70px 90px 0 90px" }}>
        <div
          style={{
            color: RED,
            fontWeight: 800,
            fontSize: 34,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          Tashenev University
        </div>
        <div
          style={{
            marginTop: 60,
            color: GRAY,
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Вакансия
        </div>
        <div
          style={{
            marginTop: 18,
            fontWeight: 900,
            fontSize: 110,
            lineHeight: 1.02,
            letterSpacing: -2,
            color: BLACK,
          }}
        >
          МЫ ИЩЕМ
        </div>
        <div
          style={{
            marginTop: 10,
            fontWeight: 800,
            fontSize: 78,
            lineHeight: 1.05,
            color: RED,
            letterSpacing: -1,
          }}
        >
          {position || "—"}
        </div>
        <div style={{ marginTop: 50, height: 2, background: DIVIDER }} />
      </div>

      {/* Body */}
      <div style={{ padding: "50px 90px 0 90px", flex: 1 }}>
        <Section title="О роли">
          <div style={{ fontSize: 32, lineHeight: 1.4, color: BLACK, whiteSpace: "pre-wrap" }}>
            {description}
          </div>
        </Section>

        <Section title="Требования">
          <BulletList items={requirements} />
        </Section>

        <Section title="Условия">
          <BulletList items={conditions} />
        </Section>
      </div>

      {/* Footer */}
      <div
        style={{
          background: RED,
          color: "#FFFFFF",
          padding: "40px 90px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        <span>hr@tashenev.edu</span>
        <span>tashenev.edu</span>
      </div>
    </div>
  );
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 40 }}>
      <div
        style={{
          color: RED,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: 4,
          textTransform: "uppercase",
          marginBottom: 18,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  const clean = items.filter((x) => x && x.trim().length > 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {clean.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <span
            style={{
              display: "inline-block",
              width: 36,
              height: 4,
              background: RED,
              marginTop: 22,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 32, lineHeight: 1.4, color: BLACK }}>{it}</span>
        </div>
      ))}
    </div>
  );
}
