import { useEffect } from 'react'
import { useTaskManager } from '../../../../Components/TaskManager/TaskManagerHooks.js'

// Fires the background task and removes itself immediately: the modal never
// shows; progress lives in the global task bar.
function ModalStoreAudioBuilder ({audioList, onClose}) {
  const {startTask} = useTaskManager()
  useEffect(() => {
    startTask('store-build', [audioList], {cancellable: true})
    onClose()
  }, []) // eslint-disable-line

  return null
}

export default ModalStoreAudioBuilder
