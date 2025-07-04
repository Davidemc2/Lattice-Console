import { LogViewer } from '../../LogViewer';
import { useParams } from 'next/navigation';
import { useWorkloadDetails } from '../../useWorkloadDetails';

export default function WorkloadDetailsPage() {
  // Next.js app router: get the dynamic [id] param
  const params = useParams();
  const workloadId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const { data: workload, isLoading, error } = useWorkloadDetails(workloadId);

  if (isLoading) return <div className="max-w-2xl mx-auto mt-8 p-4 bg-white rounded shadow">Loading workload...</div>;
  if (error) return <div className="max-w-2xl mx-auto mt-8 p-4 bg-white rounded shadow text-red-500">Error loading workload: {error.message}</div>;
  if (!workload) return <div className="max-w-2xl mx-auto mt-8 p-4 bg-white rounded shadow">Workload not found.</div>;

  return (
    <div className="max-w-2xl mx-auto mt-8 p-4 bg-white rounded shadow">
      <h1 className="text-xl font-bold mb-2">Workload: {workload.name}</h1>
      <div className="mb-4 text-gray-600">
        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">ID: {workload.id}</span>
        <span className="ml-4">Type: {workload.type}</span>
        <span className="ml-4">Status: {workload.status}</span>
      </div>
      <h2 className="font-semibold mb-2">Logs</h2>
      <LogViewer workloadId={workloadId} />
    </div>
  );
} 