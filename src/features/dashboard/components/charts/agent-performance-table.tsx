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
    <div className="max-h-64 overflow-auto">
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
