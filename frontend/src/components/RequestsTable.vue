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
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-left" :class="showEmployee ? 'min-w-[880px]' : 'min-w-[720px]'">
      <thead>
        <tr class="bg-[#F8FAFC]">
          <th class="whitespace-nowrap px-[22px] py-[14px] text-[9px] font-semibold uppercase leading-[11px] tracking-[0.04em] text-[#68778D]">
            Request ID
          </th>
          <th
            v-if="showEmployee"
            class="whitespace-nowrap px-[22px] py-[14px] text-[9px] font-semibold uppercase leading-[11px] tracking-[0.04em] text-[#68778D]"
          >
            Employee
          </th>
          <th class="whitespace-nowrap px-[22px] py-[14px] text-[9px] font-semibold uppercase leading-[11px] tracking-[0.04em] text-[#68778D]">
            Travel route
          </th>
          <th class="whitespace-nowrap px-[22px] py-[14px] text-[9px] font-semibold uppercase leading-[11px] tracking-[0.04em] text-[#68778D]">
            Travel dates
          </th>
          <th
            v-if="!showEmployee"
            class="whitespace-nowrap px-[22px] py-[14px] text-[9px] font-semibold uppercase leading-[11px] tracking-[0.04em] text-[#68778D]"
          >
            Submitted
          </th>
          <th class="whitespace-nowrap px-[22px] py-[14px] text-[9px] font-semibold uppercase leading-[11px] tracking-[0.04em] text-[#68778D]">
            Status
          </th>
          <th class="whitespace-nowrap px-[22px] py-[14px] text-[9px] font-semibold uppercase leading-[11px] tracking-[0.04em] text-[#68778D]">
            Action
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.name"
          class="h-[72px] border-b border-[#E5EAF1] last:border-b-0"
        >
          <td class="whitespace-nowrap px-[22px] py-3">
            <span class="text-[12px] font-medium leading-[15px] text-[#2563EB]">
              {{ row.name }}
            </span>
          </td>

          <td v-if="showEmployee" class="px-[22px] py-3">
            <p class="text-[12px] font-medium leading-[15px] text-[#172B4D]">
              {{ toTitleCase(row.employee_name) || '—' }}
            </p>
            <p class="mt-1 text-[10px] leading-[12px] text-[#68778D]">
              {{ row.travel_type || 'Domestic' }} travel
            </p>
          </td>

          <td class="px-[22px] py-3">
            <p class="text-[12px] font-medium leading-[15px] text-[#172B4D]">
              {{ row.from_city || '—' }} → {{ row.to_city || '—' }}
            </p>
            <p class="mt-1 max-w-[220px] truncate text-[10px] leading-[12px] text-[#68778D]">
              {{ row.purpose_of_travel || '—' }}
            </p>
          </td>

          <td class="px-[22px] py-3">
            <p class="whitespace-nowrap text-[12px] leading-[15px] text-[#172B4D]">
              {{ formatRange(row.departure_date, row.return_date) }}
            </p>
            <p class="mt-1 text-[10px] leading-[12px] text-[#68778D]">
              {{ tripDays(row.departure_date, row.return_date) }} days
            </p>
          </td>

          <td v-if="!showEmployee" class="whitespace-nowrap px-[22px] py-3 text-[12px] leading-[15px] text-[#68778D]">
            {{ formatDate(row.creation) }}
          </td>

          <td class="px-[22px] py-3">
            <StatusBadge :state="row.workflow_state" />
          </td>

          <td class="px-[22px] py-3">
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
