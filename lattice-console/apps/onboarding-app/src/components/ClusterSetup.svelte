<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  
  const dispatch = createEventDispatcher()
  
  let selectedGPUs: string[] = []
  let clusterMode: 'single' | 'multi-gpu' | 'multi-node' = 'single'
  let nodeCount = 1
  
  // Mock GPU detection - in real app this would come from system scan
  const availableGPUs = [
    { id: 'gpu-0', name: 'NVIDIA RTX 4090', memory: '24GB', utilization: '0%' },
    { id: 'gpu-1', name: 'NVIDIA RTX 4090', memory: '24GB', utilization: '0%' },
    { id: 'gpu-2', name: 'NVIDIA RTX 3080', memory: '10GB', utilization: '0%' }
  ]
  
  function toggleGPU(gpuId: string) {
    if (selectedGPUs.includes(gpuId)) {
      selectedGPUs = selectedGPUs.filter(id => id !== gpuId)
    } else {
      selectedGPUs = [...selectedGPUs, gpuId]
    }
  }
  
  function handleSetup() {
    dispatch('setup', selectedGPUs)
  }
  
  function handleSkip() {
    dispatch('continue')
  }
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="text-center mb-8">
    <h2 class="text-3xl font-bold text-white mb-4">Cluster Configuration</h2>
    <p class="text-purple-300 max-w-2xl mx-auto">
      Optimize your setup for maximum performance. Configure multiple GPUs or create a multi-node cluster 
      for enterprise-grade computing power.
    </p>
  </div>

  <!-- Cluster Mode Selection -->
  <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 mb-8">
    <h3 class="text-xl font-semibold text-white mb-6">🔧 Cluster Type</h3>
    
    <div class="grid md:grid-cols-3 gap-4 mb-6">
      <!-- Single Node -->
      <label class="cursor-pointer">
        <input
          type="radio"
          bind:group={clusterMode}
          value="single"
          class="sr-only"
        />
        <div class="p-6 rounded-xl border-2 transition-all duration-200 {
          clusterMode === 'single' 
            ? 'border-purple-500 bg-purple-500/10' 
            : 'border-purple-500/30 hover:border-purple-500/50'
        }">
          <div class="text-center">
            <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
            </div>
            <h4 class="font-semibold text-white mb-2">Single Node</h4>
            <p class="text-sm text-purple-300">
              Standard setup for most users. Perfect for getting started.
            </p>
          </div>
        </div>
      </label>

      <!-- Multi-GPU -->
      <label class="cursor-pointer">
        <input
          type="radio"
          bind:group={clusterMode}
          value="multi-gpu"
          class="sr-only"
        />
        <div class="p-6 rounded-xl border-2 transition-all duration-200 {
          clusterMode === 'multi-gpu' 
            ? 'border-purple-500 bg-purple-500/10' 
            : 'border-purple-500/30 hover:border-purple-500/50'
        }">
          <div class="text-center">
            <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
            </div>
            <h4 class="font-semibold text-white mb-2">Multi-GPU</h4>
            <p class="text-sm text-purple-300">
              Use multiple GPUs on one machine for parallel processing.
            </p>
          </div>
        </div>
      </label>

      <!-- Multi-Node -->
      <label class="cursor-pointer">
        <input
          type="radio"
          bind:group={clusterMode}
          value="multi-node"
          class="sr-only"
        />
        <div class="p-6 rounded-xl border-2 transition-all duration-200 {
          clusterMode === 'multi-node' 
            ? 'border-purple-500 bg-purple-500/10' 
            : 'border-purple-500/30 hover:border-purple-500/50'
        }">
          <div class="text-center">
            <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"/>
              </svg>
            </div>
            <h4 class="font-semibold text-white mb-2">Multi-Node</h4>
            <p class="text-sm text-purple-300">
              Connect multiple machines for enterprise-scale clusters.
            </p>
          </div>
        </div>
      </label>
    </div>
  </div>

  <!-- GPU Configuration -->
  {#if clusterMode === 'multi-gpu'}
    <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 mb-8">
      <h3 class="text-xl font-semibold text-white mb-6">🎮 GPU Selection</h3>
      
      {#if availableGPUs.length === 0}
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-yellow-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg class="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
          </div>
          <h4 class="text-lg font-semibold text-yellow-400 mb-2">No GPUs Detected</h4>
          <p class="text-yellow-300 mb-4">
            We couldn't detect any compatible GPUs on your system. You can still continue with CPU-only mode.
          </p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each availableGPUs as gpu}
            <label class="flex items-center p-4 rounded-xl border border-purple-500/30 hover:border-purple-500/50 cursor-pointer transition-all duration-200 {
              selectedGPUs.includes(gpu.id) ? 'bg-purple-500/10 border-purple-500' : ''
            }">
              <input
                type="checkbox"
                checked={selectedGPUs.includes(gpu.id)}
                on:change={() => toggleGPU(gpu.id)}
                class="w-5 h-5 rounded border-purple-500/30 bg-white/10 text-purple-500 focus:ring-purple-500/20 focus:ring-2"
              />
              <div class="ml-4 flex-1">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-white">{gpu.name}</h4>
                    <p class="text-sm text-purple-300">Memory: {gpu.memory} • Utilization: {gpu.utilization}</p>
                  </div>
                  <div class="text-right">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                      Available
                    </span>
                  </div>
                </div>
              </div>
            </label>
          {/each}
        </div>
        
        {#if selectedGPUs.length > 0}
          <div class="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <h4 class="font-semibold text-blue-400 mb-2">
              💡 Multi-GPU Configuration
            </h4>
            <p class="text-sm text-blue-300">
              Selected {selectedGPUs.length} GPU{selectedGPUs.length > 1 ? 's' : ''} for parallel processing. 
              This will significantly increase your node's compute capacity and earning potential.
            </p>
          </div>
        {/if}
      {/if}
    </div>
  {/if}

  <!-- Multi-Node Configuration -->
  {#if clusterMode === 'multi-node'}
    <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 mb-8">
      <h3 class="text-xl font-semibold text-white mb-6">🌐 Multi-Node Setup</h3>
      
      <div class="space-y-6">
        <div>
          <label class="block text-white font-medium mb-3">
            Number of Nodes
          </label>
          <input
            type="number"
            bind:value={nodeCount}
            min="2"
            max="100"
            class="w-32 px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
          />
          <p class="text-sm text-purple-300 mt-2">
            How many machines will be part of this cluster?
          </p>
        </div>
        
        <div class="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <h4 class="font-semibold text-yellow-400 mb-3">📝 Next Steps</h4>
          <div class="space-y-2 text-sm text-yellow-300">
            <p>• Install the Lattice Console agent on each additional machine</p>
            <p>• Use the same cluster ID for all nodes</p>
            <p>• Ensure all machines can communicate on the local network</p>
            <p>• Configure load balancing and failover policies</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Performance Estimate -->
  <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 mb-8">
    <h4 class="font-semibold text-white mb-4">📊 Performance Estimate</h4>
    <div class="grid md:grid-cols-3 gap-4 text-sm">
      <div class="text-center p-4 bg-white/5 rounded-lg">
        <div class="text-2xl font-bold text-green-400 mb-1">
          {clusterMode === 'multi-gpu' ? selectedGPUs.length * 100 : clusterMode === 'multi-node' ? nodeCount * 85 : 85}%
        </div>
        <div class="text-purple-300">Compute Efficiency</div>
      </div>
      <div class="text-center p-4 bg-white/5 rounded-lg">
        <div class="text-2xl font-bold text-blue-400 mb-1">
          {clusterMode === 'multi-gpu' ? selectedGPUs.length * 2.5 : clusterMode === 'multi-node' ? nodeCount * 1.8 : 1.0}x
        </div>
        <div class="text-purple-300">Performance Multiplier</div>
      </div>
      <div class="text-center p-4 bg-white/5 rounded-lg">
        <div class="text-2xl font-bold text-purple-400 mb-1">
          ${clusterMode === 'multi-gpu' ? selectedGPUs.length * 12 : clusterMode === 'multi-node' ? nodeCount * 8 : 5}/day
        </div>
        <div class="text-purple-300">Estimated Earnings</div>
      </div>
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
    
    <div class="space-x-3">
      <button 
        class="px-6 py-3 bg-gray-500/20 text-gray-300 rounded-xl hover:bg-gray-500/30 transition-all duration-200"
        on:click={handleSkip}
      >
        Skip for Now
      </button>
      
      <button 
        class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105"
        on:click={handleSetup}
      >
        {clusterMode === 'single' ? 'Continue →' : '🚀 Configure Cluster'}
      </button>
    </div>
  </div>
</div>