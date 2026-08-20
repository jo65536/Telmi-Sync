import { useLocale } from '../Locale/LocaleHooks.js'
import ProgressBar from '../ProgressBar/ProgressBar.js'
import ButtonIconXMark from '../Buttons/Icons/ButtonIconXMark.js'

import styles from './TaskManager.module.scss'

const baseName = (s) => String(s || '').split(/[\\/]/).pop()

function TaskBarItem ({task, onCancel, onDismiss}) {
  const
    {getLocale} = useLocale(),
    p = task.processing,
    isRunning = task.status === 'running' || task.status === 'cancelling',
    isQueued = isRunning && task.queued === true,
    hasError = task.errors.length > 0,
    total = p ? p.total : 0,
    current = p ? p.current : 0,
    label = task.fileTask ? task.label : getLocale(task.label),

    // "name — reason", localizing whichever part is a known key. Handles both
    // import errors (task = a file path) and notifications (task = a locale key).
    errorLine = (err) => {
      const
        errTask = String(err.task || ''),
        isPath = errTask.includes('/') || errTask.includes('\\'),
        rawMsg = String(err.message || ''),
        msgKey = rawMsg.split(' : ')[0],
        localizedMsg = getLocale(msgKey),
        primary = isPath ? baseName(errTask) : getLocale(errTask),
        secondary = isPath ? (localizedMsg !== msgKey ? localizedMsg : rawMsg) : rawMsg
      return secondary ? primary + ' — ' + secondary : primary
    },

    glyph = isQueued ? '○' : (isRunning ? '⟳' : (hasError ? '✕' : '✓')),
    glyphClass = isQueued ? styles.glyphQueued : (isRunning ? styles.glyphSpin : (hasError ? styles.glyphErr : styles.glyphOk)),

    subtitle = task.status === 'cancelling'
      ? getLocale('task-cancelling')
      : (isRunning && !isQueued && p && p.title ? baseName(p.title) : '')

  return <li className={[styles.item, hasError ? styles.itemErr : ''].join(' ')}>
    <div className={styles.itemHead}>
      <span className={[styles.itemGlyph, glyphClass].join(' ')}>{glyph}</span>
      <span className={styles.itemLabel} title={label}>{label}</span>
      {!isQueued && p && total > 1 && <span className={styles.itemCount}>{current + ' / ' + total}</span>}
      {
        isRunning
          ? (task.cancellable && <ButtonIconXMark className={styles.itemAction} title={getLocale('cancel')} onClick={onCancel}/>)
          : <ButtonIconXMark className={styles.itemAction} title={getLocale('dismiss')} onClick={onDismiss}/>
      }
    </div>

    {isRunning && !isQueued && p && total > 0 && <ProgressBar className={styles.itemProgress} current={current} total={total}/>}

    {subtitle && <p className={styles.itemSubtitle} title={subtitle}>{subtitle}</p>}

    {
      task.waiting.length > 0 &&
      <p className={styles.itemWaiting}>{getLocale('task-waiting', task.waiting.length)}</p>
    }

    {
      hasError &&
      <ul className={styles.itemErrors}>{
        task.errors.map((err, k) => {
          const line = errorLine(err)
          return <li key={'err-' + k} className={styles.itemErrorLine} title={line}>{line}</li>
        })
      }</ul>
    }
  </li>
}

export default TaskBarItem
