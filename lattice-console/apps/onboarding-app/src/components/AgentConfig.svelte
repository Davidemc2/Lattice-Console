<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  
  export let config: {
    backend_url: string
    agent_name: string
    compute_hours: string
    auto_start: boolean
    gpu_enabled: boolean
  }
  
  const dispatch = createEventDispatcher()
  
  // Generate a default agent name based on hostname
  $: if (!config.agent_name) {
    config.agent_name = `${typeof window !== 'undefined' ? window.location.hostname || 'my' : 'my'}-lattice-node`
  }
  
  let isTestingConnection = false
  let connectionStatus: 'unknown' | 'success' | 'error' = 'unknown'
  
  async function testConnection() {
    isTestingConnection = true
    try {
      // This would be handled by the parent component
      dispatch('test-connection', config.backend_url)
      connectionStatus = 'success'
    } catch (error) {
      connectionStatus = 'error'
    } finally {
      isTestingConnection = false
    }
  }
  
  function handleSetup() {
    dispatch('setup')
  }
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="text-center mb-8">
    <h2 class="text-3xl font-bold text-white mb-4">Configure Your Agent</h2>
    <p class="text-purple-300 max-w-2xl mx-auto">
      Set up your node configuration to join the Lattice Console network. 
      These settings control how your machine participates in the decentralized cloud.
    </p>
  </div>

  <!-- Configuration Form -->
  <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 mb-8">
    <div class="space-y-8">
      <!-- Backend Connection -->
      <div>
        <label class="block text-white font-medium mb-3">
          🌐 Backend URL
        </label>
        <p class="text-sm text-purple-300 mb-4">
          The Lattice Console backend server your agent will connect to. Use the default for the main network.
        </p>
        <div class="space-y-3">
          <div class="flex space-x-3">
            <input
              type="url"
              bind:value={config.backend_url}
              placeholder="https://api.lattice-console.com"
              class="flex-1 px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
            />
            <button
              type="button"
              on:click={testConnection}
              disabled={isTestingConnection || !config.backend_url}
              class="px-6 py-3 bg-blue-500/20 text-blue-300 rounded-xl hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {#if isTestingConnection}
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span>Testing...</span>
              {:else}
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span>Test</span>
              {/if}
            </button>
          </div>
          
          {#if connectionStatus === 'success'}
            <div class="flex items-center space-x-2 text-green-400 text-sm">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span>Connection successful!</span>
            </div>
          {:else if connectionStatus === 'error'}
            <div class="flex items-center space-x-2 text-red-400 text-sm">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
              <span>Connection failed. Please check the URL.</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Agent Name -->
      <div>
        <label class="block text-white font-medium mb-3">
          🏷️ Agent Name
        </label>
        <p class="text-sm text-purple-300 mb-4">
          A friendly name for your agent node. This will appear in the dashboard and logs.
        </p>
        <input
          type="text"
          bind:value={config.agent_name}
          placeholder="my-lattice-node"
          class="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
        />
      </div>

      <!-- Compute Hours -->
      <div>
        <label class="block text-white font-medium mb-3">
          ⏰ Compute Hours
        </label>
        <p class="text-sm text-purple-300 mb-4">
          Set when your machine should actively participate in the network. Outside these hours, 
          your agent will be in standby mode. Leave blank for 24/7 operation.
        </p>
        <select
          bind:value={config.compute_hours}
          class="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
        >
          <option value="">24/7 (Always Active)</option>
          <option value="9:00-17:00">Business Hours (9 AM - 5 PM)</option>
          <option value="18:00-8:00">Evening/Night (6 PM - 8 AM)</option>
          <option value="22:00-6:00">Night Only (10 PM - 6 AM)</option>
          <option value="custom">Custom Schedule</option>
        </select>
        
        {#if config.compute_hours === 'custom'}
          <div class="mt-3 grid grid-cols-2 gap-3">
            <input
              type="time"
              placeholder="Start time"
              class="px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
            />
            <input
              type="time"
              placeholder="End time"
              class="px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
            />
          </div>
        {/if}
      </div>

      <!-- Options -->
      <div class="space-y-4">
        <h4 class="text-white font-medium">⚙️ Options</h4>
        
        <!-- Auto Start -->
        <label class="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={config.auto_start}
            class="w-5 h-5 rounded border-purple-500/30 bg-white/10 text-purple-500 focus:ring-purple-500/20 focus:ring-2"
          />
          <div>
            <div class="text-white font-medium">Start agent automatically</div>
            <div class="text-sm text-purple-300">
              Agent will start when your computer boots up
            </div>
          </div>
        </label>

        <!-- GPU Support -->
        <label class="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={config.gpu_enabled}
            class="w-5 h-5 rounded border-purple-500/30 bg-white/10 text-purple-500 focus:ring-purple-500/20 focus:ring-2"
          />
          <div>
            <div class="text-white font-medium">Enable GPU support</div>
            <div class="text-sm text-purple-300">
              Allow the agent to use GPU resources for compute workloads
            </div>
          </div>
        </label>
      </div>
    </div>
  </div>

  <!-- Preview Card -->
  <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 mb-8">
    <h4 class="font-semibold text-white mb-4">📋 Configuration Summary</h4>
    <div class="grid md:grid-cols-2 gap-4 text-sm">
      <div class="space-y-2">
        <div class="flex justify-between">
          <span class="text-purple-300">Backend:</span>
          <span class="text-white font-mono">{config.backend_url || 'Not set'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-purple-300">Agent Name:</span>
          <span class="text-white">{config.agent_name || 'Not set'}</span>
        </div>
      </div>
      <div class="space-y-2">
        <div class="flex justify-between">
          <span class="text-purple-300">Compute Hours:</span>
          <span class="text-white">{config.compute_hours || '24/7'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-purple-300">Auto-start:</span>
          <span class="text-white">{config.auto_start ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Security Note -->
  <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-8">
    <h4 class="font-semibold text-blue-400 mb-3">🔒 Security & Privacy</h4>
    <div class="space-y-2 text-sm text-blue-300">
      <p>• All communication with the backend is encrypted using TLS</p>
      <p>• Your agent uses secure authentication tokens that are rotated regularly</p>
      <p>• No personal data is transmitted - only system metrics and workload status</p>
      <p>• You maintain full control over your system and can stop the agent anytime</p>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="flex justify-between">
    <button 
      class="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl hover:border-purple-500/50 hover:text-purple-200 transition-all duration-200"
      on:click={() => dispatch('back')}
    >
      ← Back
    </button>
    
    <button 
      class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      on:click={handleSetup}
      disabled={!config.backend_url || !config.agent_name}
    >
      🚀 Setup Agent
    </button>
  </div>
</div>