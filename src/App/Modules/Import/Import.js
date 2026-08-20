import { useCallback } from 'react'
import { useTaskManager } from '../../Components/TaskManager/TaskManagerHooks.js'
import { useElectronListener } from '../../Components/Electron/Hooks/UseElectronEvent.js'
import DropFiles from '../../Components/DropFiles/DropFiles.js'

function Import ({children}) {
  const
    {importFiles} = useTaskManager(),
    onFilesDropped = useCallback(
      (filesPath) => importFiles(filesPath),
      [importFiles]
    )

  useElectronListener(
    'import-files-selected',
    (filesPath) => onFilesDropped(filesPath),
    [onFilesDropped]
  )

  return <DropFiles onFilesDropped={onFilesDropped}>{children}</DropFiles>
}

export default Import
