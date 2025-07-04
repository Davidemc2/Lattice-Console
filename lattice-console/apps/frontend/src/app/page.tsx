import React, { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [agent, setAgent] = useState<any>(null);
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployType, setDeployType] = useState('POSTGRES');
  const [deployName, setDeployName] = useState('');
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploySuccess, setDeploySuccess] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const agentRes = await fetch('/api/agent/info');
      const agentData = await agentRes.json();
      setAgent(agentData[0] || null);
      const workloadsRes = await fetch('/api/workload/list');
      const workloadsData = await workloadsRes.json();
      setWorkloads(workloadsData || []);
    } catch (err: any) {
      setError('Failed to fetch data');
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault();
    setDeployLoading(true);
    setDeployError(null);
    setDeploySuccess(false);
    try {
      const res = await fetch('/api/workload/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: deployType,
          name: deployName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeployError(data.message || 'Failed to deploy workload');
        setDeployLoading(false);
        return;
      }
      setDeploySuccess(true);
      setDeployLoading(false);
      setDeployName('');
      setShowDeploy(false);
      fetchData();
    } catch (err) {
      setDeployError('Network error');
      setDeployLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold mb-4 text-center">Lattice Console Dashboard</h1>
        {loading && <div className="text-center text-gray-500">Loading...</div>}
        {error && <div className="text-center text-red-600">{error}</div>}
        {agent && (
          <div className="mb-8 p-4 bg-gray-100 rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Node Status</h2>
            <div>Status: <b className={agent.status === 'online' ? 'text-green-600' : 'text-red-600'}>{agent.status}</b></div>
            <div>Hostname: {agent.hostname}</div>
            <div>CPU Cores: {agent.resources.cpuCores}</div>
            <div>Memory: {agent.resources.availableMemory} / {agent.resources.totalMemory} MB</div>
            <div>Disk: {agent.resources.availableDisk} / {agent.resources.totalDisk} GB</div>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Workloads</h2>
          <button data-testid="deploy-workload-btn" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setShowDeploy(true)}>
            + Deploy Workload
          </button>
        </div>
        <table className="w-full mb-8 border">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2">Name</th>
              <th className="p-2">Type</th>
              <th className="p-2">Status</th>
              <th className="p-2">Public URL</th>
              <th className="p-2">Credentials</th>
            </tr>
          </thead>
          <tbody>
            {workloads.map(w => (
              <tr key={w.id} className="border-t" data-testid="workload-row">
                <td className="p-2 font-medium" data-testid="workload-name">{w.name}</td>
                <td className="p-2" data-testid="workload-type">{w.type}</td>
                <td className="p-2" data-testid="workload-status">
                  <span className={w.status === 'RUNNING' ? 'text-green-600' : 'text-gray-500'}>{w.status.toLowerCase()}</span>
                </td>
                <td className="p-2" data-testid="workload-url">{w.publicUrl || '-'}</td>
                <td className="p-2" data-testid="workload-credentials">
                  {w.type === 'POSTGRES' && w.credentials && (
                    <span>User: {w.credentials.user}<br />Pass: {w.credentials.password}</span>
                  )}
                  {w.type === 'MINIO' && w.credentials && (
                    <span>Key: {w.credentials.accessKey}<br />Secret: {w.credentials.secretKey}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {showDeploy && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" data-testid="deploy-modal">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
              <h3 className="text-xl font-bold mb-4" data-testid="deploy-modal-title">Deploy New Workload</h3>
              <form onSubmit={handleDeploy}>
                <label className="block mb-2 font-medium">Type</label>
                <select data-testid="deploy-type" className="w-full mb-4 p-2 border rounded" value={deployType} onChange={e => setDeployType(e.target.value)}>
                  <option value="POSTGRES">Postgres</option>
                  <option value="MINIO">MinIO S3</option>
                </select>
                <label className="block mb-2 font-medium">Name</label>
                <input data-testid="deploy-name" className="w-full mb-4 p-2 border rounded" value={deployName} onChange={e => setDeployName(e.target.value)} required />
                {deployError && <div className="text-red-600 mb-2" data-testid="deploy-error">{deployError}</div>}
                {deploySuccess && <div className="text-green-600 mb-2" data-testid="deploy-success">Workload deployed!</div>}
                <div className="flex justify-end">
                  <button type="button" data-testid="deploy-cancel" className="px-4 py-2 bg-gray-300 rounded mr-2" onClick={() => setShowDeploy(false)}>Cancel</button>
                  <button type="submit" data-testid="deploy-submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={deployLoading}>{deployLoading ? 'Deploying...' : 'Deploy'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}