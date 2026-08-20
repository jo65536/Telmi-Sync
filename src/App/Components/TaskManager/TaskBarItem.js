import { useLocale } from '../Locale/LocaleHooks.js'
import ProgressBar from '../ProgressBar/ProgressBar.js'
import ButtonIconXMark from '../Buttons/Icons/ButtonIconXMark.js'

import styles from './TaskManager.module.scss'

function TaskBarItem ({task, onCancel, onDismiss}) {
  const
    {getLocale} = useLocale(),
    p = task.processing,
    hasError = task.errors.length > 0,
    total = p ? p.total : 0,
    current = p ? p.current : 0,
    subtitle = p
      ? (p.title ? p.title : getLocale(p.message))
      : (task.status === 'done' ? getLocale('task-done') : getLocale('task-cancelling'))

  return <li className={styles.item}>
    <div className={styles.itemHead}>
      <span className={styles.itemLabel}>{getLocale(task.label)}</span>
      <span className={styles.itemStatus}>
        {task.status === 'done' && ''}
        {hasError && ''}
        {p && total > 1 ? (current + ' / ' + total) : ''}
      </span>
      {
        task.status === 'done' || hasError
          ? <ButtonIconXMark className={styles.itemAction} title={getLocale('dismiss')} onClick={onDismiss}/>
          : (task.cancellable && <ButtonIconXMark className={styles.itemAction} title={getLocale('cancel')} onClick={onCancel}/>)
      }
    </div>
    {p && <ProgressBar className={styles.itemProgress} current={current} total={total}/>}
    <p className={[styles.itemSubtitle, hasError ? styles.itemSubtitleError : ''].join(' ')} title={subtitle}>{subtitle}</p>
    {
      (task.items || []).length > 0 &&
      <ul className={styles.itemFiles}>{
        task.items.map((it, k) => <li key={'file-' + k} className={styles.itemFile} title={it.name}>
          <span className={styles.itemFileSpinner}>{'\uf110'}</span>
          <span className={styles.itemFileName}>{it.name}</span>
        </li>)
      }</ul>
    }
    {
      task.waiting.length > 0 &&
      <p className={styles.itemWaiting}>{getLocale('task-waiting', task.waiting.length)}</p>
    }
    {
      task.errors.map((err, k) => <p key={'err-' + k} className={styles.itemError} title={getLocale(String(err.message).split(' : ')[0])}>
        {getLocale('task-failed', itemTitle(err.task, getLocale))}
      </p>)
    }
  </li>
}

const itemTitle = (task, getLocale) => task ? getLocale(task) : ''

export default TaskBarItem
