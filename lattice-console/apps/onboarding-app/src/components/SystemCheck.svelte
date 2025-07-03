<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  
  export let systemInfo: any = null
  
  const dispatch = createEventDispatcher()
  
  function formatBytes(bytes: number) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  function getOSIcon(os: string) {
    switch (os.toLowerCase()) {
      case 'windows': return '🪟'
      case 'macos': return '🍎'
      case 'linux': return '🐧'
      default: return '💻'
    }
  }
  
  $: requirements = [
    {
      name: 'Operating System',
      required: 'Windows 10+, macOS 10.15+, or Linux',
      current: systemInfo ? `${systemInfo.os} ${systemInfo.arch}` : 'Checking...',
      status: systemInfo ? (systemInfo.os === 'windows' || systemInfo.os === 'macos' || systemInfo.os === 'linux' ? 'pass' : 'fail') : 'checking',
      icon: systemInfo ? getOSIcon(systemInfo.os) : '💻'
    },
    {
      name: 'CPU Cores',
      required: 'Minimum 2 cores',
      current: systemInfo ? `${systemInfo.cpu_cores} cores` : 'Checking...',
      status: systemInfo ? (systemInfo.cpu_cores >= 2 ? 'pass' : 'warn') : 'checking',
      icon: '⚡'
    },
    {
      name: 'Memory (RAM)',
      required: 'Minimum 4GB',
      current: systemInfo ? formatBytes(systemInfo.total_memory) : 'Checking...',
      status: systemInfo ? (systemInfo.total_memory >= 4_000_000_000 ? 'pass' : 'warn') : 'checking',
      icon: '🧠'
    },
    {
      name: 'Available Memory',
      required: 'At least 2GB free',
      current: systemInfo ? formatBytes(systemInfo.available_memory) : 'Checking...',
      status: systemInfo ? (systemInfo.available_memory >= 2_000_000_000 ? 'pass' : 'warn') : 'checking',
      icon: '💾'
    },
    {
      name: 'Disk Space',
      required: 'Minimum 20GB free',
      current: systemInfo ? formatBytes(systemInfo.disk_space) : 'Checking...',
      status: systemInfo ? (systemInfo.disk_space >= 20_000_000_000 ? 'pass' : 'warn') : 'checking',
      icon: '💽'
    },
    {
      name: 'Docker Installation',
      required: 'Docker Engine or Docker Desktop',
      current: systemInfo ? (systemInfo.docker_installed ? 'Installed' : 'Not installed') : 'Checking...',
      status: systemInfo ? (systemInfo.docker_installed ? 'pass' : 'fail') : 'checking',
      icon: '🐳'
    },
    {
      name: 'Docker Service',
      required: 'Docker daemon running',
      current: systemInfo ? (systemInfo.docker_running ? 'Running' : 'Stopped') : 'Checking...',
      status: systemInfo ? (systemInfo.docker_running ? 'pass' : 'fail') : 'checking',
      icon: '🔄'
    }
  ]
  
  function getStatusColor(status: string) {
    switch (status) {
      case 'pass': return 'text-green-400'
      case 'warn': return 'text-yellow-400'
      case 'fail': return 'text-red-400'
      default: return 'text-purple-400'
    }
  }
  
  function getStatusIcon(status: string) {
    switch (status) {
      case 'pass': return '✅'
      case 'warn': return '⚠️'
      case 'fail': return '❌'
      default: return '⏳'
    }
  }
  
  $: overallStatus = systemInfo ? (
    requirements.every(r => r.status === 'pass') ? 'all-good' :
    requirements.some(r => r.status === 'fail') ? 'needs-fixes' : 'warnings'
  ) : 'checking'
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="text-center mb-8">
    <h2 class="text-3xl font-bold text-white mb-4">System Requirements Check</h2>
    <p class="text-purple-300 max-w-2xl mx-auto">
      Let's make sure your system meets the requirements to run Lattice Console agent. 
      Don't worry - we'll help you fix any issues we find.
    </p>
  </div>

  <!-- System Info Card -->
  {#if !systemInfo}
    <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 mb-8">
      <div class="flex items-center justify-center space-x-3 mb-6">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span class="text-white font-medium">Checking your system...</span>
      </div>
      <button 
        class="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
        on:click={() => dispatch('check')}
      >
        Start System Check
      </button>
    </div>
  {:else}
    <!-- Overall Status -->
    <div class="mb-8">
      {#if overallStatus === 'all-good'}
        <div class="bg-green-500/10 border border-green-500/20 rounded-2xl p-6">
          <div class="flex items-center space-x-3 mb-2">
            <span class="text-2xl">🎉</span>
            <h3 class="text-lg font-semibold text-green-400">System Ready!</h3>
          </div>
          <p class="text-green-300">
            Your system meets all requirements. You're ready to proceed with the setup!
          </p>
        </div>
      {:else if overallStatus === 'warnings'}
        <div class="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
          <div class="flex items-center space-x-3 mb-2">
            <span class="text-2xl">⚠️</span>
            <h3 class="text-lg font-semibold text-yellow-400">Minor Issues Detected</h3>
          </div>
          <p class="text-yellow-300">
            Your system has some minor issues but should still work. Performance may be limited.
          </p>
        </div>
      {:else}
        <div class="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <div class="flex items-center space-x-3 mb-2">
            <span class="text-2xl">🚨</span>
            <h3 class="text-lg font-semibold text-red-400">Issues Found</h3>
          </div>
          <p class="text-red-300">
            We found some issues that need to be resolved before continuing. Don't worry - we'll help you fix them!
          </p>
        </div>
      {/if}
    </div>

    <!-- Requirements Grid -->
    <div class="grid gap-4 mb-8">
      {#each requirements as req}
        <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20 hover:border-purple-500/40 transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <span class="text-2xl">{req.icon}</span>
              <div>
                <h4 class="font-medium text-white">{req.name}</h4>
                <p class="text-sm text-purple-300">{req.required}</p>
              </div>
            </div>
            <div class="text-right">
              <div class="flex items-center space-x-2 mb-1">
                <span class="text-lg">{getStatusIcon(req.status)}</span>
                <span class="text-sm font-medium {getStatusColor(req.status)}">{req.current}</span>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-between">
      <button 
        class="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl hover:border-purple-500/50 hover:text-purple-200 transition-all duration-200"
        on:click={() => dispatch('back')}
      >
        ← Back
      </button>
      
      <div class="space-x-3">
        <button 
          class="px-6 py-3 bg-purple-500/20 text-purple-300 rounded-xl hover:bg-purple-500/30 transition-all duration-200"
          on:click={() => dispatch('check')}
        >
          🔄 Recheck
        </button>
        
        {#if overallStatus === 'all-good'}
          <button 
            class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            on:click={() => dispatch('continue')}
          >
            Continue →
          </button>
        {:else if requirements.some(r => r.name === 'Docker Installation' && r.status === 'fail')}
          <button 
            class="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            on:click={() => dispatch('continue')}
          >
            Install Docker →
          </button>
        {:else}
          <button 
            class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            on:click={() => dispatch('continue')}
          >
            Continue Anyway →
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Help Section -->
  <div class="mt-8 bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
    <h4 class="font-semibold text-white mb-3">💡 Need Help?</h4>
    <div class="space-y-2 text-sm text-purple-300">
      <p>• <strong>Low memory:</strong> Close unnecessary applications to free up RAM</p>
      <p>• <strong>Insufficient disk space:</strong> Clean up temporary files or move data to external storage</p>
      <p>• <strong>Docker issues:</strong> We'll help you install Docker in the next step</p>
      <p>• <strong>System too old:</strong> Consider upgrading or using a different machine</p>
    </div>
  </div>
</div>