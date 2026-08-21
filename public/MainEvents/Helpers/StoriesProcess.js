import * as path from 'path'
import runProcess from '../Processes/RunProcess.js'

// One queue per task channel: a second batch requested while one is running
// would otherwise fork a concurrent child writing to the same task row
// (interleaved frames, premature terminal frame, auto-dismiss mid-run).
const deleteQueues = {}

const
  runNextDelete = (mainWindow, taskName) => {
    const
      queue = deleteQueues[taskName],
      {stories, onFinished} = queue[0],
      titles = stories.map((s) => s.title || path.basename(s.path))

    runProcess(
      mainWindow,
      path.join('Stories', 'StoriesDelete.js'),
      stories.map((s) => s.path),
      () => {
      },
      (message, current, total) => {
        const idx = parseInt(current, 10)
        mainWindow.webContents.send(
          taskName + '-task',
          idx >= 1 && idx <= titles.length ? titles[idx - 1] : '',
          message,
          current,
          total
        )
      },
      (error) => {
        mainWindow.webContents.send(taskName + '-error', 'task-stories-delete', error)
      },
      () => {
        queue.shift()
        if (queue.length === 0) {
          mainWindow.webContents.send(taskName + '-task', '', '', 0, 0)
        }
        onFinished()
        if (queue.length > 0) {
          runNextDelete(mainWindow, taskName)
        }
      }
    )
  },

  // Runs the delete child as a tracked task on `<taskName>-task`: forwards its
  // `*stories-deleting*i*N*` frames with the story being deleted as title, and
  // closes the task with the terminal frame once the queue drains. `stories`
  // is the renderer's story list ({path, title}).
  deleteStories = (mainWindow, taskName, stories, onFinished) => {
    if (!Array.isArray(stories) || stories.length === 0) {
      const queue = deleteQueues[taskName]
      if (queue === undefined || queue.length === 0) {
        mainWindow.webContents.send(taskName + '-task', '', '', 0, 0)
      }
      return false
    }

    const queue = deleteQueues[taskName] = deleteQueues[taskName] || []
    queue.push({stories, onFinished})
    if (queue.length === 1) {
      runNextDelete(mainWindow, taskName)
    }
    return true
  }

export {deleteStories}
