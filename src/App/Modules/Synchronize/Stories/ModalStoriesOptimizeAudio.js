import { useEffect } from 'react'
import { useTaskManager } from '../../../Components/TaskManager/TaskManagerHooks.js'

// Fires the background task and removes itself immediately: the modal never
// shows; progress lives in the global task bar.
function ModalStoriesOptimizeAudio ({stories, onClose}) {
  const {startTask} = useTaskManager()
  useEffect(() => {
    startTask('stories-optimize-audio', [stories], {cancellable: false})
    onClose()
  }, []) // eslint-disable-line

  return null
}

export default ModalStoriesOptimizeAudio
