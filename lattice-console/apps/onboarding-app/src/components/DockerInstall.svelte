<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  
  export let dockerInstallProgress: any[] = []
  
  const dispatch = createEventDispatcher()
  
  $: isInstalling = dockerInstallProgress.length > 0 && dockerInstallProgress[dockerInstallProgress.length - 1]?.progress < 100
  $: isComplete = dockerInstallProgress.length > 0 && dockerInstallProgress[dockerInstallProgress.length - 1]?.progress === 100
  $: currentProgress = dockerInstallProgress.length > 0 ? dockerInstallProgress[dockerInstallProgress.length - 1] : null
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="text-center mb-8">
    <h2 class="text-3xl font-bold text-white mb-4">Docker Installation</h2>
    <p class="text-purple-300 max-w-2xl mx-auto">
      Docker is required to run cloud services on your machine. We'll automatically download and install 
      the latest version for your operating system.
    </p>
  </div>

  <!-- Installation Card -->
  <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 mb-8">
    {#if dockerInstallProgress.length === 0}
      <!-- Pre-installation -->
      <div class="text-center">
        <div class="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
          <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.5 3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM15 3a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM6 3a3 3 0 1 0 6 0c0-.546-.146-1.059-.401-1.5H18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V4.5A3 3 0 0 1 6 3Z"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-4">Ready to Install Docker</h3>
        <p class="text-purple-300 mb-6">
          This process will download and install Docker Desktop on your system. 
          The installation is automatic and typically takes 2-5 minutes.
        </p>
        
        <!-- What will happen -->
        <div class="bg-white/5 rounded-xl p-6 mb-6 text-left">
          <h4 class="font-semibold text-white mb-3">What will happen:</h4>
          <div class="space-y-2 text-sm text-purple-300">
            <div class="flex items-center space-x-3">
              <span class="text-blue-400">1.</span>
              <span>Download Docker Desktop installer for your OS</span>
            </div>
            <div class="flex items-center space-x-3">
              <span class="text-blue-400">2.</span>
              <span>Run the installer with proper permissions</span>
            </div>
            <div class="flex items-center space-x-3">
              <span class="text-blue-400">3.</span>
              <span>Configure Docker for optimal performance</span>
            </div>
            <div class="flex items-center space-x-3">
              <span class="text-blue-400">4.</span>
              <span>Start Docker service automatically</span>
            </div>
          </div>
        </div>
        
        <button 
          class="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105"
          on:click={() => dispatch('install')}
        >
          🐳 Install Docker Now
        </button>
      </div>
    {:else}
      <!-- Installation Progress -->
      <div class="space-y-6">
        <div class="text-center">
          <h3 class="text-xl font-semibold text-white mb-2">
            {isComplete ? '🎉 Installation Complete!' : '⚙️ Installing Docker...'}
          </h3>
          <p class="text-purple-300">
            {isComplete 
              ? 'Docker has been successfully installed and configured!'
              : 'Please wait while we install Docker on your system.'}
          </p>
        </div>

        <!-- Progress Bar -->
        <div class="space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-purple-300">Progress</span>
            <span class="text-white font-medium">{currentProgress?.progress || 0}%</span>
          </div>
          <div class="w-full h-3 bg-purple-500/20 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 ease-out"
              style="width: {currentProgress?.progress || 0}%"
            ></div>
          </div>
        </div>

        <!-- Progress Steps -->
        <div class="space-y-3">
          {#each dockerInstallProgress as progress, index}
            <div class="flex items-start space-x-3 p-3 rounded-lg {
              progress.success 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-red-500/10 border border-red-500/20'
            }">
              <div class="flex-shrink-0 mt-1">
                {#if progress.success}
                  <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                {:else}
                  <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                {/if}
              </div>
              <div class="flex-1">
                <div class="text-sm font-medium {progress.success ? 'text-green-400' : 'text-red-400'}">
                  {progress.step.charAt(0).toUpperCase() + progress.step.slice(1)}
                </div>
                <div class="text-sm {progress.success ? 'text-green-300' : 'text-red-300'}">
                  {progress.message}
                </div>
              </div>
            </div>
          {/each}
        </div>

        <!-- Loading Animation -->
        {#if isInstalling}
          <div class="flex items-center justify-center py-6">
            <div class="flex space-x-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
              <div class="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Important Notes -->
  <div class="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 mb-8">
    <h4 class="font-semibold text-yellow-400 mb-3">⚠️ Important Notes</h4>
    <div class="space-y-2 text-sm text-yellow-300">
      <p>• You may be prompted for administrator permissions during installation</p>
      <p>• The installation may require a system restart on Windows</p>
      <p>• Docker Desktop will start automatically after installation</p>
      <p>• On Linux, you may need to log out and log back in for group permissions</p>
    </div>
  </div>

  <!-- Troubleshooting -->
  <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 mb-8">
    <h4 class="font-semibold text-white mb-3">🔧 Troubleshooting</h4>
    <div class="space-y-3 text-sm text-purple-300">
      <details class="cursor-pointer">
        <summary class="font-medium text-white hover:text-purple-300 transition-colors">
          Installation fails or hangs
        </summary>
        <div class="mt-2 pl-4 space-y-1">
          <p>• Ensure you have administrator privileges</p>
          <p>• Temporarily disable antivirus software</p>
          <p>• Check for Windows updates (Windows users)</p>
          <p>• Restart your computer and try again</p>
        </div>
      </details>
      
      <details class="cursor-pointer">
        <summary class="font-medium text-white hover:text-purple-300 transition-colors">
          Docker won't start after installation
        </summary>
        <div class="mt-2 pl-4 space-y-1">
          <p>• Restart your computer</p>
          <p>• Check if virtualization is enabled in BIOS</p>
          <p>• Ensure Windows Subsystem for Linux is installed (Windows)</p>
          <p>• Try starting Docker manually from the Applications folder</p>
        </div>
      </details>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="flex justify-between">
    <button 
      class="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl hover:border-purple-500/50 hover:text-purple-200 transition-all duration-200"
      on:click={() => dispatch('back')}
      disabled={isInstalling}
    >
      ← Back
    </button>
    
    <div class="space-x-3">
      {#if isComplete}
        <button 
          class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          on:click={() => dispatch('continue')}
        >
          Continue →
        </button>
      {:else if dockerInstallProgress.length > 0 && !isInstalling}
        <button 
          class="px-6 py-3 bg-blue-500/20 text-blue-300 rounded-xl hover:bg-blue-500/30 transition-all duration-200"
          on:click={() => dispatch('install')}
        >
          🔄 Retry Installation
        </button>
      {/if}
    </div>
  </div>
</div>