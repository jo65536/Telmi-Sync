import styles from './ModalTasksVisualizer.module.scss'

function TaskSuccess ({message}) {
  return <li className={styles.waitingTaskContainer}>
    <div className={styles.taskTextes}>
      <h2 className={styles.taskTitleCentered}>{message}</h2>
    </div>
    <div className={[styles.taskIcon, styles.taskIconSuccess].join(' ')}>{'\uf00c'}</div>
  </li>
}

export default TaskSuccess
