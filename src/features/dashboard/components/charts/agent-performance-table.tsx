import { useTranslation } from 'react-i18next';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui';
import { formatMinutes } from '~/utils/format';
import type { AgentPerformance } from '~/features/dashboard/schemas/dashboard-schema';

/**
 * Agent throughput as a table rather than a chart — it carries four numbers per agent, which a
 * bar can't show at once, and a real table is inherently accessible + sortable-looking.
 */
export function AgentPerformanceTable({ data }: { data: AgentPerformance[] }) {
  const { t } = useTranslation();
  return (
    <div
      className="focus-visible:ring-ring max-h-64 overflow-auto rounded-sm focus-visible:ring-2 focus-visible:outline-none"
      // A scrollable region must be keyboard-focusable so it can be scrolled without a mouse
      // (axe scrollable-region-focusable). The static rule can't see the overflow; axe, run in a
      // real browser, is the authority here.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      role="group"
      aria-label={t('Dashboard.AgentPerformance')}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Dashboard.Agent')}</TableHead>
            <TableHead className="text-right">{t('Dashboard.Assigned')}</TableHead>
            <TableHead className="text-right">{t('Dashboard.Resolved')}</TableHead>
            <TableHead className="text-right">{t('Dashboard.AvgResolution')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.agent}>
              <TableCell className="font-medium">{row.agent}</TableCell>
              <TableCell className="text-right tabular-nums">{row.assigned}</TableCell>
              <TableCell className="text-right tabular-nums">{row.resolved}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMinutes(row.avgResolutionMins)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
