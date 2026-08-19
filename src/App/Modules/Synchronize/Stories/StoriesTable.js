import {useCallback, useEffect, useMemo, useState} from 'react'
import {useModal} from '../../../Components/Modal/ModalHooks.js'
import {useLocale} from '../../../Components/Locale/LocaleHooks.js'
import {isCellSelected} from '../../../Components/Table/TableHelpers.js'
import {storiesClassification} from './StoriesClassification.js'
import Table from '../../../Components/Table/Table.js'
import TableHeaderIcon from '../../../Components/Table/TableHeaderIcon.js'
import ButtonIconSort from '../../../Components/Buttons/Icons/ButtonIconSort.js'
import ModalStoryFormUpdate from './ModalStoryFormUpdate.js'
import ModalStoryDeleteConfirm from './ModalStoryDeleteConfirm.js'
import ModalStoriesDeleteConfirm from './ModalStoriesDeleteConfirm.js'
import ModalStoriesFormUpdate from './ModalStoriesFormUpdate.js'


const storiesListColumns = [
  {key: 'title', locale: 'column-name', flex: 3},
  {key: 'category', locale: 'column-category', flex: 2},
  {key: 'age', locale: 'column-age', flex: 1}
]

const sortTableData = (data, asc) => {
  const
    dir = asc ? 1 : -1,
    label = (v) => String(v.tableGroup !== undefined ? v.tableGroup : v.cellTitle),
    byTitle = (a, b) => dir * String(a.cellTitle).localeCompare(String(b.cellTitle), undefined, {numeric: true})
  return data
    .map((v) => v.tableGroup === undefined ? v : {...v, tableChildren: [...v.tableChildren].sort(byTitle)})
    .sort((a, b) => dir * label(a).localeCompare(label(b), undefined, {numeric: true}))
}

const
  storiesIds = {},
  storyGetId = (str) => {
    if (storiesIds[str] === undefined) {
      storiesIds[str] = Object.values(storiesIds).length
    }
    return storiesIds[str]
  }

