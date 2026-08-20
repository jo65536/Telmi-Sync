import {ipcMain} from 'electron'
import {deleteMusic} from './Helpers/MusicFiles.js'
import {getCachedMusics} from './Helpers/TelmiOSScanCache.js'
import {getTelmiOSMusicPath} from './Helpers/TelmiOSPath.js'
import runProcess from './Processes/RunProcess.js'
import * as path from 'path'

function mainEventTelmiOSMusicReader(mainWindow) {
  ipcMain.on(
    'telmios-musics-get',
    async (event, telmiDevice) => {
      let musics = []
      try {
        musics = telmiDevice !== null ? getCachedMusics(telmiDevice.drive) : []
      } catch (e) {
        console.log('telmios-musics-get : ' + e.toString())
      }
      mainWindow.webContents.send('telmios-musics-data', musics)
    }
  )

  ipcMain.on(
    'telmios-musics-delete',
    async (event, telmiDevice, ids) => {
      if (telmiDevice !== null) {
        deleteMusic(
          mainWindow,
          getTelmiOSMusicPath(telmiDevice.drive),
          ids,
          () => {
            ipcMain.emit('telmios-musics-get', event, telmiDevice)
            ipcMain.emit('telmios-diskusage', event, telmiDevice)
          }
        )
      }
    }
  )

  let musicsTransferTask = null

  ipcMain.on('musics-transfer-cancel', async () => {
    if (musicsTransferTask !== null) {
      musicsTransferTask.process.kill()
    }
  })

  ipcMain.on('musics-transfer', async (event, telmiDevice, musics) => {
    const
      musicPath = getTelmiOSMusicPath(telmiDevice.drive),
      onFinished = () => {
        musicsTransferTask = null
        mainWindow.webContents.send('musics-transfer-task', '', '', 0, 0)
        ipcMain.emit('telmios-musics-get', event, telmiDevice)
        ipcMain.emit('telmios-diskusage', event, telmiDevice)
      }

    musicsTransferTask = runProcess(
      mainWindow,
      path.join('Music', 'MusicTransfer.js'),
      [musicPath, ...musics.map((m) => m.id)],
      () => {},
      (message, current, total) => {
        mainWindow.webContents.send('musics-transfer-task', 'musics-transferring', message, current, total)
      },
      (error) => {
        mainWindow.webContents.send('musics-transfer-error', 'musics-transferring', error)
      },
      onFinished
    )
  })
}

export default mainEventTelmiOSMusicReader
