import {useState} from 'react'
import {useElectronEmitter, useElectronListener} from '../../../Components/Electron/Hooks/UseElectronEvent.js'
import StoreAudioListContent from './AudioList/StoreAudioListContent.js'
import StorePacksListContent from './PacksList/StorePacksListContent.js'

function StoreContent({store}) {
  const [storeData, setStoreData] = useState(null)

  useElectronListener(
    'store-remote-data',
    (response) => {
      if (response !== null && typeof response === 'object' && response.url === store.url) {
        setStoreData(response)
      }
    },
    [store.url]
  )
  useElectronEmitter('store-remote-get', [store])

  return storeData !== null && storeData.audioList ?
    <StoreAudioListContent store={store} storeData={storeData}/> :
    <StorePacksListContent store={store} storeData={storeData}/>
}

export default StoreContent
