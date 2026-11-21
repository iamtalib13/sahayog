<script setup lang="ts">
import { formatDate, formatRange, toTitleCase, tripDays } from '../lib/format'
import type { TravelRequestRow } from '../lib/travel'
import StatusBadge from './StatusBadge.vue'

withDefaults(
  defineProps<{
    rows: TravelRequestRow[]
    /** Employee column (My travel requests) instead of the submitted date. */
    showEmployee?: boolean
  }>(),
  { showEmployee: false },
)

defineEmits<{ select: [row: TravelRequestRow] }>()

const headClass =
  'whitespace-nowrap px-3 py-[10px] text-[9px] font-semibold uppercase leading-[11px] tracking-[0.04em] text-[#68778D] sm:px-[22px] sm:py-[14px]'
</script>

<template>
  <div class="overflow-x-auto touch-pan-x">
    <table
      class="w-full border-collapse text-left"
      :class="showEmployee ? 'min-w-[880px]' : 'min-w-[780px]'"
    >
      <thead>
        <tr class="bg-[#F8FAFC]">
          <th :class="headClass">Request ID</th>
          <th v-if="showEmployee" :class="headClass">Employee</th>
          <th :class="headClass">From–To</th>
          <th :class="headClass">Travel date</th>
          <th :class="headClass">Purpose</th>
          <th v-if="!showEmployee" :class="headClass">Submitted</th>
          <th :class="headClass">Status</th>
          <th :class="headClass">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.name"
          class="h-[72px] border-b border-[#E5EAF1] last:border-b-0"
        >
          <td class="whitespace-nowrap px-3 py-2 sm:px-[22px] sm:py-3">
            <span class="text-[12px] font-medium leading-[15px] text-[#2563EB]">
              {{ row.name }}
            </span>
          </td>

          <td v-if="showEmployee" class="px-3 py-2 sm:px-[22px] sm:py-3">
            <p class="text-[12px] font-medium leading-[15px] text-[#172B4D]">
              {{ toTitleCase(row.employee_name) || '—' }}
            </p>
            <p class="mt-1 text-[10px] leading-[12px] text-[#68778D]">
              {{ row.travel_type || 'Domestic' }} travel
            </p>
          </td>

          <td class="px-3 py-2 sm:px-[22px] sm:py-3">
            <p class="whitespace-nowrap text-[12px] font-medium leading-[15px] text-[#172B4D]">
              {{ row.from_city || '—' }} → {{ row.to_city || '—' }}
            </p>
          </td>

          <td class="px-3 py-2 sm:px-[22px] sm:py-3">
            <p class="whitespace-nowrap text-[12px] leading-[15px] text-[#172B4D]">
              {{ formatRange(row.departure_date, row.return_date) }}
            </p>
            <p class="mt-1 text-[10px] leading-[12px] text-[#68778D]">
              {{ tripDays(row.departure_date, row.return_date) }} days
            </p>
          </td>

          <td class="px-3 py-2 sm:px-[22px] sm:py-3">
            <p
              class="max-w-[220px] truncate text-[12px] leading-[15px] text-[#172B4D]"
              :title="row.purpose_of_travel || '—'"
            >
              {{ row.purpose_of_travel || '—' }}
            </p>
          </td>

          <td
            v-if="!showEmployee"
            class="whitespace-nowrap px-3 py-2 sm:px-[22px] sm:py-3 text-[12px] leading-[15px] text-[#68778D]"
          >
            {{ formatDate(row.creation) }}
          </td>

          <td class="px-3 py-2 sm:px-[22px] sm:py-3">
            <StatusBadge :state="row.workflow_state" />
          </td>

          <td class="px-3 py-2 sm:px-[22px] sm:py-3">
            <button
              type="button"
              class="whitespace-nowrap text-[11px] font-medium leading-[13px] text-[#2563EB] hover:underline"
              @click="$emit('select', row)"
            >
              View details →
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
