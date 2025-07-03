<script lang="ts">
  import { onMount } from 'svelte'
  import { invoke } from '@tauri-apps/api/tauri'
  import { sendNotification } from '@tauri-apps/api/notification'
  import { checkUpdate, installUpdate } from '@tauri-apps/api/updater'
  import { relaunch } from '@tauri-apps/api/process'
  
  import WelcomeScreen from './components/WelcomeScreen.svelte'
  import SystemCheck from './components/SystemCheck.svelte'
  import DockerInstall from './components/DockerInstall.svelte'
  import AgentConfig from './components/AgentConfig.svelte'
  import ClusterSetup from './components/ClusterSetup.svelte'
  import Dashboard from './components/Dashboard.svelte'
  import Navigation from './components/Navigation.svelte'

  type Step = 'welcome' | 'system-check' | 'docker-install' | 'agent-config' | 'cluster-setup' | 'dashboard'

  let currentStep: Step = 'welcome'
  let systemInfo: any = null
  let dockerInstallProgress: any[] = []
  let agentConfig = {
    backend_url: 'https://api.lattice-console.com',
    agent_name: '',
    compute_hours: '9:00-17:00',
    auto_start: true,
    gpu_enabled: false
  }
  let isLoading = false
  let error = ''

  const steps: { id: Step; title: string; description: string }[] = [
    { id: 'welcome', title: 'Welcome', description: 'Join the decentralized cloud' },
    { id: 'system-check', title: 'System Check', description: 'Verify system requirements' },
    { id: 'docker-install', title: 'Docker Setup', description: 'Install and configure Docker' },
    { id: 'agent-config', title: 'Agent Config', description: 'Configure your node settings' },
    { id: 'cluster-setup', title: 'Cluster Setup', description: 'Configure multi-GPU clusters' },
    { id: 'dashboard', title: 'Dashboard', description: 'Monitor your node' }
  ]

  onMount(async () => {
    try {
      // Check for app updates
      const update = await checkUpdate()
      if (update.shouldUpdate) {
        const confirmed = confirm(`Update available (${update.manifest?.version}). Install now?`)
        if (confirmed) {
          await installUpdate()
          await relaunch()
        }
      }
    } catch (error) {
      console.error('Update check failed:', error)
    }
  })

  async function handleSystemCheck() {
    try {
      isLoading = true
      error = ''
      systemInfo = await invoke('check_system_requirements')
      
      if (systemInfo.docker_installed && systemInfo.docker_running) {
        currentStep = 'agent-config'
      } else {
        currentStep = 'docker-install'
      }
    } catch (err) {
      error = `System check failed: ${err}`
    } finally {
      isLoading = false
    }
  }

  async function handleDockerInstall() {
    try {
      isLoading = true
      error = ''
      dockerInstallProgress = await invoke('install_docker')
      
      // Check if installation was successful
      const lastProgress = dockerInstallProgress[dockerInstallProgress.length - 1]
      if (lastProgress?.success && lastProgress?.progress === 100) {
        await sendNotification({
          title: 'Docker Installation Complete',
          body: 'Docker has been successfully installed and configured.'
        })
        currentStep = 'agent-config'
      } else {
        error = 'Docker installation failed. Please try again.'
      }
    } catch (err) {
      error = `Docker installation failed: ${err}`
    } finally {
      isLoading = false
    }
  }

  async function handleAgentSetup() {
    try {
      isLoading = true
      error = ''
      
      // Test connection first
      const connected = await invoke('test_connection', { backendUrl: agentConfig.backend_url })
      if (!connected) {
        error = 'Cannot connect to backend. Please check the URL and try again.'
        return
      }

      // Setup agent
      const result = await invoke('setup_agent', { config: agentConfig })
      
      await sendNotification({
        title: 'Agent Setup Complete',
        body: 'Your machine is now part of the Lattice Console network!'
      })
      
      currentStep = 'cluster-setup'
    } catch (err) {
      error = `Agent setup failed: ${err}`
    } finally {
      isLoading = false
    }
  }

  async function handleClusterSetup(gpuConfig: string[]) {
    try {
      isLoading = true
      error = ''
      
      if (gpuConfig.length > 0) {
        await invoke('configure_cluster', { gpuConfig })
      }
      
      currentStep = 'dashboard'
    } catch (err) {
      error = `Cluster setup failed: ${err}`
    } finally {
      isLoading = false
    }
  }

  function goToStep(step: Step) {
    currentStep = step
  }

  function nextStep() {
    const currentIndex = steps.findIndex(s => s.id === currentStep)
    if (currentIndex < steps.length - 1) {
      currentStep = steps[currentIndex + 1].id
    }
  }

  function prevStep() {
    const currentIndex = steps.findIndex(s => s.id === currentStep)
    if (currentIndex > 0) {
      currentStep = steps[currentIndex - 1].id
    }
  }
</script>

<main class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
  <!-- Background Pattern -->
  <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
  
  <div class="relative z-10">
    <!-- Header -->
    <header class="border-b border-purple-500/20 bg-black/20 backdrop-blur-sm">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-bold text-white">Lattice Console</h1>
              <p class="text-xs text-purple-300">Decentralized Cloud Platform</p>
            </div>
          </div>
          <div class="text-sm text-purple-300">
            v0.1.0
          </div>
        </div>
      </div>
    </header>

    <!-- Navigation -->
    <Navigation {steps} {currentStep} on:goto={e => goToStep(e.detail)} />

    <!-- Main Content -->
    <div class="container mx-auto px-6 py-8">
      {#if error}
        <div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <span class="text-red-400 font-medium">Error</span>
          </div>
          <p class="text-red-300 mt-1">{error}</p>
          <button 
            class="mt-3 px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30 transition-colors"
            on:click={() => error = ''}
          >
            Dismiss
          </button>
        </div>
      {/if}

      <!-- Loading Overlay -->
      {#if isLoading}
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div class="bg-slate-800 rounded-lg p-6 shadow-xl border border-purple-500/20">
            <div class="flex items-center space-x-3">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span class="text-white font-medium">Processing...</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Step Content -->
      <div class="max-w-4xl mx-auto">
        {#if currentStep === 'welcome'}
          <WelcomeScreen on:continue={nextStep} />
        {:else if currentStep === 'system-check'}
          <SystemCheck 
            {systemInfo}
            on:check={handleSystemCheck}
            on:continue={nextStep}
            on:back={prevStep}
          />
        {:else if currentStep === 'docker-install'}
          <DockerInstall 
            {dockerInstallProgress}
            on:install={handleDockerInstall}
            on:continue={nextStep}
            on:back={prevStep}
          />
        {:else if currentStep === 'agent-config'}
          <AgentConfig 
            bind:config={agentConfig}
            on:setup={handleAgentSetup}
            on:continue={nextStep}
            on:back={prevStep}
          />
        {:else if currentStep === 'cluster-setup'}
          <ClusterSetup 
            on:setup={e => handleClusterSetup(e.detail)}
            on:continue={nextStep}
            on:back={prevStep}
          />
        {:else if currentStep === 'dashboard'}
          <Dashboard on:back={prevStep} />
        {/if}
      </div>
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow-x: hidden;
  }
</style>