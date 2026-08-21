import {ipcMain} from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import {getStoriesPath, initTmpPath} from './Helpers/AppPaths.js'
import {deleteStories} from './Helpers/StoriesProcess.js'
import {readStories, createMetadataFile, generateDirNameStory} from './Helpers/Stories.js'
import runProcess from './Processes/RunProcess.js'
import {rmDirectory} from './Helpers/Files.js'

function mainEventLocalStoriesReader(mainWindow) {
  ipcMain.on(
    'local-stories-get',
    async () => {
      // A story can be unreadable simply because it is still being written
      // (mid-import) — don't raise a warning per unreadable entry, it just spams
      // the UI during a batch import. Only the readable stories are published.
      const list = readStories(getStoriesPath())
      mainWindow.webContents.send('local-stories-data', list.stories)
    }
  )

  ipcMain.on(
    'local-stories-update',
    async (event, stories) => {
      if (!Array.isArray(stories)) {
        return
      }
      for (const story of stories) {
        const
          mdPath = path.join(story.path, 'metadata.json'),
          md = JSON.parse(fs.readFileSync(mdPath).toString('utf8'))

        createMetadataFile(mdPath, story, md.image)

        const newStoryPath = getStoriesPath(generateDirNameStory(story.title, story.uuid, story.age, story.category))
        if (story.path.toLowerCase() !== newStoryPath.toLowerCase()) {
          rmDirectory(newStoryPath)
          fs.renameSync(story.path, newStoryPath)
        }
      }
      ipcMain.emit('local-stories-get')
    }
  )

  let mergeTask = null, mergeQueue = [], mergeCounter = 0
  ipcMain.on('local-stories-merge-cancel', async () => {
    mergeQueue = []
    if (mergeTask !== null) {
      mergeTask.process.kill()
    }
  })
  const runMerge = () => {
    if (!mergeQueue.length) {
      mergeTask = null
      mainWindow.webContents.send('local-stories-merge-waiting', [])
      mainWindow.webContents.send('local-stories-merge-task', '', '', 0, 0)
      return ipcMain.emit('local-stories-get')
    }
    const story = mergeQueue.shift()
    mainWindow.webContents.send('local-stories-merge-task', story.title, 'initialize', 0, 1)
    mainWindow.webContents.send('local-stories-merge-waiting', mergeQueue)

    // Unique tmp file per merge so overlapping forks never read each other spec.
    const jsonPath = path.join(initTmpPath('json'), 'stories-merge-' + (mergeCounter++) + '.json')
    fs.writeFileSync(jsonPath, JSON.stringify(story))

    mergeTask = runProcess(
      mainWindow,
      path.join('Stories', 'StoriesMerge.js'),
      [jsonPath],
      () => {},
      (message, current, total) => {
        mainWindow.webContents.send('local-stories-merge-task', story.title, message, current, total)
      },
      (error) => {
        mainWindow.webContents.send('local-stories-merge-error', story.title, error)
      },
      () => runMerge()
    )
  }
  ipcMain.on(
    'local-stories-merge',
    async (event, story) => {
      mergeQueue.push(story)
      if (mergeTask === null) {
        runMerge()
      } else {
        mainWindow.webContents.send('local-stories-merge-waiting', mergeQueue)
      }
    }
  )

  let optimizeTask = null, optimizeQueue = []
  ipcMain.on('stories-optimize-audio-cancel', async () => {
    optimizeQueue = []
    if (optimizeTask !== null) {
      optimizeTask.process.kill()
    }
  })
  const runOptimizeAudio = () => {
    if (!optimizeQueue.length) {
      optimizeTask = null
      mainWindow.webContents.send('stories-optimize-audio-waiting', [])
      mainWindow.webContents.send('stories-optimize-audio-task', '', '', 0, 0)
      return ipcMain.emit('local-stories-get')
    }

    const story = optimizeQueue.shift()
    mainWindow.webContents.send('stories-optimize-audio-task', story.title, 'initialize', 0, 1)
    mainWindow.webContents.send('stories-optimize-audio-waiting', optimizeQueue)

    optimizeTask = runProcess(
      mainWindow,
      path.join('Stories', 'StoriesOptimizeAudio.js'),
      [story.path],
      () => {},
      (message, current, total) => {
        mainWindow.webContents.send('stories-optimize-audio-task', story.title, message, current, total)
      },
      (error) => {
        mainWindow.webContents.send('stories-optimize-audio-error', story.title, error)
      },
      () => runOptimizeAudio()
    )
  }
  ipcMain.on('stories-optimize-audio', async (event, stories) => {
    optimizeQueue = optimizeQueue.concat(stories)
    if (optimizeTask === null) {
      runOptimizeAudio()
    } else {
      mainWindow.webContents.send('stories-optimize-audio-waiting', optimizeQueue)
    }
  })

  ipcMain.on(
    'local-stories-delete',
    async (event, stories) => {
      deleteStories(
        mainWindow,
        'local-stories-delete',
        stories,
        () => ipcMain.emit('local-stories-get')
      )
    }
  )
}

export default mainEventLocalStoriesReader
