import { getHeadlines } from "../data/news";

export default function NewsTicker({ state }) {
  const items = getHeadlines(state);
  const text = items.join("   •••   ");
  const dur = Math.max(45, Math.round(text.length * 0.35));

  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 26, background: "rgba(5,8,14,0.94)", borderTop: "1px solid #1E3050", display: "flex", alignItems: "stretch", overflow: "hidden", zIndex: 6, pointerEvents: "none" }}>
      <style>{`@keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      <div style={{ flexShrink: 0, background: "#8B1A1A", color: "#F5F2E8", fontFamily: "'Space Mono', monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", padding: "0 10px", display: "flex", alignItems: "center", zIndex: 2 }}>
        WIRE
      </div>
      <div style={{ display: "flex", alignItems: "center", width: "max-content", animation: `tickerScroll ${dur}s linear infinite` }}>
        {[0, 1].map((k) => (
          <span key={k} style={{ whiteSpace: "nowrap", fontFamily: "'Space Mono', monospace", fontSize: 9.5, color: "#7A8FA8", letterSpacing: "0.06em", paddingRight: 80 }}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
