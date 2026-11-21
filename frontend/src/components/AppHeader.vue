<script setup lang="ts">
import { computed } from 'vue'
import { toTitleCase } from '../lib/format'
import { travelStore } from '../lib/travel'

defineEmits<{ toggleNav: [] }>()

const employeeName = computed(() => {
  if (travelStore.employee?.employee_name) {
    return toTitleCase(travelStore.employee.employee_name)
  }
  return travelStore.user || ''
})

const employeeRole = computed(() => {
  return (
    travelStore.employee?.designation ||
    travelStore.employee?.department ||
    'Employee workspace'
  )
})
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-[#E5EAF1] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8"
  >
    <div class="flex min-w-0 items-center gap-3">
      <button
        type="button"
        class="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-[#68778D] hover:bg-[#F8FAFC] lg:hidden"
        aria-label="Open navigation"
        @click="$emit('toggleNav')"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <div class="min-w-0">
        <p class="truncate text-[14px] font-semibold leading-[17px] text-[#172B4D]">
          Travel management
        </p>
        <p class="truncate text-[12px] leading-[15px] text-[#68778D]">
          Employee workspace
        </p>
      </div>
    </div>

    <div class="flex items-center gap-3 sm:gap-4">
      <span
        class="hidden rounded-[4px] bg-[#F1F4F8] px-2 py-1 text-[9px] font-semibold uppercase leading-[11px] tracking-[0.08em] text-[#68778D] sm:inline-flex"
      >
        Internal
      </span>

      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-md text-[#68778D] hover:bg-[#F8FAFC]"
        aria-label="Notifications"
      >
        <svg
          viewBox="0 0 20 20"
          class="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M10 2.5a5 5 0 0 0-5 5v3.2L3.6 13.4h12.8L15 10.7V7.5a5 5 0 0 0-5-5Z" />
          <path d="M8 15.5a2 2 0 0 0 4 0" />
        </svg>
      </button>

      <a
        href="/app/user"
        class="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-[#F8FAFC]"
      >
        <span class="hidden min-w-0 text-right sm:block">
          <span class="block max-w-[190px] truncate text-[12px] font-medium leading-[15px] text-[#172B4D]">
            {{ employeeName }}
          </span>
          <span class="block max-w-[190px] truncate text-[10px] leading-[12px] text-[#68778D]">
            {{ employeeRole }}
          </span>
        </span>
        <svg
          viewBox="0 0 12 12"
          class="h-3 w-3 shrink-0 text-[#68778D]"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </a>
    </div>
  </header>
</template>
