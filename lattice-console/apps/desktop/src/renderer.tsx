import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

declare global {
  interface Window {
    latticeAPI?: {
      checkDocker: () => Promise<boolean>;
      getSystemInfo?: () => Promise<any>; // For future system info collection
      startAgent?: (agentConfig: any) => Promise<{ success: boolean; pid?: number }>;
      stopAgent?: () => Promise<{ success: boolean }>;
      onAgentLog?: (callback: (log: { type: string; data: string }) => void) => void;
      onAgentExit?: (callback: (data: { code: number }) => void) => void;
      loadSession?: () => any;
      saveSession?: (session: any) => void;
      clearSession?: () => void;
    };
  }
}

const BACKEND_URL = 'http://localhost:3000'; // TODO: Make configurable

/**
 * Poll agent status from backend every 10s and update UI.
 * @param agentId - The agent's unique ID
 * @param jwt - The user's JWT token
 * @returns {void}
 */
function useAgentStatusPolling(agentId: string | null, jwt: string | null) {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    async function poll() {
      if (!agentId || !jwt) return;
      try {
        const res = await fetch(`http://localhost:3000/trpc/agent.getById`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify({ input: { agentId } }),
        });
        if (!res.ok) throw new Error('Failed to fetch agent status');
        const data = await res.json();
        setStatus(data.result?.data || null);
        setError(null);
      } catch (err: any) {
        setError('Unable to fetch agent status');
      }
    }
    poll();
    interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [agentId, jwt]);
  return { status, error };
}

