import {ipcMain} from 'electron'
import {rmDirectory} from './Helpers/Files.js'
import {getTelmiOSStoriesPath} from './Helpers/TelmiOSPath.js'
import {deleteStories} from './Helpers/StoriesProcess.js'
import {readStories} from './Helpers/Stories.js'
import runProcess from './Processes/RunProcess.js'
import * as path from 'path'

function mainEventTelmiOSStoriesReader(mainWindow) {
  ipcMain.on(
    'telmios-stories-get',
    async (event, telmiDevice) => {
      if(telmiDevice === null) {
        mainWindow.webContents.send('telmios-stories-data',[])
        return
      }
      let list = {stories: [], error: []}
      try {
        list = readStories(getTelmiOSStoriesPath(telmiDevice.drive))
      } catch (e) {
        console.log('telmios-stories-get : ' + e.toString())
      }
      // Don't raise a warning per unreadable story (mid-write during a sync
      // still shows as unreadable) — it only spams the UI. Publish the readable ones.
      mainWindow.webContents.send('telmios-stories-data', list.stories)
    }
  )

  ipcMain.on(
    'telmios-stories-delete',
    async (event, telmiDevice, stories) => {
      if (telmiDevice !== null) {
        deleteStories(
          mainWindow,
          stories.map((s) => s.path),
          () => {
            ipcMain.emit('telmios-stories-get', event, telmiDevice)
            ipcMain.emit('telmios-diskusage', event, telmiDevice)
          }
        )
      }
    }
  )
  let storiesTransferTask = null, storiesTransferCancelled = false, storyTransferring = null

  ipcMain.on('stories-transfer-cancel', async () => {
    storiesTransferCancelled = true
    if (storiesTransferTask !== null) {
      storiesTransferTask.process.kill()
    }
  })

  const startTransfer = (telmiDevice, dstPath, stories) => {
    if (storiesTransferCancelled || !stories.length) {
      if (storiesTransferCancelled && storyTransferring !== null) {
        rmDirectory(path.join(dstPath, path.basename(storyTransferring.path)))
      }
      storyTransferring = null
      storiesTransferTask = null
      mainWindow.webContents.send('stories-transfer-waiting', [])
      mainWindow.webContents.send('stories-transfer-task', '', '', 0, 0)
      ipcMain.emit('telmios-stories-get', {}, telmiDevice)
      return ipcMain.emit('telmios-diskusage', {}, telmiDevice)
    }

    const story = stories.shift()
    storyTransferring = story
    mainWindow.webContents.send('stories-transfer-task', story.title, 'initialize', 0, 1)
    mainWindow.webContents.send('stories-transfer-waiting', stories)

    storiesTransferTask = runProcess(
      mainWindow,
      path.join('Stories', 'StoryTransfer.js'),
      [dstPath, story.path],
      () => {
        storyTransferring = null
      },
      (message, current, total) => {
        mainWindow.webContents.send('stories-transfer-task', story.title, message, current, total)
      },
      (error) => {
        mainWindow.webContents.send('stories-transfer-error', story.title, error)
      },
      () => startTransfer(telmiDevice, dstPath, stories)
    )
  }
  ipcMain.on('stories-transfer', async (event, telmiDevice, stories) => {
    storiesTransferCancelled = false
    startTransfer(telmiDevice, getTelmiOSStoriesPath(telmiDevice.drive), stories)
  })
}

export default mainEventTelmiOSStoriesReader
