import { useMemo, useState } from 'react'
import { useLocale } from '../Locale/LocaleHooks.js'
import { useTaskManager } from './TaskManagerHooks.js'
import ProgressBar from '../ProgressBar/ProgressBar.js'
import TaskBarItem from './TaskBarItem.js'

import styles from './TaskManager.module.scss'

function TaskBar () {
  const
    {getLocale} = useLocale(),
    {tasks, cancelTask, dismissTask, clearFinished} = useTaskManager(),
    [open, setOpen] = useState(false),

    running = tasks.filter((t) => t.status === 'running' || t.status === 'cancelling'),
    errored = tasks.filter((t) => t.status === 'error'),
    finishedCount = tasks.length - running.length,

    // Running pinned on top, the rest (errors / notifications / done) below.
    sorted = useMemo(() => {
      const rank = (t) => (t.status === 'running' || t.status === 'cancelling') ? 0 : 1
      return [...tasks].sort((a, b) => rank(a) - rank(b))
    }, [tasks]),

    global = useMemo(() => {
      const active = running.filter((t) => t.processing && t.processing.total > 0)
      if (!active.length) {
        return null
      }
      const
        current = active.reduce((acc, t) => acc + t.processing.current, 0),
        total = active.reduce((acc, t) => acc + t.processing.total, 0)
      return {current, total, percent: total > 0 ? Math.round(current / total * 100) : 0}
    }, [running])

  // Idle: nothing running and nothing left to acknowledge -> stay out of the way.
  if (!tasks.length) {
    return null
  }

  const summary = running.length
    ? getLocale('tasks-running', running.length) + (global ? ' · ' + global.percent + '%' : '')
    : (errored.length ? getLocale('tasks-errored', errored.length) : getLocale('tasks-done'))

  return <div className={styles.container}>
    {
      open &&
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>{getLocale('tasks-title')}</span>
          {
            finishedCount > 0 &&
            <button className={styles.panelClear} onClick={clearFinished}>{getLocale('tasks-clear-finished')}</button>
          }
        </div>
        <ul className={styles.panelList}>{
          sorted.map((task) => <TaskBarItem key={'task-' + task.name}
                                            task={task}
                                            onCancel={() => cancelTask(task.name)}
                                            onDismiss={() => dismissTask(task.name)}/>)
        }</ul>
      </div>
    }
    <button className={[styles.bar, errored.length ? styles.barError : '', running.length ? styles.barBusy : ''].join(' ')}
            onClick={() => setOpen((o) => !o)}
            title={getLocale(open ? 'tasks-collapse' : 'tasks-expand')}>
      <span className={styles.barDot}/>
      <span className={styles.barSummary}>{summary}</span>
      {
        global
          ? <ProgressBar className={styles.barProgress} current={global.current} total={global.total}/>
          : <span className={styles.barSpacer}/>
      }
      <span className={styles.barChevron}>{open ? '▾' : '▴'}</span>
    </button>
  </div>
}

export default TaskBar
