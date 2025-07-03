<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  import { invoke } from '@tauri-apps/api/tauri'
  
  const dispatch = createEventDispatcher()
  
  let agentStatus: any = {
    running: 'true',
    cpu_usage: '25.5',
    memory_usage: '60.2',
    containers: '3'
  }
  
  let systemMetrics = {
    uptime: '2h 34m',
    network_in: '1.2 MB/s',
    network_out: '850 KB/s',
    disk_usage: '45%'
  }
  
  let runningContainers = [
    { name: 'postgres-main', status: 'running', image: 'postgres:15', uptime: '2h 10m' },
    { name: 'minio-storage', status: 'running', image: 'minio/minio', uptime: '1h 45m' },
    { name: 'redis-cache', status: 'running', image: 'redis:7-alpine', uptime: '30m' }
  ]
  
  let recentLogs = [
    { timestamp: '14:23:45', level: 'INFO', message: 'Container postgres-main started successfully' },
    { timestamp: '14:20:12', level: 'INFO', message: 'Agent heartbeat sent to backend' },
    { timestamp: '14:18:33', level: 'WARN', message: 'High memory usage detected (85%)' },
    { timestamp: '14:15:01', level: 'INFO', message: 'New workload assigned: data-processing-job' }
  ]
  
  let statusInterval: any
  let isRefreshing = false
  
  onMount(async () => {
    await refreshStatus()
    // Refresh status every 30 seconds
    statusInterval = setInterval(refreshStatus, 30000)
  })
  
  onDestroy(() => {
    if (statusInterval) {
      clearInterval(statusInterval)
    }
  })
  
  async function refreshStatus() {
    try {
      isRefreshing = true
      agentStatus = await invoke('get_agent_status')
    } catch (error) {
      console.error('Failed to get agent status:', error)
    } finally {
      isRefreshing = false
    }
  }
  
  async function stopAgent() {
    try {
      const confirmed = confirm('Are you sure you want to stop the agent? This will disconnect your node from the network.')
      if (confirmed) {
        await invoke('cleanup_agent')
        agentStatus.running = 'false'
      }
    } catch (error) {
      console.error('Failed to stop agent:', error)
    }
  }
  
  async function restartAgent() {
    try {
      await invoke('cleanup_agent')
      // Would restart agent here
      agentStatus.running = 'true'
    } catch (error) {
      console.error('Failed to restart agent:', error)
    }
  }
  
  function openWebDashboard() {
    // Would open the web dashboard
    console.log('Opening web dashboard...')
  }
  
  function getStatusColor(running: string) {
    return running === 'true' ? 'text-green-400' : 'text-red-400'
  }
  
  function getStatusText(running: string) {
    return running === 'true' ? 'Running' : 'Stopped'
  }
  
  function getLevelColor(level: string) {
    switch (level) {
      case 'ERROR': return 'text-red-400'
      case 'WARN': return 'text-yellow-400'
      case 'INFO': return 'text-blue-400'
      default: return 'text-purple-400'
    }
  }
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="text-center mb-8">
    <h2 class="text-3xl font-bold text-white mb-4">🎉 Welcome to Lattice Console!</h2>
    <p class="text-purple-300 max-w-2xl mx-auto">
      Your node is now part of the decentralized cloud network. Monitor your system performance, 
      manage workloads, and track your contributions from this dashboard.
    </p>
  </div>

  <!-- Status Overview -->
  <div class="grid md:grid-cols-4 gap-6 mb-8">
    <!-- Agent Status -->
    <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
      <div class="flex items-center space-x-3 mb-3">
        <div class="w-3 h-3 rounded-full {agentStatus.running === 'true' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}"></div>
        <h3 class="font-semibold text-white">Agent Status</h3>
      </div>
      <div class="text-2xl font-bold {getStatusColor(agentStatus.running)} mb-1">
        {getStatusText(agentStatus.running)}
      </div>
      <div class="text-sm text-purple-300">Uptime: {systemMetrics.uptime}</div>
    </div>

    <!-- CPU Usage -->
    <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-white">CPU Usage</h3>
        <svg class="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
        </svg>
      </div>
      <div class="text-2xl font-bold text-blue-400 mb-1">{agentStatus.cpu_usage}%</div>
      <div class="w-full h-2 bg-purple-500/20 rounded-full overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
          style="width: {agentStatus.cpu_usage}%"
        ></div>
      </div>
    </div>

    <!-- Memory Usage -->
    <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-white">Memory</h3>
        <svg class="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
        </svg>
      </div>
      <div class="text-2xl font-bold text-purple-400 mb-1">{agentStatus.memory_usage}%</div>
      <div class="w-full h-2 bg-purple-500/20 rounded-full overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
          style="width: {agentStatus.memory_usage}%"
        ></div>
      </div>
    </div>

    <!-- Active Containers -->
    <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-white">Containers</h3>
        <svg class="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
        </svg>
      </div>
      <div class="text-2xl font-bold text-green-400 mb-1">{agentStatus.containers}</div>
      <div class="text-sm text-purple-300">Running</div>
    </div>
  </div>

  <!-- Main Content Grid -->
  <div class="grid lg:grid-cols-3 gap-8 mb-8">
    <!-- Running Containers -->
    <div class="lg:col-span-2">
      <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-semibold text-white">🐳 Running Containers</h3>
          <button 
            class="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 transition-colors"
            on:click={refreshStatus}
            disabled={isRefreshing}
          >
            {#if isRefreshing}
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
            {:else}
              🔄 Refresh
            {/if}
          </button>
        </div>
        
        <div class="space-y-3">
          {#each runningContainers as container}
            <div class="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-purple-500/20">
              <div class="flex items-center space-x-4">
                <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <div>
                  <h4 class="font-medium text-white">{container.name}</h4>
                  <p class="text-sm text-purple-300">{container.image}</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-green-400">{container.status}</div>
                <div class="text-sm text-purple-300">Up {container.uptime}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Quick Actions & Network -->
    <div class="space-y-6">
      <!-- Quick Actions -->
      <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 class="text-lg font-semibold text-white mb-4">⚡ Quick Actions</h3>
        <div class="space-y-3">
          <button 
            class="w-full px-4 py-3 bg-blue-500/20 text-blue-300 rounded-xl hover:bg-blue-500/30 transition-all duration-200 flex items-center justify-center space-x-2"
            on:click={openWebDashboard}
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
            </svg>
            <span>Open Web Dashboard</span>
          </button>
          
          <button 
            class="w-full px-4 py-3 bg-yellow-500/20 text-yellow-300 rounded-xl hover:bg-yellow-500/30 transition-all duration-200 flex items-center justify-center space-x-2"
            on:click={restartAgent}
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
            </svg>
            <span>Restart Agent</span>
          </button>
          
          <button 
            class="w-full px-4 py-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 transition-all duration-200 flex items-center justify-center space-x-2"
            on:click={stopAgent}
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"/>
            </svg>
            <span>Stop Agent</span>
          </button>
        </div>
      </div>

      <!-- Network Stats -->
      <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
        <h3 class="text-lg font-semibold text-white mb-4">🌐 Network</h3>
        <div class="space-y-4">
          <div class="flex justify-between">
            <span class="text-purple-300">Download</span>
            <span class="text-white font-medium">{systemMetrics.network_in}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-purple-300">Upload</span>
            <span class="text-white font-medium">{systemMetrics.network_out}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-purple-300">Disk Usage</span>
            <span class="text-white font-medium">{systemMetrics.disk_usage}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Recent Logs -->
  <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 mb-8">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-xl font-semibold text-white">📋 Recent Activity</h3>
      <button class="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 transition-colors">
        View All Logs
      </button>
    </div>
    
    <div class="space-y-2 max-h-64 overflow-y-auto">
      {#each recentLogs as log}
        <div class="flex items-start space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
          <span class="text-xs text-purple-400 font-mono mt-1">{log.timestamp}</span>
          <span class="text-xs font-medium {getLevelColor(log.level)} mt-1">{log.level}</span>
          <span class="text-sm text-purple-300 flex-1">{log.message}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Success Message -->
  <div class="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center mb-8">
    <div class="text-4xl mb-4">🎉</div>
    <h3 class="text-2xl font-bold text-green-400 mb-4">Setup Complete!</h3>
    <p class="text-green-300 max-w-2xl mx-auto">
      Congratulations! Your machine is now successfully connected to the Lattice Console network. 
      You're contributing to the decentralized cloud and earning rewards for your participation.
    </p>
  </div>

  <!-- Next Steps -->
  <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 mb-8">
    <h4 class="font-semibold text-white mb-4">🚀 What's Next?</h4>
    <div class="grid md:grid-cols-2 gap-4 text-sm text-purple-300">
      <div class="space-y-2">
        <p>• Monitor your node performance from the web dashboard</p>
        <p>• Join our Discord community for support and updates</p>
        <p>• Set up additional nodes to increase your earnings</p>
      </div>
      <div class="space-y-2">
        <p>• Configure custom workload preferences</p>
        <p>• Enable automatic updates for the agent</p>
        <p>• Share your referral link to earn bonuses</p>
      </div>
    </div>
  </div>

  <!-- Footer Actions -->
  <div class="flex justify-between">
    <button 
      class="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl hover:border-purple-500/50 hover:text-purple-200 transition-all duration-200"
      on:click={() => dispatch('back')}
    >
      ← Back to Setup
    </button>
    
    <div class="space-x-3">
      <button 
        class="px-6 py-3 bg-blue-500/20 text-blue-300 rounded-xl hover:bg-blue-500/30 transition-all duration-200"
        on:click={openWebDashboard}
      >
        Open Web Dashboard
      </button>
      
      <button 
        class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
        on:click={() => {/* Close app */}}
      >
        ✨ Done
      </button>
    </div>
  </div>
</div>