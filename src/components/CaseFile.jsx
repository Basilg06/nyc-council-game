import { useState } from "react";
import { FACTIONS } from "../data/council";
import styles from "../styles";

const GOV_META = {
  hochul:   { name: "Gov. Kathy Hochul",    role: "Governor — Democrat",      color: "#2E3F8F" },
  delgado:  { name: "Gov. Antonio Delgado", role: "Governor — Democrat",      color: "#5B7FE0" },
  salazar:  { name: "Gov. Julia Salazar",   role: "Governor — Democrat/DSA",  color: "#7B4FA3" },
  blakeman: { name: "Gov. Bruce Blakeman",  role: "Governor — Republican",    color: "#B5402E" },
};

export default function CaseFile({ state }) {
  const [tab, setTab] = useState("overview");
  return (
    <div style={styles.caseFile}>
      <div style={styles.caseFileHeader}>CASE FILE</div>
      <div style={styles.tabRow}>
        {[["overview", "OVERVIEW"], ["groups", "GROUPS"]].map(([key, label]) => (
          <button key={key} style={{ ...styles.tabBtn, ...(tab === key ? styles.tabBtnActive : {}) }} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" ? <OverviewTab state={state} /> : <GroupsTab state={state} />}
    </div>
  );
}

function OverviewTab({ state }) {
  return (
    <>
      <div style={styles.cfSection}>
        <div style={styles.cfLabel}>Budget</div>
        <div style={styles.ledgerLine}>
          <span style={{ ...styles.ledgerNum, color: state.resources.budget < 0 ? "#8B1A1A" : "#2D5C3E" }}>
            {state.resources.budget > 0 ? "+" : ""}{state.resources.budget}
          </span>
          <span style={styles.ledgerUnit}>pts</span>
        </div>
      </div>
      <div style={styles.cfSection}>
        <div style={styles.cfLabel}>Key Figures</div>
        {Object.entries(state.figures).map(([k, fig]) => {
          if (k === "hochul" && state.flags.govWinner) {
            const meta = GOV_META[state.flags.govWinner] ?? GOV_META.hochul;
            return <FigureRow key={k} fig={{ ...fig, ...meta }} />;
          }
          return <FigureRow key={k} fig={fig} />;
        })}
      </div>
      <div style={styles.cfSection}>
        <div style={styles.cfLabel}>Political Capital</div>
        <div style={styles.chitRow}>
          {!state.resources.favorHochul && !state.flags.owesHochul && (
            <span style={styles.dim}>No favors outstanding</span>
          )}
          {state.resources.favorHochul && <Chit label="Hochul owes you" color="#2E3F8F" />}
          {state.flags.owesHochul      && <Chit label="You owe Hochul"  color="#8B1A1A" />}
        </div>
      </div>
    </>
  );
}

function GroupsTab({ state }) {
  return (
    <>
      <div style={styles.cfSection}>
        <div style={styles.cfLabel}>Faction Approval</div>
        {Object.entries(state.factionApproval).map(([k, v]) => (
          <div key={k} style={styles.factionApprRow}>
            <span style={{ ...styles.factionApprDot, background: FACTIONS[k].color }} />
            <span style={styles.factionApprName}>{FACTIONS[k].name}</span>
            <div style={styles.factionApprTrack}>
              <div style={{ ...styles.factionApprFill, width: `${v}%`, background: FACTIONS[k].color }} />
            </div>
            <span style={styles.factionApprPct}>{v}%</span>
          </div>
        ))}
      </div>
      <div style={styles.cfSection}>
        <div style={styles.cfLabel}>Interest Groups</div>
        {Object.entries(state.groups).map(([k, g]) => (
          <div key={k} style={styles.factionApprRow}>
            <span style={{ ...styles.factionApprDot, background: g.color }} />
            <span style={{ ...styles.factionApprName, width: "auto", flex: 1, minWidth: 0 }}>{g.name}</span>
            <div style={{ ...styles.factionApprTrack, flexShrink: 0, width: 48 }}>
              <div style={{ ...styles.factionApprFill, width: `${g.approval}%`, background: g.color }} />
            </div>
            <span style={styles.factionApprPct}>{g.approval}%</span>
          </div>
        ))}
      </div>
    </>
  );
}

function FigureRow({ fig }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <span style={{ width: 3, height: 28, background: fig.color, borderRadius: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#E8E4D8", lineHeight: 1.2 }}>{fig.name}</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5, color: "#888", marginTop: 1 }}>{fig.role}</div>
        </div>
      </div>
      <div style={{ paddingLeft: 9 }}>
        <MiniBar label="APPR" value={fig.approval} color={fig.color} />
        <MiniBar label="POP"  value={fig.popularity} color="#555" />
      </div>
    </div>
  );
}

function Gauge({ value }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 55 ? "#2D5C3E" : pct >= 40 ? "#C9A227" : "#8B1A1A";
  return (
    <div style={styles.gaugeOuter}>
      <div style={{ ...styles.gaugeFill, width: `${pct}%`, background: color }} />
      <div style={styles.gaugeText}>{pct}%</div>
    </div>
  );
}

function MiniBar({ label, value, color }) {
  return (
    <div style={styles.miniBarWrap}>
      <span style={styles.miniBarLabel}>{label}</span>
      <div style={styles.miniBarTrack}>
        <div style={{ ...styles.miniBarFill, width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </div>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5, color: "#888", width: 24, textAlign: "right", flexShrink: 0 }}>{value}%</span>
    </div>
  );
}

function Chit({ label, color }) {
  return <div style={{ ...styles.chit, borderColor: color, color }}>{label}</div>;
}
