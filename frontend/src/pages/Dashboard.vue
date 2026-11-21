<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, Dialog } from 'frappe-ui'
import EmptyState from '../components/EmptyState.vue'
import KpiCard from '../components/KpiCard.vue'
import RequestsTable from '../components/RequestsTable.vue'
import TravelDetailsPanel from '../components/TravelDetailsPanel.vue'
import {
  formatDateLong,
  formatDayPadded,
  formatMonthShort,
  formatRange,
  firstName,
  parseDate,
  toISODate,
  today,
  toTitleCase,
  tripDays,
} from '../lib/format'
import {
  loadTravel,
  PENDING_STATES,
  STATES,
  travelStore,
  upcomingRows,
  type TravelRequestRow,
} from '../lib/travel'

onMounted(() => loadTravel())

const rows = computed(() => travelStore.requests)
const todayDate = today()

const pendingCount = computed(
  () =>
    rows.value.filter((row) =>
      PENDING_STATES.includes(row.workflow_state || ''),
    ).length,
)
const approvedCount = computed(
  () => rows.value.filter((row) => row.workflow_state === STATES.approved).length,
)
const upcomingIn30 = computed(() =>
  upcomingRows(rows.value, toISODate(todayDate), 30),
)
const upcomingPreview = computed(() =>
  upcomingRows(rows.value, toISODate(todayDate), 365).slice(0, 5),
)
const recentRows = computed(() => rows.value.slice(0, 5))

const greetingName = computed(() => firstName(travelStore.employee?.employee_name))
const longDate = formatDateLong(todayDate)
const totalLabel = computed(() => String(rows.value.length).padStart(2, '0'))

const detailsOpen = ref(false)
const selectedRequest = ref<TravelRequestRow | null>(null)

function openDetails(row: TravelRequestRow) {
  selectedRequest.value = row
  detailsOpen.value = true
}

