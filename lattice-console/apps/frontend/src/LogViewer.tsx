import React, { useEffect, useRef, useState } from 'react';
import { useWorkloadLogs, LogEntry } from './useWorkloadLogs';

interface LogViewerProps {
  workloadId: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({ workloadId }) => {
  const { logs, loading, error, nextCursor, fetchMore } = useWorkloadLogs(workloadId);
  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Track if user is at the bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
    };
    const ref = containerRef.current;
    if (ref) ref.addEventListener('scroll', handleScroll);
    return () => {
      if (ref) ref.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Auto-scroll to bottom only if user is at the bottom
  useEffect(() => {
    if (isAtBottom) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAtBottom]);

  // Copy log line to clipboard
  const handleCopy = (log: LogEntry) => {
    navigator.clipboard.writeText(log.message);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1000);
  };

  // Download logs as .txt file
  const handleDownload = () => {
    const content = logs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level} (${log.agentId}) ${log.message}`
      )
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workload-logs-${workloadId}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="relative">
      <button
        className="absolute right-2 top-2 px-2 py-1 text-xs bg-gray-800 text-green-200 rounded hover:bg-gray-700 border border-gray-600 z-10"
        onClick={handleDownload}
        title="Download logs as .txt"
      >
        Download logs
      </button>
      <div
        ref={containerRef}
        className="bg-black text-green-200 font-mono text-sm rounded p-2 h-64 overflow-y-auto border border-gray-700 flex flex-col"
      >
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex gap-2 items-baseline group hover:bg-gray-800/60 rounded px-1"
            data-testid="log-line"
          >
            <span className="text-gray-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
            <span className={
              log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-yellow-400' : 'text-green-300'
            }>
              {log.level}
            </span>
            <span className="text-gray-500">({log.agentId})</span>
            <span>{log.message}</span>
            <button
              className="ml-2 opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-green-300 transition"
              onClick={() => handleCopy(log)}
              title="Copy log message"
            >
              {copiedId === log.id ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ))}
        <div ref={logEndRef} />
        {nextCursor && (
          <button
            className="mt-2 px-3 py-1 bg-gray-800 text-green-200 rounded hover:bg-gray-700 border border-gray-600 self-center flex items-center gap-2"
            onClick={fetchMore}
            disabled={loading}
          >
            {loading && <span className="animate-spin h-4 w-4 border-b-2 border-green-200 rounded-full inline-block" />}
            {loading ? 'Loading...' : 'Load more'}
          </button>
        )}
        {error && <div className="text-red-400 mt-2">Error: {error}</div>}
      </div>
    </div>
  );
}; 