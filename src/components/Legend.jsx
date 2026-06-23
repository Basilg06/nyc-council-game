import { FACTIONS, FACTION_COUNTS } from "../data/council";
import styles from "../styles";

export default function Legend({ majority, minority }) {
  return (
    <div style={styles.legendWrap}>
      <div style={styles.legendCol}>
        <div style={styles.legendHeader}>MAJORITY ({majority})</div>
        {["dsa", "progressive", "centrist"].map((k) => <LegendRow key={k} factionKey={k} />)}
      </div>
      <div style={styles.legendCol}>
        <div style={{ ...styles.legendHeader, opacity: 0 }}>.</div>
        {["leftWfp", "establishment", "felder"].map((k) => <LegendRow key={k} factionKey={k} />)}
      </div>
      <div style={styles.legendCol}>
        <div style={styles.legendHeader}>MINORITY ({minority})</div>
        {["republican", "farRight"].map((k) => <LegendRow key={k} factionKey={k} />)}
      </div>
    </div>
  );
}

function LegendRow({ factionKey }) {
  const f = FACTIONS[factionKey];
  return (
    <div style={styles.legendRow}>
      <span style={{ ...styles.legendDot, background: f.color }} />
      <span style={styles.legendLabel}>{f.name} ({FACTION_COUNTS[factionKey]})</span>
    </div>
  );
}
