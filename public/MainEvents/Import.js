import {dialog, ipcMain} from 'electron'
import runProcess from './Processes/RunProcess.js'

import * as path from 'path'

function mainEventImport(mainWindow) {
  let
    taskRunning = null,
    filesToProcess = []

  const runImport = () => {
    if (!filesToProcess.length) {
      taskRunning = null
      mainWindow.webContents.send('import-task', '', '', 0, 0)
      ipcMain.emit('local-stories-get')
      ipcMain.emit('local-musics-get')
      return
    }
    const file = filesToProcess.shift()
    mainWindow.webContents.send('import-task', file, 'initialize', 0, 1)
    mainWindow.webContents.send('import-waiting', filesToProcess)
    taskRunning = runProcess(
      mainWindow,
      path.join('Import', 'ImportProcess.js'),
      [file],
      () => {},
      (message, current, total) => {
        mainWindow.webContents.send('import-task', file, message, current, total)
      },
      (error) => {
        mainWindow.webContents.send('import-error', file, error)
      },
      () => runImport()
    )
  }

  ipcMain.on(
    'import',
    async (event, filesPath) => {
      filesToProcess = [...filesToProcess, ...filesPath]
      if (taskRunning !== null) {
        mainWindow.webContents.send('import-waiting', filesToProcess)
      } else {
        runImport()
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

  ipcMain.on(
    'import-cancel',
    async () => {
      filesToProcess = []
      if (taskRunning !== null) {
        taskRunning.process.kill()
      }
    }
  )
}

export default mainEventImport
