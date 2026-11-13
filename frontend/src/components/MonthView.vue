<script setup lang="ts">
import { computed } from 'vue'
import {
  layoutWeekEvents,
  monthWeeks,
  isSameDay,
  isSameMonth,
  toISODate,
  toTitleCase,
  weekDays,
} from '../lib/format'
import {
  stateLabel,
  stateTone,
  type CalendarEvent,
  type StatusTone,
} from '../lib/travel'

const props = withDefaults(
  defineProps<{
    cursor: Date
    events: CalendarEvent[]
    selected?: string
    /** 'month' renders the full month grid, 'week' a single tall week. */
    mode?: 'month' | 'week'
  }>(),
  { selected: '', mode: 'month' },
)

const emit = defineEmits<{ select: [event: CalendarEvent] }>()

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const BAR_TOP = 32
const BAR_HEIGHT = 42
const LANE_STEP = 46

const TODAY = new Date()

const barTone: Record<StatusTone, string> = {
  green: 'bg-[#EDF8F3] text-[#227453] border-[#227453]',
  amber: 'bg-[#FFF7E8] text-[#936416] border-[#B17A1E]',
  gray: 'bg-[#F0F3F7] text-[#677489] border-[#8090A6]',
  blue: 'bg-[#EDF3FF] text-[#2563EB] border-[#2563EB]',
  red: 'bg-[#FDECEC] text-[#B42318] border-[#B42318]',
}

const weeks = computed(() => {
  const rows =
    props.mode === 'week' ? [weekDays(props.cursor)] : monthWeeks(props.cursor)
  const minHeight = props.mode === 'week' ? 360 : 110
  return rows.map((days) => {
    const layout = layoutWeekEvents(days, props.events)
    return {
      key: toISODate(days[0]),
      days,
      ...layout,
      height: Math.max(
        minHeight,
        BAR_TOP + layout.laneCount * LANE_STEP + 8,
      ),
    }
  })
})

function barClasses(event: CalendarEvent): string {
  if (props.selected === event.id) {
    return 'bg-[#EDF3FF] text-[#2563EB] border-[#2563EB] ring-1 ring-[#2563EB]'
  }
  return barTone[stateTone(event.workflow_state)]
}
</script>

<template>
  <div
    class="overflow-x-auto rounded-lg border border-[#E5EAF1] bg-white"
  >
    <div class="min-w-[640px]">
      <div class="grid grid-cols-7 border-b border-[#E5EAF1]">
      <div
        v-for="day in WEEKDAYS"
        :key="day"
        class="px-3 py-[15px] text-[10px] font-semibold leading-[12px] tracking-[0.04em] text-[#68778D] sm:px-4"
      >
        {{ day }}
      </div>
    </div>

    <div
      v-for="week in weeks"
      :key="week.key"
      class="relative border-b border-[#E5EAF1] last:border-b-0"
      :style="{ minHeight: week.height + 'px' }"
    >
      <div class="absolute inset-0 grid grid-cols-7">
        <div
          v-for="day in week.days"
          :key="toISODate(day)"
          class="relative border-r border-[#E5EAF1] last:border-r-0"
          :class="
            !isSameMonth(day, cursor) || day.getDay() === 0 || day.getDay() === 6
              ? 'bg-[#FBFCFE]'
              : 'bg-white'
          "
        >
          <span
            v-if="isSameDay(day, TODAY)"
            class="absolute left-2.5 top-2 flex h-[25px] w-[25px] items-center justify-center rounded-[5px] bg-[#2563EB] text-[11px] font-semibold text-white sm:left-4"
          >
            {{ day.getDate() }}
          </span>
          <span
            v-else
            class="absolute left-2.5 top-[15px] text-[11px] font-medium leading-[13px] sm:left-4"
            :class="isSameMonth(day, cursor) ? 'text-[#68778D]' : 'text-[#B1BAC8]'"
          >
            {{ day.getDate() }}
          </span>
        </div>
      </div>

      <div class="pointer-events-none absolute inset-0">
        <button
          v-for="item in week.items"
          :key="item.event.id"
          type="button"
          class="pointer-events-auto absolute flex flex-col justify-center overflow-hidden rounded-[5px] border-l-[3px] px-2 text-left transition-shadow hover:shadow-sm"
          :class="barClasses(item.event)"
          :style="{
            left: `calc(${(item.startIndex / 7) * 100}% + 4px)`,
            width: `calc(${((item.endIndex - item.startIndex + 1) / 7) * 100}% - 8px)`,
            top: BAR_TOP + item.lane * LANE_STEP + 'px',
            height: BAR_HEIGHT + 'px',
          }"
          :title="`${item.event.from_city} → ${item.event.to_city} · ${item.event.employee_name}`"
          @click.stop="emit('select', item.event)"
        >
          <span class="truncate text-[11px] font-semibold leading-[13px]">
            {{ item.event.from_city }} → {{ item.event.to_city }}
          </span>
          <span class="truncate text-[10px] leading-[12px]">
            {{ toTitleCase(item.event.employee_name) }} · {{ stateLabel(item.event.workflow_state) }}
          </span>
        </button>
      </div>
      </div>
    </div>
  </div>
</template>
