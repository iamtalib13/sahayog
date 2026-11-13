<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import MonthView from '../components/MonthView.vue'
import TravelDetailsPanel from '../components/TravelDetailsPanel.vue'
import {
  addDays,
  addMonths,
  formatMonthYear,
  formatWeekRange,
  startOfMonth,
  today,
  weekDays,
} from '../lib/format'
import {
  ALL_STATES,
  loadTravel,
  stateLabel,
  toCalendarEvents,
  travelStore,
  type CalendarEvent,
} from '../lib/travel'

onMounted(() => loadTravel())

const cursor = ref(today())
const view = ref<'month' | 'week'>('month')
const employeeFilter = ref('all')
const statusFilter = ref('all')
const selectedId = ref('')

const allEvents = computed(() => toCalendarEvents(travelStore.requests))

const employeeOptions = computed(() => travelStore.employees)

const events = computed(() =>
  allEvents.value.filter((event) => {
    if (employeeFilter.value !== 'all' && event.row.employee !== employeeFilter.value) {
      return false
    }
    if (statusFilter.value !== 'all' && event.workflow_state !== statusFilter.value) {
      return false
    }
    return true
  }),
)

const selectedEvent = computed<CalendarEvent | null>(
  () => events.value.find((event) => event.id === selectedId.value) || null,
)

const title = computed(() =>
  view.value === 'month'
    ? formatMonthYear(cursor.value)
    : `Week of ${formatWeekRange(weekDays(cursor.value))}`,
)

watch(events, () => {
  if (selectedId.value && !selectedEvent.value) selectedId.value = ''
})

function previous() {
  cursor.value =
    view.value === 'month'
      ? addMonths(startOfMonth(cursor.value), -1)
      : addDays(cursor.value, -7)
}

function next() {
  cursor.value =
    view.value === 'month'
      ? addMonths(startOfMonth(cursor.value), 1)
      : addDays(cursor.value, 7)
}

function goToday() {
  cursor.value = today()
}

function selectEvent(event: CalendarEvent) {
  selectedId.value = event.id
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-7 sm:px-6 lg:px-8">
    <p class="text-[10px] font-semibold uppercase leading-[12px] tracking-[0.06em] text-[#68778D]">
      Travel management
    </p>
    <h1 class="mt-2 text-[27px] font-semibold leading-[33px] text-[#172B4D]">
      Travel calendar
    </h1>
    <p class="mt-1 text-[13px] leading-4 text-[#68778D]">
      Plan ahead and keep track of your team's travel.
    </p>

    <div class="mt-8 flex flex-wrap items-center gap-2.5">
      <h2 class="mr-2 text-[18px] font-semibold leading-[22px] text-[#172B4D]">
        {{ title }}
      </h2>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="flex h-[38px] w-8 items-center justify-center rounded-[6px] border border-[#E5EAF1] bg-white text-[#172B4D] hover:bg-[#F8FAFC]"
          aria-label="Previous period"
          @click="previous"
        >
          ‹
        </button>
        <button
          type="button"
          class="flex h-[38px] w-8 items-center justify-center rounded-[6px] border border-[#E5EAF1] bg-white text-[#172B4D] hover:bg-[#F8FAFC]"
          aria-label="Next period"
          @click="next"
        >
          ›
        </button>
        <button
          type="button"
          class="h-[38px] rounded-[6px] border border-[#E5EAF1] bg-white px-3 text-[12px] font-medium text-[#172B4D] hover:bg-[#F8FAFC]"
          @click="goToday"
        >
          Today
        </button>
      </div>

      <div class="relative">
        <select
          v-model="employeeFilter"
          class="h-[38px] appearance-none rounded-[6px] border border-[#E5EAF1] bg-white pl-3 pr-8 text-[12px] font-medium text-[#172B4D] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          aria-label="Filter by employee"
        >
          <option value="all">All employees</option>
          <option
            v-for="employee in employeeOptions"
            :key="employee.name"
            :value="employee.name"
          >
            {{ employee.employee_name }}
          </option>
        </select>
        <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#68778D]">
          ⌄
        </span>
      </div>

      <div class="relative">
        <select
          v-model="statusFilter"
          class="h-[38px] appearance-none rounded-[6px] border border-[#E5EAF1] bg-white pl-3 pr-8 text-[12px] font-medium text-[#172B4D] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option v-for="state in ALL_STATES" :key="state" :value="state">
            {{ stateLabel(state) }}
          </option>
        </select>
        <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#68778D]">
          ⌄
        </span>
      </div>

      <div class="ml-auto flex h-[38px] items-center rounded-[7px] bg-[#EDF1F6] p-[3px]">
        <button
          type="button"
          class="flex h-[32px] w-[84px] items-center justify-center rounded-[5px] text-[12px] leading-[15px]"
          :class="
            view === 'month'
              ? 'bg-white font-semibold text-[#172B4D] shadow-sm'
              : 'font-medium text-[#68778D]'
          "
          @click="view = 'month'"
        >
          Month
        </button>
        <button
          type="button"
          class="flex h-[32px] w-[84px] items-center justify-center rounded-[5px] text-[12px] leading-[15px]"
          :class="
            view === 'week'
              ? 'bg-white font-semibold text-[#172B4D] shadow-sm'
              : 'font-medium text-[#68778D]'
          "
          @click="view = 'week'"
        >
          Week
        </button>
      </div>
    </div>

    <div class="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_322px]">
      <div class="min-w-0">
        <MonthView
          :cursor="cursor"
          :events="events"
          :selected="selectedId"
          :mode="view"
          @select="selectEvent"
        />

        <div class="mt-4 flex flex-wrap items-center gap-5 text-[11px] leading-[13px] text-[#68778D]">
          <span class="inline-flex items-center gap-2">
            <span class="h-[7px] w-[7px] rounded-full bg-[#227453]" /> Approved
          </span>
          <span class="inline-flex items-center gap-2">
            <span class="h-[7px] w-[7px] rounded-full bg-[#B17A1E]" /> Pending approval
          </span>
          <span class="inline-flex items-center gap-2">
            <span class="h-[7px] w-[7px] rounded-full bg-[#8090A6]" /> Draft
          </span>
          <span class="inline-flex items-center gap-2">
            <span class="h-[7px] w-[7px] rounded-full bg-[#B42318]" /> Rejected
          </span>
          <span class="ml-auto text-[10px] leading-[12px]">
            Select an event to view its details
          </span>
        </div>

        <p class="mt-3 text-[10px] leading-[12px] text-[#68778D]">
          Calendar displays travel across your team. Dates shown in local time.
        </p>
      </div>

      <aside class="hidden lg:block">
        <TravelDetailsPanel
          v-if="selectedEvent"
          :request="selectedEvent.row"
          closable
          @close="selectedId = ''"
        />
        <div
          v-else
          class="rounded-lg border border-[#E5EAF1] bg-white px-[22px] py-6"
        >
          <p class="text-[10px] font-semibold uppercase leading-[12px] tracking-[0.08em] text-[#68778D]">
            Travel details
          </p>
          <p class="mt-3 text-[12px] leading-[18px] text-[#68778D]">
            Select a travel request on the calendar to see the employee, dates,
            purpose and approval status.
          </p>
        </div>
      </aside>
    </div>

    <div v-if="selectedEvent" class="mt-5 lg:hidden">
      <TravelDetailsPanel
        :request="selectedEvent.row"
        closable
        @close="selectedId = ''"
      />
    </div>
  </div>
</template>
