import { createContext } from 'react'

const TaskManagerContext = createContext({
  tasks: [],
  startTask: () => {},
  cancelTask: () => {},
  dismissTask: () => {}
})

export default TaskManagerContext
