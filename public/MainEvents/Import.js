import {dialog, ipcMain} from 'electron'
import runProcess from './Processes/RunProcess.js'

import * as os from 'os'
import * as path from 'path'

// Import several dropped items at once, bounded so we don't oversubscribe the
// CPU: each import already pools its own audio conversion across all cores, so
// a handful of concurrent imports is enough without thrashing.
const CONCURRENCY = Math.max(2, Math.min(3, os.cpus().length))

function mainEventImport(mainWindow) {
  let
    queue = [],           // [{id, file}]
    running = new Map(),   // id -> {task, file}
    seq = 0,
    refreshTimer = null

  const send = (channel, ...args) => mainWindow.webContents.send(channel, ...args)

  // Each dropped file gets its own row in the task bar.
  const emitFile = (id, name, status, current = 0, total = 1, error = '') =>
    send('import-file', {id, name, status, current, total, error})

  // Coalesced library refresh so imported stories/musics appear in the list
  // while the rest of the batch is still importing.
  const scheduleRefresh = () => {
    if (refreshTimer !== null) {
      return
    }
    refreshTimer = setTimeout(() => {
      refreshTimer = null
      ipcMain.emit('local-stories-get')
      ipcMain.emit('local-musics-get')
    }, 600)
  }

  const finalRefresh = () => {
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
    ipcMain.emit('local-stories-get')
    ipcMain.emit('local-musics-get')
  }

  const pump = () => {
    while (running.size < CONCURRENCY && queue.length > 0) {
      const {id, file} = queue.shift()
      const name = path.basename(file)
      let settled = false
      emitFile(id, name, 'converting', 0, 1)
      const task = runProcess(
        mainWindow,
        path.join('Import', 'ImportProcess.js'),
        [file],
        () => {
          settled = true
          emitFile(id, name, 'done')
          scheduleRefresh()
        },
        (message, current, total) => {
          emitFile(id, name, 'converting', current, total)
        },
        (error) => {
          settled = true
          emitFile(id, name, 'error', 0, 1, error)
        },
        () => {
          // Process exit (success, error or kill). A kill emits neither success
          // nor error, so if nothing terminal was sent it was cancelled -> emit
          // the terminal frame so the row resolves instead of hanging.
          if (!settled) {
            emitFile(id, name, 'cancelled')
          }
          running.delete(id)
          if (queue.length === 0 && running.size === 0) {
            finalRefresh()
          } else {
            pump()
          }
        },
        () => {}   // folder sub-items collapse into this single file row
      )
      running.set(id, {task, file})
    }
  }

  ipcMain.on(
    'import',
    async (event, filesPath) => {
      if (!Array.isArray(filesPath) || filesPath.length === 0) {
        return
      }
      // Show every dropped file immediately as a pending row, then start the pool.
      for (const file of filesPath) {
        const id = ++seq
        queue.push({id, file})
        emitFile(id, path.basename(file), 'queued', 0, 1)
      }
      pump()
    }
  )

  ipcMain.on(
    'import-file-cancel',
    async (event, id) => {
      const r = running.get(id)
      if (r) {
        try {
          r.task.process.kill()
        } catch (e) {
          // already gone
        }
      } else {
        queue = queue.filter((q) => q.id !== id)
        send('import-file', {id, name: '', status: 'cancelled', current: 0, total: 1, error: ''})
      }
    }
  )

  ipcMain.on(
    'import-cancel',
    async () => {
      // Resolve queued rows immediately; killed running rows resolve via their
      // exit handler (settled === false -> 'cancelled').
      for (const q of queue) {
        emitFile(q.id, path.basename(q.file), 'cancelled')
      }
      queue = []
      for (const r of running.values()) {
        try {
          r.task.process.kill()
        } catch (e) {
          // already gone
        }
      }
    }
  )

  ipcMain.on(
    'import-dialog',
    async (event, mediaFilterName, allFilterName) => {
      const {canceled, filePaths} = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          {name: mediaFilterName || 'Stories, packs and musics', extensions: ['zip', '7z', 'mp3', 'flac', 'aac', 'ogg', 'wav', 'mp4a', 'm4a', 'wma', 'webm']},
          {name: allFilterName || 'All files', extensions: ['*']}
        ]
      })
      if (canceled || !filePaths.length) {
        return
      }
      mainWindow.webContents.send('import-files-selected', filePaths)
    }
  )
}

export default mainEventImport
