
import styles from './ProgressBar.module.scss'
function ProgressBar({className, current, total}) {
  return <div className={[styles.container, className].join(' ')}>
    <div className={styles.bar} style={{width: (total > 0 ? Math.min(100, current / total * 100) : 0) + '%'}}></div>
  </div>
}

export default ProgressBar
