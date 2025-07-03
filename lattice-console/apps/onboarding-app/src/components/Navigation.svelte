<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  
  export let steps: { id: string; title: string; description: string }[]
  export let currentStep: string
  
  const dispatch = createEventDispatcher()
  
  function goToStep(stepId: string) {
    dispatch('goto', stepId)
  }
  
  function getStepIndex(stepId: string) {
    return steps.findIndex(s => s.id === stepId)
  }
  
  function isStepCompleted(stepId: string) {
    return getStepIndex(stepId) < getStepIndex(currentStep)
  }
  
  function isStepCurrent(stepId: string) {
    return stepId === currentStep
  }
</script>

<nav class="bg-black/10 backdrop-blur-sm border-b border-purple-500/20">
  <div class="container mx-auto px-6 py-4">
    <div class="flex items-center justify-between">
      <!-- Step Progress -->
      <div class="flex items-center space-x-4 overflow-x-auto">
        {#each steps as step, index}
          <div class="flex items-center">
            <!-- Step Circle -->
            <button
              class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 {
                isStepCompleted(step.id) 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : isStepCurrent(step.id)
                  ? 'bg-purple-500 border-purple-500 text-white animate-pulse'
                  : 'bg-transparent border-purple-500/30 text-purple-400 hover:border-purple-500/50'
              }"
              on:click={() => goToStep(step.id)}
              disabled={!isStepCompleted(step.id) && !isStepCurrent(step.id)}
            >
              {#if isStepCompleted(step.id)}
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              {:else}
                <span class="text-sm font-medium">{index + 1}</span>
              {/if}
            </button>
            
            <!-- Step Label (Hidden on small screens) -->
            <div class="hidden md:block ml-3">
              <div class="text-sm font-medium {
                isStepCurrent(step.id) ? 'text-white' : 'text-purple-300'
              }">
                {step.title}
              </div>
              <div class="text-xs text-purple-400">
                {step.description}
              </div>
            </div>
            
            <!-- Connector Line -->
            {#if index < steps.length - 1}
              <div class="hidden md:block mx-4 w-8 h-0.5 {
                isStepCompleted(steps[index + 1].id) 
                  ? 'bg-green-500' 
                  : 'bg-purple-500/30'
              }"></div>
            {/if}
          </div>
        {/each}
      </div>
      
      <!-- Progress Percentage -->
      <div class="hidden lg:flex items-center space-x-3">
        <div class="text-sm text-purple-300">
          {Math.round(((getStepIndex(currentStep) + 1) / steps.length) * 100)}% Complete
        </div>
        <div class="w-24 h-2 bg-purple-500/20 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
            style="width: {((getStepIndex(currentStep) + 1) / steps.length) * 100}%"
          ></div>
        </div>
      </div>
    </div>
    
    <!-- Mobile Step Indicator -->
    <div class="md:hidden mt-4 text-center">
      <div class="text-sm font-medium text-white">
        {steps.find(s => s.id === currentStep)?.title}
      </div>
      <div class="text-xs text-purple-400">
        {steps.find(s => s.id === currentStep)?.description}
      </div>
      <div class="mt-2 w-full h-1 bg-purple-500/20 rounded-full overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
          style="width: {((getStepIndex(currentStep) + 1) / steps.length) * 100}%"
        ></div>
      </div>
    </div>
  </div>
</nav>