<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  
  const dispatch = createEventDispatcher()
</script>

<div class="text-center py-12">
  <!-- Hero Section -->
  <div class="relative mb-12">
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="w-32 h-32 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-xl"></div>
    </div>
    <div class="relative">
      <div class="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl">
        <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
        </svg>
      </div>
      <h1 class="text-4xl md:text-6xl font-bold text-white mb-4">
        Welcome to
        <span class="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Lattice Console
        </span>
      </h1>
      <p class="text-xl text-purple-200 max-w-2xl mx-auto leading-relaxed">
        Transform your spare computer into a powerful node in our decentralized cloud network. 
        Earn rewards while contributing to the future of distributed computing.
      </p>
    </div>
  </div>

  <!-- Features Grid -->
  <div class="grid md:grid-cols-3 gap-8 mb-12">
    <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
      <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-white mb-2">One-Click Setup</h3>
      <p class="text-purple-300 text-sm">
        We'll automatically install Docker, configure your system, and connect you to the network. 
        No technical expertise required.
      </p>
    </div>

    <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
      <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-white mb-2">Earn While You Sleep</h3>
      <p class="text-purple-300 text-sm">
        Set your compute hours and let your machine work for you. 
        Get compensated for contributing resources to the network.
      </p>
    </div>

    <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
      <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-white mb-2">Secure & Private</h3>
      <p class="text-purple-300 text-sm">
        Your data stays yours. All communications are encrypted, and you maintain full control 
        over your system and resources.
      </p>
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-8 mb-12">
    <div class="text-center">
      <div class="text-3xl font-bold text-white mb-1">10K+</div>
      <div class="text-purple-300 text-sm">Active Nodes</div>
    </div>
    <div class="text-center">
      <div class="text-3xl font-bold text-white mb-1">99.9%</div>
      <div class="text-purple-300 text-sm">Uptime</div>
    </div>
    <div class="text-center">
      <div class="text-3xl font-bold text-white mb-1">24/7</div>
      <div class="text-purple-300 text-sm">Support</div>
    </div>
  </div>

  <!-- Call to Action -->
  <div class="space-y-4">
    <button 
      class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
      on:click={() => dispatch('continue')}
    >
      Get Started Now
      <svg class="w-5 h-5 ml-2 inline" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
    </button>
    
    <div class="text-sm text-purple-400">
      <span>⚡ Setup takes less than 5 minutes</span>
      <span class="mx-2">•</span>
      <span>🔒 Enterprise-grade security</span>
      <span class="mx-2">•</span>
      <span>💰 Start earning immediately</span>
    </div>
  </div>

  <!-- Trust Indicators -->
  <div class="mt-12 pt-8 border-t border-purple-500/20">
    <p class="text-purple-400 text-sm mb-4">Trusted by developers worldwide</p>
    <div class="flex justify-center items-center space-x-8 opacity-60">
      <div class="text-white font-semibold">GitHub</div>
      <div class="text-white font-semibold">Docker</div>
      <div class="text-white font-semibold">Kubernetes</div>
      <div class="text-white font-semibold">AWS</div>
    </div>
  </div>
</div>