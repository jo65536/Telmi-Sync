import { useEffect } from 'react'
import { useTaskManager } from '../../../Components/TaskManager/TaskManagerHooks.js'

// Fires the background task and removes itself immediately: the modal never
// shows; progress lives in the global task bar.
function ModalTelmiOSEject ({telmiOS, onClose}) {
  const {startTask} = useTaskManager()
  useEffect(() => {
    startTask('telmios-eject', [telmiOS], {cancellable: false})
    onClose()
  }, []) // eslint-disable-line

  return null
}

export default ModalTelmiOSEject
