import { useEffect, useMemo, useState } from 'react'
import { useElectronEmitter, useElectronListener } from '../Electron/Hooks/UseElectronEvent.js'
import TelmiOSContext from './TelmiOSContext.js'
import { useTaskManager } from '../TaskManager/TaskManagerHooks.js'

const telmiOSToString = (telmiOS) => {
  return telmiOS === null ?
    '' :
    telmiOS.drive + '_' + telmiOS.telmiOS.label + '-v' + telmiOS.telmiOS.version.major + '.' + telmiOS.telmiOS.version.minor + '.' + telmiOS.telmiOS.version.fix
}

function TelmiOSProvider ({children}) {
  const
    [telmiOS, setTelmiOS] = useState(null),
    [diskusage, setDiskusage] = useState(null),
    [stories, setStories] = useState([]),
    [music, setMusic] = useState([]),
    {startTask} = useTaskManager(),
    data = useMemo(() => ({...telmiOS, diskusage, stories, music}), [telmiOS, diskusage, stories, music])

  useElectronListener(
    'telmios-data',
    (t) => {
      if (telmiOSToString(t) !== telmiOSToString(telmiOS)) {
        setTelmiOS(t)
        if(t === null) {
          setDiskusage(null)
          setStories([])
          setMusic([])
        }
      }
    },
    [setTelmiOS, telmiOS]
  )

  useElectronListener('telmios-diskusage-data', (du) => setDiskusage(du), [setDiskusage])
  useElectronEmitter('telmios-diskusage', [telmiOS])

  useEffect(
    () => {
      if (telmiOS !== null) {
        startTask('telmios-update', [telmiOS], {cancellable: false})
      }
    },
    [telmiOS, startTask]
  )

  useElectronListener('telmios-stories-data', (telmiOSStories) => setStories(telmiOSStories), [setStories])
  useElectronEmitter('telmios-stories-get', [telmiOS])

  useElectronListener('telmios-musics-data', (telmiOSMusics) => setMusic(telmiOSMusics), [setMusic])
  useElectronEmitter('telmios-musics-get', [telmiOS])

  return <TelmiOSContext.Provider value={data}>{children}</TelmiOSContext.Provider>
}

export default TelmiOSProvider
