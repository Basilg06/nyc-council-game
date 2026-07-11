// The Ledger archive — every front page published so far, newest first.
export default function PressArchive({ state, onClose }) {
  const editions = [...(state.flags.pressArchive || [])].reverse();
  const serif = { fontFamily: "'Lora', Georgia, serif" };
  const mono = { fontFamily: "'Space Mono', monospace" };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(5,8,14,0.78)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cg-scene-in"
        style={{ width: "100%", maxWidth: 720, maxHeight: "88vh", display: "flex", flexDirection: "column", background: "#F2EDDE", color: "#1A1810", border: "1px solid #C8BFA4", borderRadius: 2, boxShadow: "0 12px 44px rgba(0,0,0,0.6)", overflow: "hidden" }}
      >
        <div style={{ padding: "14px 22px", borderBottom: "3px double #1A1810", display: "flex", alignItems: "baseline", gap: 14 }}>
          <div style={{ ...serif, fontWeight: 700, fontSize: 22, flex: 1 }}>The New York Ledger — Archive</div>
          <button
            onClick={onClose}
            style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", background: "transparent", border: "1px solid #1A1810", borderRadius: 2, padding: "5px 12px", cursor: "pointer", color: "#1A1810" }}
          >
            CLOSE ✕
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "0 22px" }}>
          {editions.length === 0 && (
            <div style={{ ...serif, fontStyle: "italic", fontSize: 14, color: "#5A5240", padding: "36px 0", textAlign: "center" }}>
              No editions yet. The first paper prints after the Speaker vote.
            </div>
          )}
          {editions.map((ed, i) => (
            <div key={i} style={{ padding: "18px 0 16px", borderBottom: i < editions.length - 1 ? "1px solid #1A1810" : "none" }}>
              <div style={{ ...mono, fontSize: 8.5, letterSpacing: "0.16em", color: "#5A5240", marginBottom: 8 }}>
                {(ed.date || "").toUpperCase()} — LATE CITY EDITION
              </div>
              <div style={{ ...serif, fontWeight: 700, fontSize: 22, lineHeight: 1.15, textTransform: "uppercase", marginBottom: 8 }}>
                {ed.stories[0]?.headline}
              </div>
              {ed.stories[0]?.body && (
                <div style={{ ...serif, fontSize: 12, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>{ed.stories[0].body}</div>
              )}
              {ed.stories.slice(1).map((st, j) => (
                <div key={j} style={{ marginBottom: 8, paddingLeft: 12, borderLeft: "2px solid #C8BFA4" }}>
                  <div style={{ ...serif, fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{st.headline}</div>
                  {st.body && <div style={{ ...serif, fontSize: 11.5, lineHeight: 1.5, color: "#33302A", marginTop: 3 }}>{st.body}</div>}
                </div>
              ))}
              {ed.briefs?.length > 0 && (
                <div style={{ ...serif, fontSize: 10.5, fontStyle: "italic", color: "#5A5240", marginTop: 8 }}>
                  Also in this edition: {ed.briefs.map((b) => b.charAt(0) + b.slice(1).toLowerCase()).join(" · ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
