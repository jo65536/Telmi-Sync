import { useCallback } from 'react'
import { useTaskManager } from '../../Components/TaskManager/TaskManagerHooks.js'
import { useElectronListener } from '../../Components/Electron/Hooks/UseElectronEvent.js'
import DropFiles from '../../Components/DropFiles/DropFiles.js'

function Import ({children}) {
  const
    {startTask} = useTaskManager(),
    onFilesDropped = useCallback(
      (filesPath) => startTask('import', [filesPath], {cancellable: true}),
      [startTask]
    )

  useElectronListener(
    'import-files-selected',
    (filesPath) => onFilesDropped(filesPath),
    [onFilesDropped]
  )

  return <DropFiles onFilesDropped={onFilesDropped}>{children}</DropFiles>
}

export default Import
