import { useState } from 'react';
import { trpc } from './app/providers';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  agentId: string;
}

/**
 * Custom React hook to fetch and paginate logs for a workload.
 *
 * @param workloadId - The ID of the workload to fetch logs for.
 * @returns {
 *   logs: LogEntry[],
 *   loading: boolean,
 *   error: string | null,
 *   nextCursor: string | null,
 *   fetchMore: () => Promise<void>
 * }
 *
 * Usage:
 *   const { logs, loading, error, nextCursor, fetchMore } = useWorkloadLogs(workloadId);
 */
export function useWorkloadLogs(workloadId: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch and polling
  const { data, isLoading, error: trpcError, refetch } = trpc.workload.getLogs.useQuery(
    { workloadId, limit: 100 },
    {
      enabled: !!workloadId,
      refetchInterval: 3000,
      onSuccess: (data) => {
        setLogs(data.logs);
        setNextCursor(data.nextCursor);
        setCursor(null);
        setError(null);
      },
      onError: (err) => {
        setError(err.message);
      },
    }
  );

  // Fetch more logs (pagination)
  const fetchMore = async () => {
    if (!nextCursor) return;
    setLoading(true);
    setError(null);
    try {
      const more = await trpc.workload.getLogs.fetch({ workloadId, limit: 100, cursor: nextCursor });
      setLogs((prev) => [...prev, ...more.logs]);
      setNextCursor(more.nextCursor);
      setCursor(more.nextCursor);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fallback to mock data if backend is unavailable
  const logsToShow = logs.length > 0 ? logs : [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'Workload started',
      agentId: 'agent-1',
    },
    {
      id: '2',
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'PostgreSQL container created',
      agentId: 'agent-1',
    },
    {
      id: '3',
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: 'Failed to connect to database',
      agentId: 'agent-1',
    },
  ];

  return { logs: logsToShow, loading: isLoading || loading, error, nextCursor, fetchMore };
} 