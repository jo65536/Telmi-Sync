import { useCallback, useState } from 'react'
import { useTelmiOS } from '../../../Components/TelmiOS/TelmiOSHooks.js'
import { useModal } from '../../../Components/Modal/ModalHooks.js'
import { useTaskManager } from '../../../Components/TaskManager/TaskManagerHooks.js'

import StoriesTable from './StoriesTable.js'
import ModalStoriesTransfer from './ModalStoriesTransfer.js'
import TelmiOSLayout from '../TelmiOS/TelmiOSLayout.js'

import styles from '../Synchronize.module.scss'

function StoriesTelmiOSContent ({selectedLocalStories, setSelectedLocalStories}) {
  const
    {addModal, rmModal} = useModal(),
    {startTask} = useTaskManager(),
    telmiOS = useTelmiOS(),
    [selectedTelmiOSStories, setSelectedTelmiOSStories] = useState([]),
    onDelete = useCallback(
      (stories) => startTask('telmios-stories-delete', [telmiOS, stories]),
      [telmiOS, startTask]
    ),
    onTransfer = useCallback(
      () => {
        addModal((key) => {
          const modal = <ModalStoriesTransfer key={key}
                                              stories={selectedLocalStories}
                                              telmiOS={telmiOS}
                                              onClose={() => {
                                                rmModal(modal)
                                                setSelectedLocalStories([])
                                              }}/>
          return modal
        })
      },
      [telmiOS, setSelectedLocalStories, selectedLocalStories, addModal, rmModal]
    )

  return <TelmiOSLayout telmiOS={telmiOS}
                        onTransfer={selectedLocalStories.length ? onTransfer : undefined}>
    <StoriesTable id="stories-telmios"
                  titleLocaleKey="stories-telmios"
                  className={styles.telmiOSTable}
                  stories={telmiOS.stories}
                  onDelete={onDelete}
                  setSelectedStories={setSelectedTelmiOSStories}
                  selectedStories={selectedTelmiOSStories}/>
  </TelmiOSLayout>
}

export default StoriesTelmiOSContent
