<script setup lang="ts">
import { computed } from 'vue'
import {
  formatCurrency,
  formatDuration,
  formatLongRange,
  toTitleCase,
} from '../lib/format'
import { travelStore, type TravelRequestRow } from '../lib/travel'
import StatusBadge from './StatusBadge.vue'

const props = withDefaults(
  defineProps<{
    request: TravelRequestRow | null
    closable?: boolean
    /** Rendered inside a dialog, which already supplies the card surface. */
    plain?: boolean
  }>(),
  { closable: false, plain: false },
)

defineEmits<{ close: [] }>()

const deskUrl = computed(() =>
  props.request ? `/app/travel-request/${props.request.name}` : '',
)
</script>

<template>
  <div
    v-if="request"
    class="flex flex-col"
    :class="plain ? '' : 'h-full rounded-lg border border-[#E5EAF1] bg-white'"
  >
    <div class="flex items-center justify-between px-[22px] pt-[22px]">
      <p class="text-[10px] font-semibold uppercase leading-[12px] tracking-[0.08em] text-[#68778D]">
        Travel details
      </p>
      <button
        v-if="closable"
        type="button"
        class="-mr-1 flex h-7 w-7 items-center justify-center rounded-md text-[19px] leading-none text-[#68778D] hover:bg-[#F8FAFC]"
        aria-label="Close details"
        @click="$emit('close')"
      >
        ×
      </button>
    </div>

    <div class="flex-1 px-[22px] pb-5 pt-4">
      <StatusBadge :state="request.workflow_state" :full="true" />

      <p class="mt-5 text-[22px] font-semibold leading-[27px] text-[#172B4D]">
        {{ request.from_city || '—' }} → {{ request.to_city || '—' }}
      </p>
      <p class="mt-1.5 text-[11px] leading-[13px] text-[#68778D]">
        {{ request.name }} · {{ request.travel_type || 'Domestic' }} travel
      </p>

      <div class="my-5 h-px bg-[#E5EAF1]" />

      <div>
        <p class="text-[9px] font-semibold uppercase leading-[11px] tracking-[0.08em] text-[#68778D]">
          Employee
        </p>
        <p class="mt-2 text-[12px] font-medium leading-[15px] text-[#172B4D]">
          {{ toTitleCase(request.employee_name) || '—' }}
        </p>
        <p class="mt-1 text-[10px] leading-[12px] text-[#68778D]">
          Employee ID {{ request.employee || '—' }}
        </p>
      </div>

      <div class="mt-6">
        <p class="text-[9px] font-semibold uppercase leading-[11px] tracking-[0.08em] text-[#68778D]">
          Travel dates
        </p>
        <p class="mt-2 text-[12px] font-medium leading-[15px] text-[#172B4D]">
          {{ formatLongRange(request.departure_date, request.return_date) }}
        </p>
        <p class="mt-1 text-[10px] leading-[12px] text-[#68778D]">
          {{ formatDuration(request.departure_date, request.return_date) }}
        </p>
      </div>

      <div class="mt-6">
        <p class="text-[9px] font-semibold uppercase leading-[11px] tracking-[0.08em] text-[#68778D]">
          Purpose of travel
        </p>
        <p class="mt-2 text-[12px] font-medium leading-[15px] text-[#172B4D]">
          {{ request.purpose_of_travel || '—' }}
        </p>
      </div>

      <div class="mt-6">
        <p class="text-[9px] font-semibold uppercase leading-[11px] tracking-[0.08em] text-[#68778D]">
          Mode of travel
        </p>
        <p class="mt-2 text-[12px] font-medium leading-[15px] text-[#172B4D]">
          {{ request.mode_of_travel || '—' }}
        </p>
      </div>

      <div class="mt-6">
        <p class="text-[9px] font-semibold uppercase leading-[11px] tracking-[0.08em] text-[#68778D]">
          Estimated cost
        </p>
        <p class="mt-2 text-[12px] font-medium leading-[15px] text-[#172B4D]">
          {{ formatCurrency(request.estimated_travel_cost) }}
        </p>
        <p class="mt-1 text-[10px] leading-[12px] text-[#68778D]">
          Estimated, subject to approval
        </p>
      </div>

      <div v-if="request.advance_required" class="mt-6">
        <p class="text-[9px] font-semibold uppercase leading-[11px] tracking-[0.08em] text-[#68778D]">
          Advance requested
        </p>
        <p class="mt-2 text-[12px] font-medium leading-[15px] text-[#172B4D]">
          {{ formatCurrency(request.advance_amount) }}
        </p>
      </div>

      <div v-if="request.deviation_requested" class="mt-6">
        <p class="text-[9px] font-semibold uppercase leading-[11px] tracking-[0.08em] text-[#68778D]">
          Policy deviation
        </p>
        <p class="mt-2 text-[12px] leading-[16px] text-[#172B4D]">
          {{ request.deviation_reason || 'Requested' }}
        </p>
      </div>

      <div class="my-5 h-px bg-[#E5EAF1]" />

      <p v-if="request.approver_remarks" class="text-[11px] leading-[16px] text-[#68778D]">
        {{ request.approver_remarks }}
      </p>
      <p v-else class="text-[11px] leading-[13px] text-[#68778D]">
        Reporting manager:
        {{
          toTitleCase(travelStore.managerNames[request.reporting_manager || '']) ||
          request.reporting_manager ||
          '—'
        }}
      </p>
    </div>

    <div class="px-[22px] pb-[22px]">
      <a
        :href="deskUrl"
        class="flex h-[38px] items-center justify-center gap-2 rounded-[6px] bg-[#2563EB] text-[12px] font-medium leading-[15px] text-white hover:bg-[#1d4fd8]"
      >
        View travel request <span aria-hidden="true">→</span>
      </a>
    </div>
  </div>
</template>
