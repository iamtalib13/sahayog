<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  formatCurrency,
  formatDuration,
  formatLongRange,
  toTitleCase,
} from '../lib/format'
import {
  applyTravelWorkflow,
  refreshTravel,
  STATES,
  travelStore,
  type TravelRequestRow,
} from '../lib/travel'
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

const emit = defineEmits<{ close: [] }>()

const remarks = ref('')
const acting = ref(false)
const actionError = ref('')

const currentUser = computed(() => travelStore.user)
const currentEmployee = computed(() => travelStore.employee?.name || '')
const roles = computed(() => travelStore.roles)

const availableActions = computed(() => {
  const request = props.request
  if (!request) return []
  const state = request.workflow_state || STATES.draft
  const deviation = !!request.deviation_requested
  const actions: { label: string; action: string; tone: string }[] = []

  if (state === STATES.manager) {
    if (roles.value.includes('HR Manager')) {
      actions.push({
        label: 'HR approve',
        action: deviation ? 'HR Approve with Deviation' : 'HR Approve',
        tone: 'green',
      })
      actions.push({ label: 'HR reject', action: 'HR Reject', tone: 'red' })
    } else if (roles.value.includes('Employee') && currentEmployee.value && currentEmployee.value === request.reporting_manager) {
      if (deviation) {
        actions.push({
          label: 'Approve with deviation',
          action: 'Approve with Deviation',
          tone: 'amber',
        })
      } else {
        actions.push({ label: 'Approve', action: 'Approve', tone: 'green' })
      }
      actions.push({ label: 'Reject', action: 'Reject', tone: 'red' })
    }
  } else if (state === STATES.fna && roles.value.includes('Accounts Manager')) {
    actions.push({ label: 'Approve', action: 'Approve', tone: 'green' })
    actions.push({ label: 'Reject', action: 'Reject', tone: 'red' })
  } else if (state === STATES.coo && roles.value.includes('Travel Policy Approver')) {
    actions.push({
      label: 'Approve deviation',
      action: 'Approve Deviation',
      tone: 'green',
    })
    actions.push({ label: 'Reject deviation', action: 'Reject Deviation', tone: 'red' })
  } else if (state === STATES.rejected && request.owner === currentUser.value) {
    actions.push({ label: 'Resubmit', action: 'Resubmit', tone: 'blue' })
  }

  return actions
})

async function runAction(action: string) {
  if (!props.request || acting.value) return
  acting.value = true
  actionError.value = ''
  try {
    await applyTravelWorkflow(props.request.name, action, remarks.value)
    remarks.value = ''
    await refreshTravel()
    emit('close')
  } catch (exception) {
    actionError.value =
      (exception as { message?: string })?.message || 'Action failed'
  } finally {
    acting.value = false
  }
}

function actionTone(tone: string): string {
  const base = ''
  if (tone === 'green')
    return 'border-[#227453] bg-[#EDF8F3] text-[#227453] hover:bg-[#DCEFE6]'
  if (tone === 'amber')
    return 'border-[#B17A1E] bg-[#FFF7E8] text-[#936416] hover:bg-[#FDEFD6]'
  if (tone === 'red')
    return 'border-[#B42318] bg-[#FDECEC] text-[#B42318] hover:bg-[#FAD9D9]'
  return 'border-[#2563EB] bg-[#EFF5FF] text-[#2563EB] hover:bg-[#DCE8FF]'
}
watch(
  () => props.request?.name,
  () => {
    remarks.value = ''
    actionError.value = ''
  },
)

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

      <div v-if="availableActions.length" class="mt-6">
        <p class="text-[9px] font-semibold uppercase leading-[11px] tracking-[0.08em] text-[#68778D]">
          Approval action
        </p>
        <textarea
          v-model="remarks"
          rows="2"
          placeholder="Approver remarks (optional)"
          class="mt-2 w-full rounded-[6px] border border-[#E5EAF1] bg-white px-3 py-2 text-[12px] leading-[16px] text-[#172B4D] placeholder:text-[#68778D] focus:border-[#2563EB] focus:outline-none"
        />
        <p v-if="actionError" class="mt-2 text-[11px] leading-[14px] text-[#B42318]">
          {{ actionError }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="action in availableActions"
            :key="action.action"
            type="button"
            :disabled="acting"
            class="inline-flex h-[34px] items-center justify-center rounded-[6px] border px-3 text-[11px] font-medium leading-[13px] disabled:opacity-50"
            :class="actionTone(action.tone)"
            @click="runAction(action.action)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="px-[22px] pb-[22px]">
      <RouterLink
        v-if="request.workflow_state === 'Draft'"
        :to="`/requests/${request.name}/edit`"
        class="mb-2 flex h-[38px] items-center justify-center gap-2 rounded-[6px] border border-[#E5EAF1] bg-white text-[12px] font-medium leading-[15px] text-[#172B4D] hover:bg-[#F8FAFC]"
      >
        Edit draft <span aria-hidden="true">→</span>
      </RouterLink>
      <a
        :href="deskUrl"
        class="flex h-[38px] items-center justify-center gap-2 rounded-[6px] bg-[#2563EB] text-[12px] font-medium leading-[15px] text-white hover:bg-[#1d4fd8]"
      >
        View travel request <span aria-hidden="true">→</span>
      </a>
    </div>
  </div>
</template>
