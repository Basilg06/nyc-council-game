import styles from "../styles";

export default function TopBar({ month, monthNum }) {
  return (
    <div style={styles.topBar}>
      <div style={styles.seal}>★</div>
      <div style={{ flex: 1 }}>
        <div style={styles.topBarTitle}>OFFICE OF THE MAYOR</div>
        <div style={styles.topBarSub}>City of New York — Executive Session</div>
      </div>
      <div style={styles.monthChip}>
        <div style={styles.monthChipName}>{month}</div>
      </div>
    </div>
  );
}