function departureDate(row: TravelRequestRow): Date | null {
  return parseDate(row.departure_date)
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-7 sm:px-6 lg:px-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-[10px] font-semibold uppercase leading-[12px] tracking-[0.06em] text-[#68778D]">
          {{ longDate }}
        </p>
        <h1 class="mt-2 text-[27px] font-semibold leading-[33px] text-[#172B4D]">
          Welcome back, {{ greetingName }}
        </h1>
        <p class="mt-1 text-[13px] leading-4 text-[#68778D]">
          Here's an overview of your business travel.
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

    <div class="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
      <KpiCard
        label="Total requests"
        :value="totalLabel"
        :hint="`Your requests in ${todayDate.getFullYear()}`"
        to="/requests"
      />
      <KpiCard
        label="Pending approval"
        :value="String(pendingCount).padStart(2, '0')"
        hint="Awaiting manager review"
        dot="#D69B2B"
        to="/requests?tab=pending"
      />
      <KpiCard
        label="Approved"
        :value="String(approvedCount).padStart(2, '0')"
        hint="Ready for business travel"
        to="/requests?tab=approved"
      />
      <KpiCard
        label="Upcoming trips"
        :value="String(upcomingIn30.length).padStart(2, '0')"
        hint="In the next 30 days"
        to="/requests?date=upcoming"
      />
    </div>

    <section
      class="mt-8 rounded-[9px] border border-[#E5EAF1] bg-white shadow-[0_2px_5px_rgba(23,41,71,0.025)]"
    >
      <div class="flex flex-wrap items-start justify-between gap-3 px-[22px] pt-5">
        <div>
          <h2 class="text-[16px] font-semibold leading-[19px] text-[#172B4D]">
            Upcoming travel
          </h2>
          <p class="mt-1.5 text-[12px] leading-[15px] text-[#68778D]">
            Your next business trips at a glance
          </p>
        </div>
        <RouterLink
          to="/calendar"
          class="text-[12px] font-medium leading-[15px] text-[#2563EB] hover:underline"
        >
          View calendar →
        </RouterLink>
      </div>

      <div class="mt-5 h-px bg-[#E5EAF1]" />

      <div v-if="upcomingPreview.length" class="grid sm:grid-cols-3">
        <div
          v-for="(trip, index) in upcomingPreview"
          :key="trip.name"
          class="px-[22px] py-5 sm:border-l sm:border-[#E5EAF1] sm:first:border-l-0"
          :class="index > 0 ? 'border-t border-[#E5EAF1] sm:border-t-0' : ''"
        >
          <div class="flex items-start gap-4">
            <div
              v-if="departureDate(trip)"
              class="w-[48px] shrink-0 rounded-[7px] bg-[#F2F6FC] py-1.5 text-center"
            >
              <p class="text-[20px] font-semibold leading-[24px] text-[#172B4D]">
                {{ formatDayPadded(departureDate(trip) as Date) }}
              </p>
              <p class="text-[9px] font-semibold leading-[11px] text-[#68778D]">
                {{ formatMonthShort(departureDate(trip) as Date) }}
              </p>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[14px] font-semibold leading-[17px] text-[#172B4D]">
                {{ toTitleCase(trip.employee_name) || '—' }}
              </p>
              <p class="mt-1 truncate text-[11px] leading-[13px] text-[#172B4D]">
                {{ trip.from_city || '—' }} → {{ trip.to_city || '—' }}
              </p>
              <p class="mt-1 truncate text-[11px] leading-[13px] text-[#68778D]">
                {{ trip.purpose_of_travel || 'Business travel' }}
              </p>
              <p class="mt-1 text-[11px] leading-[13px] text-[#68778D]">
                {{ formatRange(trip.departure_date, trip.return_date) }}
                · {{ tripDays(trip.departure_date, trip.return_date) }} days
              </p>
            </div>
          </div>

          <div class="mt-4">
            <span
              class="inline-flex items-center gap-1.5 rounded-[5px] px-[10px] py-[6px] text-[11px] font-medium leading-[13px]"
              :class="{
                'bg-[#EDF8F3] text-[#227453]': trip.workflow_state === STATES.approved,
                'bg-[#FFF7E8] text-[#936416]':
                  trip.workflow_state !== STATES.approved &&
                  trip.workflow_state !== STATES.draft,
                'bg-[#F0F3F7] text-[#677489]': trip.workflow_state === STATES.draft,
              }"
            >
              {{
                trip.workflow_state === STATES.approved
                  ? 'Approved'
                  : trip.workflow_state === STATES.draft
                    ? 'Draft'
                    : 'Pending approval'
              }}
            </span>
            <button
              type="button"
              class="mt-2 block text-[10px] leading-[12px] text-[#68778D] hover:text-[#2563EB]"
              @click="openDetails(trip)"
            >
              {{ trip.name }}
            </button>
          </div>
        </div>
      </div>

      <EmptyState
        v-else
        title="No upcoming trips"
        description="Trips you create with a future departure date will appear here."
      />
    </section>

    <section
      class="mt-6 rounded-[9px] border border-[#E5EAF1] bg-white shadow-[0_2px_5px_rgba(23,41,71,0.025)]"
    >
      <div class="flex flex-wrap items-center justify-between gap-3 px-[22px] py-5">
        <h2 class="text-[16px] font-semibold leading-[19px] text-[#172B4D]">
          Recent travel requests
        </h2>
        <RouterLink
          to="/requests"
          class="text-[12px] font-medium leading-[15px] text-[#2563EB] hover:underline"
        >
          View all requests →
        </RouterLink>
      </div>

      <div class="h-px bg-[#E5EAF1]" />

      <RequestsTable
        v-if="recentRows.length"
        :rows="recentRows"
        @select="openDetails"
      />
      <EmptyState
        v-else
        title="No travel requests yet"
        description="Create your first travel request to see it here."
      />
    </section>

    <p class="mt-6 text-[10px] leading-[12px] text-[#68778D]">
      <template v-if="recentRows.length">
        Showing the {{ recentRows.length }} most recent request{{ recentRows.length === 1 ? '' : 's' }}.
      </template>
      All dates are shown in your local time. Travel requests follow Sahayog's
      approval policy.
    </p>

    <Dialog v-model:open="detailsOpen" :title="selectedRequest?.name || 'Travel details'" size="sm">
      <TravelDetailsPanel :request="selectedRequest" plain />
    </Dialog>
  </div>
</template>