function StoriesTable({
                        stories,
                        className,
                        id,
                        emptyMessage,
                        titleLocaleKey,
                        onPlay,
                        onAdd,
                        onStudio,
                        onEdit,
                        onEditSelected,
                        onDelete,
                        onOptimizeAudio,
                        onOptimizeAudioSelected,
                        selectedStories,
                        setSelectedStories,
                        additionalHeaderButtons
                      }) {
  const
    {getLocale} = useLocale(),
    {addModal, rmModal} = useModal(),
    [isLoadingStories, setIsLoadingStories] = useState(false),
    [isSortedAsc, setSortedAsc] = useState(true),

    {flatTableStories, tableStories} = useMemo(
      () => {
        const flatStories = stories.map((s) => ({
          ...s,
          cellId: storyGetId(s.uuid || s.title),
          cellTitle: (s.age !== undefined ? s.age + '+] ' : '') + s.title,
          cellSubtitle: s.category,
        }))
        return {
          flatTableStories: flatStories,
          tableStories: storiesClassification(flatStories)
        }
      },
      [stories]
    ),

    sortedTableStories = useMemo(
      () => sortTableData(tableStories, isSortedAsc),
      [tableStories, isSortedAsc]
    ),

    onToggleSort = useCallback(() => setSortedAsc((v) => !v), [setSortedAsc]),

    onSelect = useCallback(
      (story) => setSelectedStories((stories) => {
        if (Array.isArray(story)) {
          return [
            ...stories.reduce((acc, s) => isCellSelected(story, s) ? acc : [...acc, s], []),
            ...story
          ]
        }
        if (isCellSelected(stories, story)) {
          return stories.filter((v) => v.cellId !== story.cellId)
        } else {
          return [...stories, story]
        }
      }),
      [setSelectedStories]
    ),
    onSelectAll = useCallback(
      (stories) => setSelectedStories((currentStories) => {
        if (stories.reduce((acc, story) => isCellSelected(currentStories, story) ? acc + 1 : acc, 0) === stories.length) {
          return currentStories.filter((story) => !isCellSelected(stories, story))
        }
        return [...currentStories, ...stories.filter((story) => !isCellSelected(currentStories, story))]
      }),
      [setSelectedStories]
    ),
    callbackOnEdit = useCallback(
      (story) => {
        addModal((key) => {
          const modal = <ModalStoryFormUpdate key={key}
                                              story={story}
                                              onValidate={(story) => {
                                                onEdit(story)
                                                setIsLoadingStories(true)
                                                setSelectedStories([])
                                              }}
                                              onClose={() => rmModal(modal)}/>
          return modal
        })
      },
      [onEdit, setSelectedStories, setIsLoadingStories, addModal, rmModal]
    ),
    callbackOnEditSelected = useCallback(
      () => {
        addModal((key) => {
          const modal = <ModalStoriesFormUpdate key={key}
                                                stories={selectedStories}
                                                onValidate={(stories) => {
                                                  onEditSelected(stories)
                                                  setIsLoadingStories(true)
                                                  setSelectedStories([])
                                                }}
                                                onClose={() => rmModal(modal)}/>
          return modal
        })
      },
      [onEditSelected, selectedStories, setSelectedStories, setIsLoadingStories, addModal, rmModal]
    ),
    callbackOnDelete = useCallback(
      (story) => {
        addModal((key) => {
          const modal = <ModalStoryDeleteConfirm key={key}
                                                 story={story}
                                                 onConfirm={() => {
                                                   onDelete([story])
                                                   setIsLoadingStories(true)
                                                   setSelectedStories([])
                                                 }}
                                                 onClose={() => rmModal(modal)}/>
          return modal
        })
      },
      [onDelete, setSelectedStories, setIsLoadingStories, addModal, rmModal]
    ),

    callbackOnDeleteSelected = useCallback(
      () => {
        if (!selectedStories.length) {
          return
        }
        addModal((key) => {
          const modal = <ModalStoriesDeleteConfirm key={key}
                                                   onConfirm={() => {
                                                     onDelete(selectedStories)
                                                     setIsLoadingStories(true)
                                                     setSelectedStories([])
                                                   }}
                                                   onClose={() => rmModal(modal)}/>
          return modal
        })
      },
      [onDelete, selectedStories, setSelectedStories, setIsLoadingStories, addModal, rmModal]
    )

  useEffect(() => {setIsLoadingStories(false)}, [stories, setIsLoadingStories])

  return <Table titleLeft={getLocale(titleLocaleKey || 'stories-local', flatTableStories.length)}
                titleRight={selectedStories.length ? getLocale('stories-selected', selectedStories.length) : undefined}
                className={className}
                id={id}
                data={sortedTableStories}
                selectedData={selectedStories}
                onSelect={onSelect}
                onSelectAll={onSelectAll}
                onStudio={onStudio}
                onPlay={onPlay}
                onAdd={onAdd}
                onOptimizeAudio={onOptimizeAudio}
                onOptimizeAudioSelected={onOptimizeAudioSelected}
                onEdit={onEdit !== undefined ? callbackOnEdit : undefined}
                onEditSelected={onEditSelected !== undefined ? callbackOnEditSelected : undefined}
                onDelete={callbackOnDelete}
                onDeleteSelected={callbackOnDeleteSelected}
                additionalHeaderButtons={<>
                  <TableHeaderIcon componentIcon={ButtonIconSort}
                                   title={isSortedAsc ? 'sorted-asc' : 'sorted-desc'}
                                   onClick={onToggleSort}/>
                  {additionalHeaderButtons || null}
                </>}
                isLoading={isLoadingStories}
                emptyMessage={emptyMessage}
                listColumns={storiesListColumns}/>
}


export default StoriesTable
