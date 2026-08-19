import { app, ipcMain } from 'electron'
import { requestJson } from './Helpers/Request.js'
import { isNewerVersion } from './Helpers/Version.js'

function mainEventUpdate (mainWindow) {
  ipcMain.on('app-version-get', () => {
    mainWindow.webContents.send('app-version', app.getVersion())
  })

  ipcMain.on(
    'check-update',
    async () => {
      try {
        const json = await requestJson('https://api.github.com/repos/jo65536/Telmi-Sync/releases', {})
        const latest = json.find((release) => !release.draft)
        if (latest === undefined || !isNewerVersion(app.getVersion(), latest.tag_name)) {
          return
        }
        mainWindow.webContents.send('check-update-data', latest.html_url)
      } catch (ignored) {
        // best-effort check: stay silent offline
      }
    }
  )
}

export default mainEventUpdate
