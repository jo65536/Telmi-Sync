import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TaskManagerContext from './TaskManagerContext.js'
import { TASK_REGISTRY, TASK_BY_NAME } from './TaskRegistry.js'

const {ipcRenderer} = window.require('electron')

// Time a finished (successful) task stays visible before it auto-clears.
const DONE_LINGER_MS = 4000

const itemLabel = (item) => typeof item === 'string' ? item : (item && item.title) || ''

function TaskManagerProvider ({children}) {
  const
    [tasks, setTasks] = useState({}),
    doneTimers = useRef({}),

    upsert = useCallback(
      (name, patch) => setTasks((tasks) => {
        const base = tasks[name] || {
          name,
          label: (TASK_BY_NAME[name] || {}).label || name,
          cancellable: !!(TASK_BY_NAME[name] || {}).cancellable,
          processing: null,
          waiting: [],
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

    startTask = useCallback((name, dataSent, opts) => {
      clearDoneTimer(name)
      const conf = TASK_BY_NAME[name] || {}
      upsert(name, {
        label: (opts && opts.label) || conf.label || name,
        cancellable: (opts && opts.cancellable !== undefined) ? opts.cancellable : !!conf.cancellable,
        status: 'running',
        errors: [],
        processing: {title: '', message: 'initialize', current: 0, total: 1}
      })
      ipcRenderer.send(name, ...(Array.isArray(dataSent) ? dataSent : []))
    }, [upsert, clearDoneTimer]),

    cancelTask = useCallback((name) => {
      ipcRenderer.send(name + '-cancel')
      upsert(name, {status: 'cancelling'})
    }, [upsert])

  // One set of listeners per known task channel, attached once.
  useEffect(() => {
    const offs = []
    TASK_REGISTRY.forEach(({name}) => {
      const onTask = (e, title, message, current, total) => {
        if (title === '' && message === '' && current === 0 && total === 0) {
          // Completion sentinel. Keep it briefly if it succeeded; if it holds
          // errors, leave it until the user dismisses it.
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
            return {...tasks, [name]: {...t, processing: null, waiting: [], status: 'done'}}
          })
        } else {
          upsert(name, {processing: {title, message, current, total}, status: 'running'})
        }
      }
      const onWaiting = (e, waiting) => {
        upsert(name, {waiting: Array.isArray(waiting) ? waiting.map(itemLabel) : []})
      }
      const onError = (e, title, error) => {
        setTasks((tasks) => {
          const t = tasks[name] || {
            name, label: (TASK_BY_NAME[name] || {}).label || name,
            cancellable: !!(TASK_BY_NAME[name] || {}).cancellable,
            processing: null, waiting: [], errors: [], status: 'running'
          }
          return {...tasks, [name]: {...t, errors: [...t.errors, {task: title, message: error}], status: 'error'}}
        })
      }
      ipcRenderer.on(name + '-task', onTask)
      ipcRenderer.on(name + '-waiting', onWaiting)
      ipcRenderer.on(name + '-error', onError)
      offs.push(() => {
        ipcRenderer.off(name + '-task', onTask)
        ipcRenderer.off(name + '-waiting', onWaiting)
        ipcRenderer.off(name + '-error', onError)
      })
    })
    return () => offs.forEach((off) => off())
  }, [upsert, dismissTask, clearDoneTimer])

  useEffect(() => {
    const timers = doneTimers.current
    return () => Object.values(timers).forEach(clearTimeout)
  }, [])

  const value = useMemo(() => ({
    tasks: Object.values(tasks),
    startTask,
    cancelTask,
    dismissTask
  }), [tasks, startTask, cancelTask, dismissTask])

  return <TaskManagerContext.Provider value={value}>{children}</TaskManagerContext.Provider>
}

export default TaskManagerProvider
