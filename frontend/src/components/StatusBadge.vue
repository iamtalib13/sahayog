<script setup lang="ts">
import { computed } from 'vue'
import {
  stateLabel,
  stateTone,
  type StatusTone,
} from '../lib/travel'

const props = withDefaults(
  defineProps<{
    state?: string | null
    /** Show the full workflow state instead of the short badge label. */
    full?: boolean
  }>(),
  { state: '', full: false },
)

const toneClasses: Record<StatusTone, string> = {
  green: 'bg-[#EDF8F3] text-[#227453]',
  amber: 'bg-[#FFF7E8] text-[#936416]',
  gray: 'bg-[#F0F3F7] text-[#677489]',
  blue: 'bg-[#EFF5FF] text-[#2563EB]',
  red: 'bg-[#FDECEC] text-[#B42318]',
}

const label = computed(() =>
  props.full ? props.state || 'Draft' : stateLabel(props.state),
)
const classes = computed(() => toneClasses[stateTone(props.state)])
</script>

<template>
  <span
    :title="state || 'Draft'"
    class="inline-flex items-center whitespace-nowrap rounded-[5px] px-[10px] py-[6px] text-[11px] font-medium leading-[13px]"
    :class="classes"
  >
    {{ label }}
  </span>
</template>
