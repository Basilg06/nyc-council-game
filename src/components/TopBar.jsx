import styles from "../styles";

export default function TopBar({ month, monthNum, year, onNewGame, onOpenLedger, ledgerCount = 0 }) {
  return (
    <div style={styles.topBar}>
      <div style={styles.seal}>★</div>
      <div style={{ flex: 1 }}>
        <div style={styles.topBarTitle}>OFFICE OF THE MAYOR</div>
        <div style={styles.topBarSub}>City of New York — Executive Session</div>
      </div>
      {onOpenLedger && (
        <button className="cg-btn" onClick={onOpenLedger} style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: "0.1em", background: "transparent", border: "1px solid #C9A227", borderRadius: 3, color: "#C9A227", padding: "5px 10px", cursor: "pointer" }}>
        🗞 LEDGER{ledgerCount > 0 ? ` (${ledgerCount})` : ""}
        </button>
      )}
      <button className="cg-btn" onClick={onNewGame} style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: "0.1em", background: "transparent", border: "1px solid #3A3A50", borderRadius: 3, color: "#666", padding: "5px 10px", cursor: "pointer" }}>
        NEW GAME
      </button>
      <div style={styles.monthChip}>
        <div style={styles.monthChipName}>{month}{year ? ` ${year}` : ""}</div>
      </div>
    </div>
  );
}
