<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  { description: '' },
)
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div
      class="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#EFF5FF] text-[#2563EB]"
    >
      <svg
        viewBox="0 0 24 24"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    </div>
    <p class="text-[13px] font-semibold text-[#172B4D]">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-sm text-[11px] leading-[16px] text-[#68778D]">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
