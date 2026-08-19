import {useCallback} from 'react'
import {useStoreContent} from '../StoreHooks.js'
import {useModal} from '../../../../Components/Modal/ModalHooks.js'
import {useLocale} from '../../../../Components/Locale/LocaleHooks.js'
import {stringSlugify} from '../../../../Helpers/String.js'
import Table from '../../../../Components/Table/Table.js'
import ButtonExternalLink from '../../../../Components/Link/ButtonExternalLink.js'
import ModalStoreDownload from './ModalStoreDownload.js'

import styles from './StorePacksList.module.scss'

const packsListColumns = [
  {key: 'title', locale: 'column-name', flex: 3},
  {key: 'category', locale: 'column-category', flex: 2},
  {key: 'age', locale: 'column-age', flex: 1},
  {key: 'author', locale: 'column-author', flex: 2},
  {key: 'updated_at', locale: 'column-updated', flex: 1, format: (v) => v ? new Date(v).toLocaleDateString() : ''},
  {key: 'download_count', locale: 'column-downloads', flex: 1}
]

function StorePacksListContent({store, storeData}) {
  const
    {getLocale} = useLocale(),
    {addModal, rmModal} = useModal(),
    {
      stories,
      storiesSelected,
      setStoriesSelected,
      isSortedByName,
      isSortedAsc,
      onInfo,
      onSelect,
      onSelectAll,
      additionalHeaderButtons
    } = useStoreContent(store, storeData),

    onDownloadSelected = useCallback(
      () => {
        addModal((key) => {
          const modal = <ModalStoreDownload key={key}
                                            stories={storiesSelected}
                                            onClose={() => {
                                              rmModal(modal)
                                              setStoriesSelected([])
                                            }}/>
          return modal
        })
      },
      [addModal, storiesSelected, rmModal, setStoriesSelected]
    ),
    onDownload = useCallback(
      (story) => {
        addModal((key) => {
          const modal = <ModalStoreDownload key={key}
                                            stories={[story]}
                                            onClose={() => {
                                              rmModal(modal)
                                              setStoriesSelected([])
                                            }}/>
          return modal
        })
      },
      [addModal, rmModal, setStoriesSelected]
    )

  return <>
    <Table
      id={stringSlugify(store.url)}
      titleLeft={getLocale('stories-on-store', stories.length) + ' (' + (isSortedByName ? getLocale('sorted-by-name') : getLocale('sorted-by-date')) + ' ' + (isSortedAsc ? getLocale('sorted-asc') : getLocale('sorted-desc')) + ')'}
      titleRight={storiesSelected.length ? getLocale('stories-selected', storiesSelected.length) : undefined}
      data={stories}
      onInfo={onInfo}
      selectedData={storiesSelected}
      onSelect={onSelect}
      onSelectAll={onSelectAll}
      onDownload={onDownload}
      onDownloadSelected={onDownloadSelected}
      additionalHeaderButtons={additionalHeaderButtons}
      isLoading={storeData === null}
      listColumns={packsListColumns}/>
    {
      storeData !== null && storeData.banner !== undefined &&
      <ButtonExternalLink href={storeData.banner.link}>
        <div className={styles.bannerContainer} style={{background: storeData.banner.background}}>
          <div className={styles.bannerInnerContainer}>
            <img className={styles.banner} src={storeData.banner.image} alt=""/>
          </div>
        </div>
      </ButtonExternalLink>
    }
  </>
}

export default StorePacksListContent
