import { useLocale } from '../Locale/LocaleHooks.js'
import { useCallback } from 'react'

import ButtonIconTrash from '../Buttons/Icons/ButtonIconTrash.js'
import ButtonIconWave from '../Buttons/Icons/ButtonIconWave.js'
import ButtonIconPen from '../Buttons/Icons/ButtonIconPen.js'
import ButtonIconDownload from '../Buttons/Icons/ButtonIconDownload.js'
import ButtonIconInfo from '../Buttons/Icons/ButtonIconInfo.js'
import ButtonIconPlay from '../Buttons/Icons/ButtonIconPlay.js'
import ButtonIconMicrophone from '../Buttons/Icons/ButtonIconMicrophone.js'

import styles from './Table.module.scss'

function TableListRow ({data, selected, onSelect, onPlay, onStudio, onInfo, onOptimizeAudio, onEdit, onDownload, onDelete}) {
  const
    {getLocale} = useLocale(),
    action = (callback) => (e) => {
      e.preventDefault()
      e.stopPropagation()
      typeof callback === 'function' && callback(data)
    },
    onRSelect = useCallback(
      (e) => typeof onSelect === 'function' && onSelect(e, data),
      [onSelect, data]
    )

  return <li className={[styles.listRow, selected ? styles.listRowSelected : '', data.cellDisabled ? styles.listRowDisabled : ''].join(' ')}
             onClick={onRSelect}>
    <img src={data.image} className={styles.listRowImage} alt="" loading="lazy"/>
    <span className={styles.listRowTitle} title={data.cellTitle}>{data.cellTitle}</span>
    <span className={styles.listRowSubtitle} title={data.cellSubtitle}>{data.cellSubtitle || ''}</span>
    <span className={styles.listRowActions}>
      {onStudio && <ButtonIconMicrophone title={getLocale('studio-edit-story')} onClick={action(onStudio)} className={styles.listRowActionButton}/>}
      {onPlay && <ButtonIconPlay title={getLocale('story-play')} onClick={action(onPlay)} className={styles.listRowActionButton}/>}
      {onInfo && <ButtonIconInfo title={getLocale('infos')} onClick={action(onInfo)} className={styles.listRowActionButton}/>}
      {onOptimizeAudio && <ButtonIconWave title={getLocale('telmios-optimize-audio')} onClick={action(onOptimizeAudio)} className={styles.listRowActionButton}/>}
      {onEdit && <ButtonIconPen title={getLocale('edit-metadata')} onClick={action(onEdit)} className={styles.listRowActionButton}/>}
      {onDownload && <ButtonIconDownload title={getLocale('download')} onClick={action(onDownload)} className={styles.listRowActionButton}/>}
      {onDelete && <ButtonIconTrash title={getLocale('delete')} onClick={action(onDelete)} className={styles.listRowActionButton}/>}
    </span>
  </li>
}

export default TableListRow
