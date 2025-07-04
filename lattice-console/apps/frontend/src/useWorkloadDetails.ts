import { trpc } from './app/providers';

export interface WorkloadDetails {
  id: string;
  name: string;
  type: string;
  status: string;
}

/**
 * Custom React hook to fetch workload details by ID.
 *
 * @param workloadId - The ID of the workload to fetch.
 * @returns {
 *   data: WorkloadDetails | null,
 *   isLoading: boolean,
 *   error: any
 * }
 *
 * Usage:
 *   const { data, isLoading, error } = useWorkloadDetails(workloadId);
 */
export function useWorkloadDetails(workloadId: string) {
  const { data, isLoading, error } = trpc.workload.getById.useQuery(
    { workloadId },
    { enabled: !!workloadId }
  );

  // Fallback to mock data if backend is unavailable
  const fallback = workloadId
    ? {
        id: workloadId,
        name: 'Example Workload',
        type: 'POSTGRESQL',
        status: 'RUNNING',
      }
    : null;

  return { data: data || fallback, isLoading, error };
} 