import { useMemo, useState } from 'react'
import { useLocale } from '../Locale/LocaleHooks.js'
import { useTaskManager } from './TaskManagerHooks.js'
import ProgressBar from '../ProgressBar/ProgressBar.js'
import TaskBarItem from './TaskBarItem.js'

import styles from './TaskManager.module.scss'

function TaskBar () {
  const
    {getLocale} = useLocale(),
    {tasks, cancelTask, dismissTask} = useTaskManager(),
    [open, setOpen] = useState(false),

    running = tasks.filter((t) => t.status === 'running' || t.status === 'cancelling'),
    errored = tasks.filter((t) => t.status === 'error'),

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

  if (!tasks.length) {
    return null
  }

  const summary = running.length
    ? getLocale('tasks-running', running.length) + (global ? ' — ' + global.percent + '%' : '')
    : (errored.length ? getLocale('tasks-errored', errored.length) : getLocale('tasks-done'))

  return <div className={styles.container}>
    {
      open &&
      <ul className={styles.panel}>{
        tasks.map((task) => <TaskBarItem key={'task-' + task.name}
                                         task={task}
                                         onCancel={() => cancelTask(task.name)}
                                         onDismiss={() => dismissTask(task.name)}/>)
      }</ul>
    }
    <button className={[styles.bar, errored.length ? styles.barError : ''].join(' ')}
            onClick={() => setOpen((o) => !o)}
            title={getLocale(open ? 'tasks-collapse' : 'tasks-expand')}>
      <span className={styles.barChevron}>{open ? '' : ''}</span>
      <span className={styles.barSummary}>{summary}</span>
      <ProgressBar className={styles.barProgress}
                   current={global ? global.current : (running.length ? 0 : 1)}
                   total={global ? global.total : 1}/>
    </button>
  </div>
}

export default TaskBar
