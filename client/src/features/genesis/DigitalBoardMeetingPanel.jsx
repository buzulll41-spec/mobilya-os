import { memo } from 'react'

/**
 * @param {{ meeting: { hasMeeting: boolean, ceoSummary: string, transcript: { speaker: string, message: string }[] } }} props
 */
function DigitalBoardMeetingPanel({ meeting }) {
  return (
    <section className="mos-erp-cockpit-section genesis-board" aria-label="Digital Board Meeting">
      <h2 className="mos-erp-cockpit-section__title">DIGITAL BOARD MEETING</h2>
      <p className="genesis-board__summary">{meeting.ceoSummary}</p>
      {meeting.hasMeeting ? (
        <ul className="genesis-board__transcript">
          {meeting.transcript.map((line, idx) => (
            <li key={`${line.speaker}-${idx}`}>
              <strong>{line.speaker}:</strong> {line.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default memo(DigitalBoardMeetingPanel)
