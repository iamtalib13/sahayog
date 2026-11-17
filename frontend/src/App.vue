<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { FrappeUIProvider } from 'frappe-ui'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import { loadTravel, travelStore } from './lib/travel'

const navOpen = ref(false)

// Loaded once here so the header can show the logged-in employee and every
// page reuses the same permission-scoped dataset.
onMounted(() => loadTravel())
</script>

<template>
  <FrappeUIProvider>
    <div
      class="flex min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#172B4D] antialiased"
    >
      <AppSidebar :open="navOpen" @close="navOpen = false" />

      <div class="flex min-w-0 flex-1 flex-col">
        <AppHeader @toggle-nav="navOpen = !navOpen" />
        <div
          v-if="travelStore.error"
          class="border-b border-[#F6D5D5] bg-[#FDECEC] px-4 py-2 text-[11px] leading-4 text-[#B42318] sm:px-6 lg:px-8"
        >
          Could not load travel requests. {{ travelStore.error }}
        </div>
        <main class="min-w-0 flex-1">
          <RouterView />
        </main>
      </div>
    </div>
  </FrappeUIProvider>
</template>
