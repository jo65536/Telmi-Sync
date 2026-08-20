// Every long-running task routed through the background task manager. Each has
// a main-process handler emitting `<name>-task` / `-waiting` / `-error`, and a
// `<name>-cancel` channel when cancellable. Interactive in-form helpers
// (local-musics-cover, file-copy) are intentionally excluded — they are not
// background transfers.
const TASK_REGISTRY = [
  {name: 'import', label: 'task-import', cancellable: true},
  {name: 'musics-transfer', label: 'task-musics-transfer', cancellable: true},
  {name: 'stories-transfer', label: 'task-stories-transfer', cancellable: true},
  {name: 'store-download', label: 'task-store-download', cancellable: true},
  {name: 'store-build', label: 'task-store-build', cancellable: true},
  {name: 'stories-optimize-audio', label: 'task-stories-optimize', cancellable: false},
  {name: 'local-stories-merge', label: 'task-stories-merge', cancellable: false},
  {name: 'telmios-eject', label: 'task-telmios-eject', cancellable: false},
  {name: 'telmios-cardmaker', label: 'task-telmios-cardmaker', cancellable: false},
  {name: 'telmios-update', label: 'task-telmios-update', cancellable: false}
]

const TASK_BY_NAME = TASK_REGISTRY.reduce((acc, t) => ({...acc, [t.name]: t}), {})

export { TASK_REGISTRY, TASK_BY_NAME }
