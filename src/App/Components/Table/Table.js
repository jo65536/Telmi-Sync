import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useLocale} from '../Locale/LocaleHooks.js'
import {regExpEscape} from '../../Helpers/String.js'
import {useElectronEmitter, useElectronListener} from '../Electron/Hooks/UseElectronEvent.js'

import {findData, isCellSelected, orderIndexes} from './TableHelpers.js'
import TableHeaderIcon from './TableHeaderIcon.js'
import TableCell from './TableCell.js'
import TableGroup from './TableGroup.js'
import TableListRow from './TableListRow.js'

import Loader from '../Loader/Loader.js'

import ButtonIconTrash from '../Buttons/Icons/ButtonIconTrash.js'
import ButtonIconSquareCheck from '../Buttons/Icons/ButtonIconSquareCheck.js'
import ButtonIconDownload from '../Buttons/Icons/ButtonIconDownload.js'
import ButtonIconPen from '../Buttons/Icons/ButtonIconPen.js'
import ButtonIconWave from '../Buttons/Icons/ButtonIconWave.js'
import ButtonIconPlus from '../Buttons/Icons/ButtonIconPlus.js'
import ButtonIconXMark from '../Buttons/Icons/ButtonIconXMark.js'
import ButtonIconListView from '../Buttons/Icons/ButtonIconListView.js'
import ButtonIconGridView from '../Buttons/Icons/ButtonIconGridView.js'

import styles from './Table.module.scss'

const {ipcRenderer} = window.require('electron')

