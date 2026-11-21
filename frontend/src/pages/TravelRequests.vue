<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Button, Dialog } from 'frappe-ui'
import EmptyState from '../components/EmptyState.vue'
import RequestsTable from '../components/RequestsTable.vue'
import TravelDetailsPanel from '../components/TravelDetailsPanel.vue'
import { addDays, parseDate, toISODate, today } from '../lib/format'
import {
  ALL_STATES,
  countForTab,
  loadTravel,
  matchesTab,
  REQUEST_TABS,
  stateLabel,
  travelStore,
  upcomingRows,
  type TravelRequestRow,
} from '../lib/travel'

onMounted(() => loadTravel())

const PAGE_SIZE = 6

const route = useRoute()
const TAB_KEYS = new Set(REQUEST_TABS.map((tab) => tab.key))
const DATE_FILTERS = new Set([
  'all',
  'upcoming',
  'this-month',
  'last-30',
  'this-year',
])

function queryText(key: string): string {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

// Dashboard KPI cards link here with `?tab=` / `?date=` so the matching
// filter is already applied when the list opens.
const activeTab = ref(
  TAB_KEYS.has(queryText('tab')) ? queryText('tab') : 'all',
)
const search = ref('')
const dateFilter = ref(
  DATE_FILTERS.has(queryText('date')) ? queryText('date') : 'all',
)
const statusFilter = ref('all')
const page = ref(1)

const detailsOpen = ref(false)
const selectedRequest = ref<TravelRequestRow | null>(null)

const rows = computed(() => travelStore.requests)

// Same definition as the dashboard's "Upcoming trips" KPI: future
// departures in the next 30 days, excluding rejected requests.
const upcomingNames = computed(
  () =>
    new Set(
      upcomingRows(rows.value, toISODate(today()), 30).map((row) => row.name),
    ),
)

const currentTab = computed(
  () => REQUEST_TABS.find((tab) => tab.key === activeTab.value) || REQUEST_TABS[0],
)

const tabCounts = computed(() =>
  REQUEST_TABS.reduce<Record<string, number>>((counts, tab) => {
    counts[tab.key] = countForTab(rows.value, tab)
    return counts
  }, {}),
)

function inDateRange(row: TravelRequestRow): boolean {
  if (dateFilter.value === 'all') return true
  if (dateFilter.value === 'upcoming') return upcomingNames.value.has(row.name)
  const departure = parseDate(row.departure_date)
  if (!departure) return false
  const now = today()
  if (dateFilter.value === 'this-month') {
    return (
      departure.getMonth() === now.getMonth() &&
      departure.getFullYear() === now.getFullYear()
    )
  }
  if (dateFilter.value === 'last-30') {
    const start = addDays(now, -30)
    return departure >= start && departure <= now
  }
  if (dateFilter.value === 'this-year') {
    return departure.getFullYear() === now.getFullYear()
  }
  return true
}

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return rows.value
    .filter((row) => matchesTab(row, currentTab.value))
    .filter((row) =>
      statusFilter.value === 'all'
        ? true
        : row.workflow_state === statusFilter.value,
    )
    .filter(inDateRange)
    .filter((row) => {
      if (!query) return true
      const haystack = [
        row.name,
        row.employee_name,
        row.from_city,
        row.to_city,
        row.purpose_of_travel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
})

const pageCount = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)),
)

const pageRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const rangeStart = computed(() =>
  filtered.value.length ? (page.value - 1) * PAGE_SIZE + 1 : 0,
)
const rangeEnd = computed(() =>
  Math.min(filtered.value.length, page.value * PAGE_SIZE),
)

const pageNumbers = computed(() => {
  const total = pageCount.value
  const current = page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const start = Math.min(Math.max(current - 2, 1), total - 4)
  return Array.from({ length: 5 }, (_, i) => start + i)
})

watch([activeTab, search, dateFilter, statusFilter], () => {
  page.value = 1
})

// Keep the list in sync when a dashboard card (or any link) changes the query.
watch(
  () => route.query.tab,
  (value) => {
    if (typeof value === 'string' && TAB_KEYS.has(value)) activeTab.value = value
  },
)

watch(
  () => route.query.date,
  (value) => {
    if (typeof value === 'string' && DATE_FILTERS.has(value)) {
      dateFilter.value = value
    }
  },
)

watch(pageCount, () => {
  if (page.value > pageCount.value) page.value = pageCount.value
})

function openDetails(row: TravelRequestRow) {
  selectedRequest.value = row
  detailsOpen.value = true
}

function nextPage() {
  if (page.value < pageCount.value) page.value += 1
}

