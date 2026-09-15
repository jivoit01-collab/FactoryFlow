import { ADMIN_BOARD_MAX_ALERTS } from '../constants';
import type { AdminAlert, AdminAlertSeverity } from '../types';

const SEVERITY_CLASS: Record<AdminAlertSeverity, string> = {
  critical: 'adm-a-crit',
  warning: 'adm-a-warn',
  info: 'adm-a-info',
};

/**
 * A mark per severity, so severity is never carried by colour alone.
 *
 * Text rather than an icon component: everything on this board is sized against
 * `--u` and scales with the screen, and an icon from the set would carry its
 * own fixed pixel size into a layout that has none.
 */
const SEVERITY_MARK: Record<AdminAlertSeverity, string> = {
  critical: '!',
  warning: '▲',
  info: 'i',
};

const SEVERITY_WORD: Record<AdminAlertSeverity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Note',
};

export interface AdminActionsProps {
  alerts: AdminAlert[];
  /** Tiles that could not be read — named, so silence is not read as calm. */
  degraded: string[];
}

/**
 * The action centre: what somebody has to do about the three tiles above.
 *
 * THE EMPTY STATE IS TWO DIFFERENT STATES AND THEY MUST NOT LOOK ALIKE.
 * No alerts because every rule passed is good news. No alerts because the tiles
 * those rules read never loaded is the opposite, and a green "all clear"
 * derived from having learned nothing is the most dangerous thing this panel
 * could show. So a degraded board says so instead.
 *
 * The rules themselves live server-side in `admin_board/alerts.py` — the
 * thresholds are the part a business argues about, and deriving them here would
 * put the definitions in the one place that cannot be tested against live data.
 */
export function AdminActions({ alerts, degraded }: AdminActionsProps) {
  const counts = alerts.reduce<Record<string, number>>((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] ?? 0) + 1;
    return acc;
  }, {});

  const shown = alerts.slice(0, ADMIN_BOARD_MAX_ALERTS);
  const hidden = alerts.length - shown.length;

  return (
    <div className="adm-actions">
      <div className="adm-acap">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M12 3a6 6 0 0 0-6 6c0 4-2 5-2 5h16s-2-1-2-5a6 6 0 0 0-6-6Z" />
          <path d="M10.3 20a2 2 0 0 0 3.4 0" />
        </svg>
        Action centre
        <span className="adm-cnt">
          {(['critical', 'warning', 'info'] as AdminAlertSeverity[])
            .filter((severity) => counts[severity])
            .map((severity) => (
              <i key={severity} className={`adm-c-${severity}`}>
                {counts[severity]} {SEVERITY_WORD[severity].toLowerCase()}
              </i>
            ))}
        </span>
      </div>

      <div className="adm-alist">
        {degraded.length > 0 && (
          <div className="adm-alert adm-a-crit">
            <div className="adm-ic">!</div>
            <div className="adm-tx">
              <b>Part of this board could not be read</b>
              <span>
                {degraded.join(', ')} — the rules that watch{' '}
                {degraded.length === 1 ? 'it' : 'them'} have raised nothing because they
                saw nothing.
              </span>
            </div>
            <div className="adm-do">Check SAP</div>
          </div>
        )}

        {shown.map((alert) => (
          <div key={alert.key} className={`adm-alert ${SEVERITY_CLASS[alert.severity]}`}>
            <div className="adm-ic" aria-hidden>
              {SEVERITY_MARK[alert.severity]}
            </div>
            <div className="adm-tx">
              <b>
                {/* The severity word is present for a screen reader and hidden
                    from the wall, where the tint and the mark already say it
                    and a repeated "Warning:" on every row is noise. */}
                <span className="adm-sr">{SEVERITY_WORD[alert.severity]}: </span>
                {alert.title}
              </b>
              <span title={alert.detail}>{alert.detail}</span>
            </div>
            {alert.action && <div className="adm-do">{alert.action}</div>}
          </div>
        ))}

        {alerts.length === 0 && degraded.length === 0 && (
          <div className="adm-alert adm-a-clear">
            <div className="adm-ic" aria-hidden>
              ✓
            </div>
            <div className="adm-tx">
              <b>Nothing needs a decision</b>
              <span>
                Output is tracking plan, every rated store has room, and each cost line
                has a source.
              </span>
            </div>
          </div>
        )}

        {hidden > 0 && (
          <p className="ops-note adm-more">
            {hidden} more {hidden === 1 ? 'alert' : 'alerts'} below the fold.
          </p>
        )}
      </div>
    </div>
  );
}