const App = () => {
  const [step, setStep] = useState(0);
  const [dockerInstalled, setDockerInstalled] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [jwt, setJwt] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [resourceConfig, setResourceConfig] = useState({ cpu: 2, memory: 4096, disk: 20 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentPid, setAgentPid] = useState<number | null>(null);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentExitCode, setAgentExitCode] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const { status: agentStatus, error: agentStatusError } = useAgentStatusPolling(agentId, jwt);

  useEffect(() => {
    if (window.latticeAPI?.onAgentLog) {
      window.latticeAPI.onAgentLog((log) => {
        setAgentLogs((prev) => [...prev, `[${log.type}] ${log.data}`]);
      });
    }
    if (window.latticeAPI?.onAgentExit) {
      window.latticeAPI.onAgentExit((data) => {
        setAgentRunning(false);
        setAgentPid(null);
        setAgentExitCode(data.code);
        setAgentLogs((prev) => [...prev, `\n[exit] Agent exited with code ${data.code}`]);
      });
    }
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [agentLogs]);

  // Step 1: Docker check
  React.useEffect(() => {
    if (step === 0 && dockerInstalled === null) {
      setLoading(true);
      if (window.latticeAPI && window.latticeAPI.checkDocker) {
        window.latticeAPI.checkDocker().then(installed => {
          setDockerInstalled(installed);
          setLoading(false);
        });
      } else {
        // Fallback: assume not installed
        setDockerInstalled(false);
        setLoading(false);
      }
    }
  }, [step, dockerInstalled]);

  // Load session on mount
  useEffect(() => {
    if (window.latticeAPI?.loadSession) {
      const session = window.latticeAPI.loadSession();
      if (session) {
        setJwt(session.jwt || null);
        setAgentId(session.agentId || null);
        setAgentToken(session.agentToken || null);
        setStep(session.step || 0);
      }
    }
    setSessionLoaded(true);
  }, []);

  // Save session after login or agent registration
  useEffect(() => {
    if (window.latticeAPI?.saveSession && sessionLoaded) {
      window.latticeAPI.saveSession({
        jwt,
        agentId,
        agentToken,
        step,
      });
    }
  }, [jwt, agentId, agentToken, step, sessionLoaded]);

  function handleLogout() {
    if (window.latticeAPI?.clearSession) {
      window.latticeAPI.clearSession();
    }
    setJwt(null);
    setAgentId(null);
    setAgentToken(null);
    setStep(0);
    setAgentRunning(false);
    setAgentPid(null);
    setAgentLogs([]);
    setAgentExitCode(null);
    setEmail('');
    setPassword('');
    setError(null);
  }

  // Step 2: Login (stub)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setJwt(data.token);
      setLoading(false);
      setStep(2);
    } catch (err) {
      setError('Network error');
      setLoading(false);
    }
  }

  // Step 3: Resource config
  function handleResourceChange(e: React.ChangeEvent<HTMLInputElement>) {
    setResourceConfig({ ...resourceConfig, [e.target.name]: Number(e.target.value) });
  }

  // Step 4: Register agent
  async function handleRegisterAgent() {
    setLoading(true);
    setError(null);
    let systemInfo: any = {};
    if (window.latticeAPI?.getSystemInfo) {
      try {
        const info = await window.latticeAPI.getSystemInfo();
        systemInfo = {
          hostname: info.hostname,
          platform: info.platform,
          arch: info.arch,
          dockerVersion: info.dockerVersion,
          resources: {
            cpuCores: resourceConfig.cpu,
            totalMemory: resourceConfig.memory,
            totalDisk: resourceConfig.disk,
            availableMemory: info.totalMemory,
            availableDisk: info.totalDisk,
          },
        };
      } catch {
        setError('Failed to gather system info');
        setLoading(false);
        return;
      }
    } else {
      setError('System info not available');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/trpc/agent.register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({ input: systemInfo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Agent registration failed');
        setLoading(false);
        return;
      }
      const data = await res.json();
      // tRPC returns { result: { data: { agentId, token } } }
      const agentData = data.result?.data || {};
      setAgentId(agentData.agentId);
      setAgentToken(agentData.token);
      setLoading(false);
      setStep(3);
    } catch (err) {
      setError('Network error');
      setLoading(false);
    }
  }

  // Step 5: Start agent
  async function handleStartAgent() {
    setLoading(true);
    setError(null);
    setAgentLogs([]);
    setAgentExitCode(null);
    if (window.latticeAPI && window.latticeAPI.startAgent) {
      try {
        const result = await window.latticeAPI.startAgent({
          agentId,
          agentToken,
          resourceConfig,
        });
        if (result.success) {
          setAgentRunning(true);
          setAgentPid(result.pid || null);
          setStep(4);
        } else {
          setError('Failed to start agent process');
        }
      } catch (err) {
        setError('Error starting agent process');
      }
    } else {
      setError('Agent process management not available');
    }
    setLoading(false);
  }

  // Step 6: Stop agent
  async function handleStopAgent() {
    setLoading(true);
    setError(null);
    if (window.latticeAPI && window.latticeAPI.stopAgent) {
      try {
        const result = await window.latticeAPI.stopAgent();
        if (result.success) {
          setAgentRunning(false);
          setAgentPid(null);
        } else {
          setError('Failed to stop agent process');
        }
      } catch (err) {
        setError('Error stopping agent process');
      }
    } else {
      setError('Agent process management not available');
    }
    setLoading(false);
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 32, maxWidth: 480, margin: '0 auto' }}>
      <h1>Lattice Console Desktop</h1>
      <button onClick={handleLogout} style={{ float: 'right', marginTop: -16, marginRight: -16 }}>Logout</button>
      {step === 0 && (
        <div>
          <h2>Step 1: Docker Check</h2>
          {loading && <p>Checking for Docker...</p>}
          {dockerInstalled === false && !loading && (
            <>
              <p>Docker is not installed or not running. Please install and start Docker Desktop to continue.</p>
              <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noopener noreferrer">Download Docker Desktop</a>
              <br />
              <button onClick={() => setDockerInstalled(null)} style={{ marginTop: 16 }}>Re-check Docker</button>
            </>
          )}
          {dockerInstalled === true && !loading && (
            <button onClick={() => setStep(1)}>Continue</button>
          )}
        </div>
      )}
      {step === 1 && (
        <form onSubmit={handleLogin}>
          <h2>Step 2: Login</h2>
          <label>Email:<br />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%' }} />
          </label>
          <br /><br />
          <label>Password:<br />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%' }} />
          </label>
          <br /><br />
          <button type="submit" disabled={loading}>Login</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
      )}
      {step === 2 && (
        <div>
          <h2>Step 3: Resource Configuration</h2>
          <label>CPU Cores: <input type="number" name="cpu" min={1} max={16} value={resourceConfig.cpu} onChange={handleResourceChange} /></label><br /><br />
          <label>Memory (MB): <input type="number" name="memory" min={512} max={65536} value={resourceConfig.memory} onChange={handleResourceChange} /></label><br /><br />
          <label>Disk (GB): <input type="number" name="disk" min={5} max={1000} value={resourceConfig.disk} onChange={handleResourceChange} /></label><br /><br />
          <button onClick={handleRegisterAgent} disabled={loading}>Register Agent</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      )}
      {step === 3 && (
        <div>
          <h2>Step 4: Start Agent</h2>
          <p>Agent registered! Ready to start the Lattice agent with your configuration.</p>
          <ul>
            <li>Agent ID: {agentId}</li>
            <li>CPU: {resourceConfig.cpu} cores</li>
            <li>Memory: {resourceConfig.memory} MB</li>
            <li>Disk: {resourceConfig.disk} GB</li>
          </ul>
          <button onClick={handleStartAgent} disabled={loading || agentRunning}>Start Agent</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      )}
      {step === 4 && (
        <div>
          <h2>Agent Running</h2>
          <p>Your node is now online and connected to the Lattice Console network!</p>
          <p>Monitor status and earnings from the dashboard.</p>
          <p>Agent PID: {agentPid}</p>
          <button onClick={handleStopAgent} disabled={loading || !agentRunning}>Stop Agent</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ marginTop: 24 }}>
            <h3>Agent Logs</h3>
            <div ref={logRef} style={{ background: '#111', color: '#0f0', fontFamily: 'monospace', height: 200, overflowY: 'auto', padding: 8, borderRadius: 4 }}>
              {agentLogs.map((line, i) => <div key={i}>{line}</div>)}
            </div>
            {agentExitCode !== null && (
              <div style={{ color: 'red', marginTop: 8 }}>
                Agent exited with code {agentExitCode}
              </div>
            )}
          </div>
          {agentStatus && (
            <div style={{ marginTop: 16, background: '#222', color: '#fff', padding: 12, borderRadius: 4 }}>
              <h3>Agent Status</h3>
              <div>Status: <b>{agentStatus.status}</b></div>
              <div>Last Heartbeat: {agentStatus.lastHeartbeat ? new Date(agentStatus.lastHeartbeat).toLocaleString() : 'N/A'}</div>
              <div>CPU Usage: {agentStatus.usage?.cpuUsage ?? 'N/A'}%</div>
              <div>Memory Usage: {agentStatus.usage?.memoryUsage ?? 'N/A'} MB</div>
              <div>Disk Usage: {agentStatus.usage?.diskUsage ?? 'N/A'} GB</div>
            </div>
          )}
          {agentStatusError && <div style={{ color: 'red' }}>{agentStatusError}</div>}
          <a href="https://docs.lattice-console.com/help" target="_blank" rel="noopener noreferrer" style={{ marginTop: 16, display: 'block' }}>Help & Troubleshooting</a>
          <button onClick={handleLogout} style={{ marginTop: 16, background: '#f33', color: '#fff' }}>Reset Onboarding</button>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />); 