function Table({
                 className,
                 id,
                 titleLeft,
                 titleRight,
                 data,
                 selectedData,
                 onSelect,
                 onSelectAll,
                 onPlay,
                 onStudio,
                 onInfo,
                 onAdd,
                 onEdit,
                 onEditSelected,
                 onOptimizeAudio,
                 onOptimizeAudioSelected,
                 onDownload,
                 onDownloadSelected,
                 onDelete,
                 onDeleteSelected,
                 additionalHeaderButtons,
                 isLoading,
                 emptyMessage,
                 listColumns
               }) {

  const
    {getLocale} = useLocale(),
    [tableState, setTableState] = useState(null),
    [dataFiltered, setDataFiltered] = useState([]),
    [listSort, setListSort] = useState(null),
    viewMode = (tableState !== null && tableState.view === 'list') ? 'list' : 'grid',
    columns = useMemo(
      () => (Array.isArray(listColumns) && listColumns.length) ?
        listColumns :
        [
          {key: 'cellTitle', locale: 'column-name', flex: 3},
          {key: 'cellSubtitle', locale: 'column-details', flex: 2}
        ],
      [listColumns]
    ),
    sortField = listSort !== null ? listSort.field : columns[0].key,
    sortAsc = listSort !== null ? listSort.asc : true,
    searchInput = useRef(),

    onSearch = useCallback(
      () => {
        if (searchInput.current == null) {
          return
        }

        setTableState((tableState) => {
          if (tableState !== null && tableState.search === searchInput.current.value) {
            return tableState
          }
          return {
            group: {},
            ...tableState,
            search: searchInput.current.value
          }
        })

        if (searchInput.current.value === '') {
          setDataFiltered(data)
          return
        }

        const
          regSearch = new RegExp('.*(' + searchInput.current.value.split(' ').map(regExpEscape).join(').*(') + ').*', 'i')
        setDataFiltered(
          data.reduce(
            (acc, d) => {
              if (d.tableGroup !== undefined) {
                const
                  testGroup = regSearch.test(d.tableGroup),
                  children = d.tableChildren.filter(
                    (d) => testGroup || regSearch.test(d.cellTitle) || regSearch.test(d.cellSubtitle)
                  )
                if (children.length) {
                  return [
                    ...acc,
                    {
                      tableGroup: d.tableGroup,
                      tableChildren: children
                    }
                  ]
                }
              } else {
                if (regSearch.test(d.cellTitle) || regSearch.test(d.cellSubtitle)) {
                  return [...acc, d]
                }
              }
              return acc
            },
            []
          )
        )
      },
      [searchInput, data, setDataFiltered]
    ),

    clearSearch = useCallback(
      () => {
        searchInput.current.value = ''
        onSearch()
      },
      [searchInput, onSearch]
    ),

    onCellSelect = useCallback(
      (e, data) => {
        if(typeof onSelect !== 'function') {
          return
        }
        if (e.shiftKey && Array.isArray(selectedData) && selectedData.length) {
          const
            lastDataClicked = selectedData[selectedData.length - 1],
            lastIndexClicked = findData(dataFiltered, lastDataClicked),
            indexClicked = findData(dataFiltered, data)

          if(indexClicked === null || lastIndexClicked === null) {
            return onSelect(data)
          }

          const [firstIndex, lastIndex] = orderIndexes(lastIndexClicked, indexClicked)
          return onSelect(dataFiltered.reduce(
            (acc, d, k) => {
              if(k < firstIndex.index || k > lastIndex.index) {
                return acc
              }
              if(k === firstIndex.index && k === lastIndex.index && firstIndex.isInGroup) {
                return d.tableChildren.slice(firstIndex.indexInGroup, lastIndex.indexInGroup + 1)
              }
              if(k === firstIndex.index && firstIndex.isInGroup) {
                return [...acc, ...d.tableChildren.slice(firstIndex.indexInGroup)]
              }
              if(k === lastIndex.index && lastIndex.isInGroup) {
                return [...acc, ...d.tableChildren.slice(0, lastIndex.indexInGroup + 1)]
              }
              if(d.tableGroup !== undefined) {
                return [...acc, ...d.tableChildren]
              }
              return [...acc, d]
            },
            []
          ))
        }
        onSelect(data)
      },
      [dataFiltered, onSelect, selectedData]
    ),

    onToggleView = useCallback(
      () => setTableState((tableState) => ({
        search: '',
        group: {},
        ...tableState,
        view: (tableState !== null && tableState.view === 'list') ? 'grid' : 'list'
      })),
      [setTableState]
    ),

    onListSortBy = useCallback(
      (field) => setListSort((listSort) => ({
        field,
        asc: (listSort !== null && listSort.field === field) ? !listSort.asc : true
      })),
      [setListSort]
    ),

    listRows = useMemo(
      () => {
        if (viewMode !== 'list') {
          return []
        }
        const
          rows = dataFiltered.reduce(
            (acc, d) => {
              if (d.tableGroup !== undefined) {
                acc.push(...d.tableChildren)
              } else {
                acc.push(d)
              }
              return acc
            },
            []
          ),
          dir = sortAsc ? 1 : -1
        return rows.sort((a, b) => {
          const va = a[sortField], vb = b[sortField]
          if (typeof va === 'number' && typeof vb === 'number') {
            return dir * (va - vb)
          }
          return dir * String(va === undefined || va === null ? '' : va).localeCompare(String(vb === undefined || vb === null ? '' : vb), undefined, {numeric: true})
        })
      },
      [dataFiltered, viewMode, sortField, sortAsc]
    ),

    onListSelect = useCallback(
      (e, data) => {
        if (typeof onSelect !== 'function') {
          return
        }
        if (e.shiftKey && Array.isArray(selectedData) && selectedData.length) {
          const
            lastDataClicked = selectedData[selectedData.length - 1],
            i1 = listRows.findIndex((r) => r.cellId === lastDataClicked.cellId),
            i2 = listRows.findIndex((r) => r.cellId === data.cellId)
          if (i1 !== -1 && i2 !== -1) {
            const [a, b] = i1 < i2 ? [i1, i2] : [i2, i1]
            return onSelect(listRows.slice(a, b + 1))
          }
        }
        onSelect(data)
      },
      [onSelect, selectedData, listRows]
    ),

    onSelectAllCallback = useCallback(
      () => typeof onSelectAll === 'function' && onSelectAll(
        dataFiltered.reduce(
          (acc, d) => d.tableGroup !== undefined ? [...acc, ...d.tableChildren] : [...acc, d],
          []
        )
      ),
      [onSelectAll, dataFiltered]
    )

  useElectronEmitter('tablestate-get', [id, data])
  useElectronListener(
    'tablestate-data',
    (tableId, tableState) => {
      if (data.length === 0 || tableId !== id) {
        return
      }
      setTableState({
        search: tableState === null ? '' : tableState.search,
        view: (tableState !== null && tableState.view === 'list') ? 'list' : 'grid',
        group: data.reduce(
          (acc, v) => {
            if (v.tableGroup === undefined) {
              return acc
            }
            return {
              ...acc,
              [v.tableGroup]: {
                display: (tableState === null || tableState.group[v.tableGroup] === undefined) ? (v.tableGroupDisplay || 0) : tableState.group[v.tableGroup].display,
                collapsed: (tableState === null || tableState.group[v.tableGroup] === undefined) ? (v.collapsed || false) : tableState.group[v.tableGroup].collapsed
              }
            }
          },
          {}
        )
      })
    },
    [id, data]
  )

  useEffect(
    () => {
      if (searchInput.current == null || tableState === null) {
        return
      }
      searchInput.current.value = tableState.search
      onSearch()
    },
    [tableState, searchInput, onSearch]
  )

  useEffect(
    () => {
      const timeout = setTimeout(
        () => {
          if (tableState !== null) {
            ipcRenderer.send('tablestate-save', id, tableState)
          }
        },
        500
      )
      return () => clearTimeout(timeout)
    },
    [id, tableState]
  )

  return <div className={[styles.tableContainer, className].join(' ')}>
    <div className={styles.header}>
      <h2 className={styles.headerTitleLeft}>{titleLeft}</h2>
      {titleRight && <p className={styles.headerTitleRight}>{titleRight}</p>}
      {
        (onAdd || onSelectAll || onDeleteSelected || onDownloadSelected || onEditSelected || onOptimizeAudioSelected || additionalHeaderButtons) &&
        <ul className={styles.headerIcons}>
          {
            onOptimizeAudioSelected && selectedData.length > 0 &&
            <TableHeaderIcon componentIcon={ButtonIconWave}
                             title="telmios-optimize-audio"
                             onClick={onOptimizeAudioSelected}/>
          }
          {
            onEditSelected && selectedData.length > 0 &&
            <TableHeaderIcon componentIcon={ButtonIconPen}
                             title="edit-selected"
                             onClick={onEditSelected}/>
          }
          {
            onDownloadSelected && selectedData.length > 0 &&
            <TableHeaderIcon componentIcon={ButtonIconDownload}
                             title="download-selected"
                             onClick={onDownloadSelected}/>
          }
          {
            onDeleteSelected && selectedData.length > 0 &&
            <TableHeaderIcon componentIcon={ButtonIconTrash}
                             title="delete-selected"
                             onClick={onDeleteSelected}/>
          }
          {
            onSelectAll &&
            <TableHeaderIcon componentIcon={ButtonIconSquareCheck}
                             title="select-all"
                             onClick={onSelectAllCallback}/>
          }
          {
            onAdd &&
            <TableHeaderIcon componentIcon={ButtonIconPlus}
                             title="story-create"
                             onClick={onAdd}/>
          }
          {additionalHeaderButtons || null}
        </ul>
      }

      <ul className={styles.headerIcons}>
        <TableHeaderIcon componentIcon={viewMode === 'list' ? ButtonIconGridView : ButtonIconListView}
                         title={viewMode === 'list' ? 'view-grid' : 'view-list'}
                         onClick={onToggleView}/>
      </ul>

      <div className={styles.headerSearchContainer}>
        <input type="text"
               placeholder={getLocale('search') + '...'}
               ref={searchInput}
               className={styles.headerSearchInput}
               onKeyUp={onSearch}/>
        <ButtonIconXMark className={styles.headerSearchReset}
                         onClick={clearSearch}/>
      </div>

    </div>
    <div className={styles.content}>
      <div className={styles.contentScroller}>
        {
          !isLoading && dataFiltered.length === 0 && (tableState !== null || data.length === 0) &&
          <p className={styles.emptyState}>{
            (tableState !== null && tableState.search !== '' && data.length > 0) ?
              getLocale('table-empty-search', tableState.search) :
              (emptyMessage || getLocale('table-empty'))
          }</p>
        }
        {
          viewMode === 'list' && dataFiltered.length > 0 &&
          <ul className={styles.listView}>
            <li className={styles.listViewHeader}>
              <span className={styles.listViewHeaderImage}/>
              {
                columns.map((c) => <button key={'col-' + c.key}
                                           className={styles.listViewHeaderCol}
                                           style={{flex: (c.flex || 1) + ' 1 0'}}
                                           onClick={() => onListSortBy(c.key)}>
                  {getLocale(c.locale) + (sortField === c.key ? (sortAsc ? ' \u25b4' : ' \u25be') : '')}
                </button>)
              }
              <span className={styles.listViewHeaderActions}/>
            </li>
            {
              listRows.map((v, k) => <TableListRow key={'row-' + k}
                                                   data={v}
                                                   columns={columns}
                                                   selected={isCellSelected(selectedData, v)}
                                                   onSelect={onListSelect}
                                                   onPlay={onPlay}
                                                   onStudio={onStudio}
                                                   onOptimizeAudio={onOptimizeAudio}
                                                   onEdit={onEdit}
                                                   onInfo={onInfo}
                                                   onDownload={onDownload}
                                                   onDelete={onDelete}/>)
            }
          </ul>
        }
        {viewMode !== 'list' && <ul className={styles.cells}>{
          dataFiltered.map((v, k) => {
            if (v.tableGroup !== undefined) {
              return <TableGroup key={'cell-' + k}
                                 data={v}
                                 tableState={tableState}
                                 setTableState={setTableState}
                                 selectedData={selectedData}
                                 onSelect={onCellSelect}
                                 onSelectAll={onSelectAll}
                                 onPlay={onPlay}
                                 onStudio={onStudio}
                                 onOptimizeAudio={onOptimizeAudio}
                                 onEdit={onEdit}
                                 onInfo={onInfo}
                                 onDownload={onDownload}
                                 onDelete={onDelete}/>
            } else {
              return <TableCell key={'cell-' + k}
                                data={v}
                                selected={isCellSelected(selectedData, v)}
                                onSelect={onCellSelect}
                                onPlay={onPlay}
                                onStudio={onStudio}
                                onOptimizeAudio={onOptimizeAudio}
                                onEdit={onEdit}
                                onInfo={onInfo}
                                onDownload={onDownload}
                                onDelete={onDelete}/>
            }
          })
        }</ul>}
      </div>
    </div>
    {isLoading && <Loader/>}
  </div>

}

export default Table
