import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TaskManagerContext from './TaskManagerContext.js'
import { TASK_REGISTRY, TASK_BY_NAME } from './TaskRegistry.js'

const {ipcRenderer} = window.require('electron')

// Time a finished (successful) task stays visible before it auto-clears.
const DONE_LINGER_MS = 4000
// Cap kept notifications so a burst of warnings can't grow without bound.
const MAX_NOTIFICATIONS = 60
// Cap finished per-file import rows so a huge batch (hundreds) stays legible;
// running/queued/errored rows are always kept.
const MAX_FILE_DONE = 80

const itemLabel = (item) => typeof item === 'string' ? item : (item && item.title) || ''

function TaskManagerProvider ({children}) {
  const
    [tasks, setTasks] = useState({}),
    doneTimers = useRef({}),
    notifSeq = useRef(0),

    upsert = useCallback(
      (name, patch) => setTasks((tasks) => {
        const base = tasks[name] || {
          name,
          label: (TASK_BY_NAME[name] || {}).label || name,
          cancellable: !!(TASK_BY_NAME[name] || {}).cancellable,
          processing: null,
          waiting: [],
          items: [],
          errors: [],
          status: 'running'
        }
        return {...tasks, [name]: {...base, ...patch}}
      }),
      [setTasks]
    ),

    clearDoneTimer = useCallback((name) => {
      if (doneTimers.current[name] !== undefined) {
        clearTimeout(doneTimers.current[name])
        delete doneTimers.current[name]
      }
    }, []),

    dismissTask = useCallback((name) => {
      clearDoneTimer(name)
      setTasks((tasks) => {
        const next = {...tasks}
        delete next[name]
        return next
      })
    }, [setTasks, clearDoneTimer]),

    // "Clear finished": drop everything that is not actively running (done,
    // errored, and one-shot notifications), keeping only live work.
    clearFinished = useCallback(() => {
      setTasks((tasks) => {
        const next = {}
        for (const [name, t] of Object.entries(tasks)) {
          if (t.status === 'running' || t.status === 'cancelling') {
            next[name] = t
          } else {
            clearDoneTimer(name)
          }
        }
        return next
      })
    }, [setTasks, clearDoneTimer]),

    // A one-shot warning (e.g. a failed conversion) shown as a persistent,
    // dismissible entry in the task list instead of a blocking modal.
    addNotification = useCallback((title, message) => {
      const key = 'notification-' + (notifSeq.current += 1)
      setTasks((tasks) => {
        const next = {...tasks, [key]: {
          name: key,
          label: title || 'error',
          cancellable: false,
          notification: true,
          processing: null,
          waiting: [],
          items: [],
          errors: [{task: title, message}],
          status: 'error'
        }}
        // Keep only the most recent notifications.
        const notifs = Object.keys(next).filter((k) => next[k].notification)
        if (notifs.length > MAX_NOTIFICATIONS) {
          notifs
            .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))
            .slice(0, notifs.length - MAX_NOTIFICATIONS)
            .forEach((k) => { delete next[k] })
        }
        return next
      })
    }, [setTasks]),

    startTask = useCallback((name, dataSent, opts) => {
      clearDoneTimer(name)
      const conf = TASK_BY_NAME[name] || {}
      setTasks((tasks) => {
        const
          existing = tasks[name],
          isRunning = existing !== undefined && (existing.status === 'running' || existing.status === 'cancelling' || existing.status === 'error'),
          base = existing || {name, processing: null, waiting: [], items: [], errors: []}
        return {...tasks, [name]: {
          ...base,
          label: (opts && opts.label) || conf.label || name,
          cancellable: (opts && opts.cancellable !== undefined) ? opts.cancellable : !!conf.cancellable,
          status: 'running',
          errors: isRunning ? base.errors : [],
          items: isRunning ? (base.items || []) : [],
          processing: isRunning ? base.processing : {title: '', message: 'initialize', current: 0, total: 1}
        }}
      })
      ipcRenderer.send(name, ...(Array.isArray(dataSent) ? dataSent : []))
    }, [setTasks, clearDoneTimer]),

    cancelTask = useCallback((name) => {
      if (name.startsWith('file-')) {
        ipcRenderer.send('import-file-cancel', Number(name.slice(5)))
      } else {
        ipcRenderer.send(name + '-cancel')
      }
      upsert(name, {status: 'cancelling'})
    }, [upsert]),

    // Trigger an import without creating an aggregate task: each dropped file
    // gets its own row via the 'import-file' events below.
    importFiles = useCallback((filesPath) => {
      ipcRenderer.send('import', filesPath)
    }, [])

  // One set of listeners per known task channel, attached once.
  useEffect(() => {
    const offs = []
    TASK_REGISTRY.forEach(({name}) => {
      const onTask = (e, title, message, current, total) => {
        if (title === '' && message === '' && current === 0 && total === 0) {
          setTasks((tasks) => {
            const t = tasks[name]
            if (t === undefined) {
              return tasks
            }
            if (t.errors.length) {
              return {...tasks, [name]: {...t, processing: null, status: 'error'}}
            }
            clearDoneTimer(name)
            doneTimers.current[name] = setTimeout(() => dismissTask(name), DONE_LINGER_MS)
            return {...tasks, [name]: {...t, processing: null, waiting: [], items: [], status: 'done'}}
          })
        } else {
          upsert(name, {processing: {title, message, current, total}, status: 'running'})
        }
      }
      const onWaiting = (e, waiting) => {
        upsert(name, {waiting: Array.isArray(waiting) ? waiting.map(itemLabel) : []})
      }
      const onItem = (e, status, itemName) => {
        setTasks((tasks) => {
          const t = tasks[name]
          if (t === undefined) {
            return tasks
          }
          const items = (t.items || []).filter((it) => it.name !== itemName)
          if (status === 'converting') {
            items.push({name: itemName, status})
          }
          return {...tasks, [name]: {...t, items}}
        })
      }
      const onError = (e, title, error) => {
        setTasks((tasks) => {
          const t = tasks[name] || {
            name, label: (TASK_BY_NAME[name] || {}).label || name,
            cancellable: !!(TASK_BY_NAME[name] || {}).cancellable,
            processing: null, waiting: [], items: [], errors: [], status: 'running'
          }
          return {...tasks, [name]: {...t, errors: [...t.errors, {task: title, message: error}], status: 'error'}}
        })
      }
      ipcRenderer.on(name + '-task', onTask)
      ipcRenderer.on(name + '-waiting', onWaiting)
      ipcRenderer.on(name + '-error', onError)
      ipcRenderer.on(name + '-item', onItem)
      offs.push(() => {
        ipcRenderer.off(name + '-task', onTask)
        ipcRenderer.off(name + '-waiting', onWaiting)
        ipcRenderer.off(name + '-error', onError)
        ipcRenderer.off(name + '-item', onItem)
      })
    })
    return () => offs.forEach((off) => off())
  }, [upsert, dismissTask, clearDoneTimer])

  // Global warning channel -> non-blocking list entries (no modal).
  useEffect(() => {
    const listener = (e, payload) => {
      addNotification((payload && payload.title) || 'error', (payload && payload.message) || '')
    }
    ipcRenderer.on('error-warning', listener)
    return () => ipcRenderer.off('error-warning', listener)
  }, [addNotification])

  // Per-file import rows: one entry per dropped file (queued -> converting ->
  // done / error), so dropping 40 files shows 40 rows in the task bar.
  useEffect(() => {
    const onFile = (e, f) => {
      const key = 'file-' + f.id
      setTasks((tasks) => {
        if (f.status === 'cancelled') {
          const next = {...tasks}
          delete next[key]
          return next
        }
        const base = tasks[key] || {
          name: key, label: f.name, cancellable: true, fileTask: true, fileId: f.id,
          queued: false, processing: null, waiting: [], items: [], errors: [], status: 'running'
        }
        let patch
        if (f.status === 'queued') {
          patch = {status: 'running', queued: true, processing: null}
        } else if (f.status === 'converting') {
          patch = {status: 'running', queued: false, processing: {title: '', message: 'task-import', current: f.current, total: f.total}}
        } else if (f.status === 'done') {
          patch = {status: 'done', queued: false, processing: null}
        } else if (f.status === 'error') {
          patch = {status: 'error', queued: false, processing: null, errors: [{task: f.name, message: f.error}]}
        } else {
          patch = {}
        }
        const next = {...tasks, [key]: {...base, label: f.name || base.label, ...patch}}
        const doneKeys = Object.keys(next).filter((k) => next[k].fileTask && next[k].status === 'done')
        if (doneKeys.length > MAX_FILE_DONE) {
          doneKeys
            .sort((a, b) => next[a].fileId - next[b].fileId)
            .slice(0, doneKeys.length - MAX_FILE_DONE)
            .forEach((k) => { delete next[k] })
        }
        return next
      })
    }
    ipcRenderer.on('import-file', onFile)
    return () => ipcRenderer.off('import-file', onFile)
  }, [setTasks])

  useEffect(() => {
    const timers = doneTimers.current
    return () => Object.values(timers).forEach(clearTimeout)
  }, [])

  const value = useMemo(() => ({
    tasks: Object.values(tasks),
    startTask,
    cancelTask,
    dismissTask,
    clearFinished,
    addNotification,
    importFiles
  }), [tasks, startTask, cancelTask, dismissTask, clearFinished, addNotification, importFiles])

  return <TaskManagerContext.Provider value={value}>{children}</TaskManagerContext.Provider>
}

export default TaskManagerProvider
