import { forwardRef } from "react";

export interface StoryCardProps {
  type: 'Объявление' | 'Мероприятие' | 'Новость' | 'Достижение'
  title: string
  text: string
  date?: string
  link?: string
}

const RED = "#CC0000";
const BLACK = "#1a1a1a";
const GRAY = "#6b6b6b";
const DIVIDER = "#e5e5e5";

// 1080 x 1920 story card, same minimal style as VacancyCard
export const StoryCard = forwardRef<HTMLDivElement, StoryCardProps>(function StoryCard(
  { type, title, text, date, link },
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
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          TASHENEV UNIVERSITY
        </div>
        
        {/* Type badge */}
        <div
          style={{
            marginTop: 40,
            display: "inline-block",
            background: RED,
            color: "#FFFFFF",
            padding: "12px 32px",
            borderRadius: 50,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {type}
        </div>

        <div
          style={{
            marginTop: 60,
            fontWeight: 900,
            fontSize: 72,
            lineHeight: 1.1,
            letterSpacing: -1,
            color: BLACK,
          }}
        >
          {title || "—"}
        </div>
        <div style={{ marginTop: 40, height: 2, background: DIVIDER }} />
      </div>

      {/* Body */}
      <div style={{ padding: "50px 90px 0 90px", flex: 1 }}>
        <div style={{ fontSize: 36, lineHeight: 1.5, color: BLACK, whiteSpace: "pre-wrap" }}>
          {text}
        </div>

        {date && (
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
              Дата и время
            </div>
            <div style={{ fontSize: 32, lineHeight: 1.4, color: BLACK }}>
              {date}
            </div>
          </div>
        )}

        {link && (
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
              Ссылка
            </div>
            <div style={{ fontSize: 28, lineHeight: 1.4, color: BLACK, wordBreak: "break-all" }}>
              {link}
            </div>
          </div>
        )}
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
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        <span>@tashenev.university</span>
        <span>tashenev.edu</span>
      </div>
    </div>
  );
});
