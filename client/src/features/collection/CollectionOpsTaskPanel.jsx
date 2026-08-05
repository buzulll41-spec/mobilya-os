/** @typedef {import('./collectionOpsTasksUi.js').CollectionOpsTask} CollectionOpsTask */

/**
 * @param {{ tasks: CollectionOpsTask[] }} props
 */
export default function CollectionOpsTaskPanel({ tasks }) {
  return (
    <aside className="coll-desk-aside" aria-labelledby="coll-desk-tasks-title">
      <h2 id="coll-desk-tasks-title" className="coll-desk-aside__title">
        Bugünün görevleri
      </h2>
      {tasks.length === 0 ? (
        <p className="coll-desk-aside__empty">Bugün için planlanmış görev yok.</p>
      ) : (
        <ul className="coll-desk-task-list">
          {tasks.map((task) => (
            <li key={task.id} className="coll-desk-task">
              <span className="coll-desk-task__box" aria-hidden>
                □
              </span>
              <span className="coll-desk-task__label">{task.label}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
