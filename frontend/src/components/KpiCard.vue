<script setup lang="ts">
import { RouterLink } from 'vue-router'

withDefaults(
  defineProps<{
    label: string
    value: string | number
    hint?: string
    /** Optional status dot colour, e.g. amber for pending. */
    dot?: string
    /** When set, the whole card links to the matching filtered list. */
    to?: string
  }>(),
  { hint: '', dot: '', to: '' },
)
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to || undefined"
    class="relative block rounded-[9px] border border-[#E5EAF1] bg-white px-5 py-[17px] shadow-[0_2px_5px_rgba(23,41,71,0.025)]"
    :class="
      to
        ? 'transition hover:border-[#C7D5E8] hover:shadow-[0_4px_12px_rgba(23,41,71,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]'
        : ''
    "
  >
    <span
      v-if="dot"
      class="absolute right-5 top-[21px] h-[6px] w-[6px] rounded-full"
      :style="{ backgroundColor: dot }"
    />
    <p class="text-[12px] font-medium leading-[15px] text-[#68778D]">
      {{ label }}
    </p>
    <p class="mt-[7px] text-[30px] font-semibold leading-[36px] text-[#172B4D]">
      {{ value }}
    </p>
    <p class="mt-[13px] text-[11px] leading-[13px] text-[#68778D]">
      {{ hint }}
    </p>
  </component>
</template>