function previousPage() {
  if (page.value > 1) page.value -= 1
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-7 sm:px-6 lg:px-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-[27px] font-semibold leading-[33px] text-[#172B4D]">
          My travel requests
        </h1>
        <p class="mt-1 text-[13px] leading-4 text-[#68778D]">
          Manage and track all your travel requests in one place.
        </p>
      </div>

      <Button
        theme="blue"
        variant="solid"
        size="lg"
        icon-left="lucide-plus"
        label="Create travel request"
        route="/requests/new"
      />
    </div>

    <section
      class="mt-8 rounded-[9px] border border-[#E5EAF1] bg-white shadow-[0_2px_5px_rgba(23,41,71,0.025)]"
    >
      <div class="overflow-x-auto border-b border-[#E5EAF1]">
        <div class="flex min-w-max items-center gap-7 px-[22px]">
          <button
            v-for="tab in REQUEST_TABS"
            :key="tab.key"
            type="button"
            class="relative flex items-center gap-2 pb-3 pt-5 text-[12px] leading-[15px]"
            :class="
              activeTab === tab.key
                ? 'font-semibold text-[#2563EB]'
                : 'font-medium text-[#68778D] hover:text-[#172B4D]'
            "
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span
              class="inline-flex h-[23px] min-w-[27px] items-center justify-center rounded-[5px] px-1.5 text-[10px] font-medium leading-[12px]"
              :class="
                activeTab === tab.key
                  ? 'bg-[#EFF5FF] text-[#2563EB]'
                  : 'bg-[#F1F4F8] text-[#68778D]'
              "
            >
              {{ String(tabCounts[tab.key] || 0).padStart(2, '0') }}
            </span>
            <span
              v-if="activeTab === tab.key"
              class="absolute inset-x-0 -bottom-px h-[3px] rounded-[1px] bg-[#2563EB]"
            />
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 px-[22px] py-5">
        <div class="relative w-full sm:w-[422px]">
          <svg
            viewBox="0 0 18 18"
            class="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#68778D]"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
          >
            <circle cx="8" cy="8" r="5.2" />
            <path d="m12 12 3.4 3.4" />
          </svg>
          <input
            v-model="search"
            type="search"
            placeholder="Search by request ID, employee or route"
            class="h-[38px] w-full rounded-[6px] border border-[#E5EAF1] bg-white pl-9 pr-3 text-[11px] leading-[13px] text-[#172B4D] placeholder:text-[#68778D] focus:border-[#2563EB] focus:outline-none"
          />
        </div>

        <div class="relative ml-auto">
          <select
            v-model="dateFilter"
            class="h-[38px] appearance-none rounded-[6px] border border-[#E5EAF1] bg-white pl-3 pr-8 text-[12px] font-medium text-[#172B4D] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            aria-label="Filter by date"
          >
            <option value="all">All dates</option>
            <option value="upcoming">Upcoming (30 days)</option>
            <option value="this-month">This month</option>
            <option value="last-30">Last 30 days</option>
            <option value="this-year">This year</option>
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
      </div>

      <RequestsTable
        v-if="pageRows.length"
        :rows="pageRows"
        show-employee
        @select="openDetails"
      />
      <p
        v-if="pageRows.length"
        class="px-[22px] pb-2 pt-1 text-[10px] leading-[12px] text-[#68778D] sm:hidden"
      >
        Swipe horizontally to view all columns.
      </p>
      <EmptyState
        v-else
        title="No requests found"
        description="Try a different tab, search term or filter. New requests you create will appear here."
      />

      <div
        v-if="pageRows.length"
        class="flex flex-wrap items-center gap-3 border-t border-[#E5EAF1] px-[22px] py-4"
      >
        <p class="text-[11px] leading-[13px] text-[#68778D]">
          Showing {{ rangeStart }}–{{ rangeEnd }} of {{ filtered.length }} requests
        </p>

        <div class="ml-auto flex items-center gap-2">
          <button
            type="button"
            class="h-[38px] rounded-[6px] border border-[#E5EAF1] bg-white px-3 text-[12px] font-medium text-[#172B4D] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page === 1"
            @click="previousPage"
          >
            ‹ Previous
          </button>

          <button
            v-for="number in pageNumbers"
            :key="number"
            type="button"
            class="h-[38px] w-[34px] rounded-[6px] text-[12px]"
            :class="
              number === page
                ? 'bg-[#EFF5FF] font-semibold text-[#2563EB]'
                : 'border border-[#E5EAF1] bg-white font-medium text-[#172B4D] hover:bg-[#F8FAFC]'
            "
            @click="page = number"
          >
            {{ number }}
          </button>

          <button
            type="button"
            class="h-[38px] rounded-[6px] border border-[#E5EAF1] bg-white px-3 text-[12px] font-medium text-[#172B4D] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page === pageCount"
            @click="nextPage"
          >
            Next ›
          </button>
        </div>
      </div>
    </section>

    <div class="mt-6 rounded-[7px] bg-[#F0F5FC] px-[17px] py-3.5">
      <p class="text-[12px] font-medium leading-[15px] text-[#172B4D]">
        Need to update a request?
      </p>
      <p class="mt-1.5 text-[11px] leading-[13px] text-[#68778D]">
        You can edit drafts before submitting. For an approved trip, contact your
        travel coordinator.
      </p>
    </div>

    <Dialog
      v-model:open="detailsOpen"
      :title="selectedRequest?.name || 'Travel details'"
      size="sm"
    >
      <TravelDetailsPanel :request="selectedRequest" plain />
    </Dialog>
  </div>
</template>
