<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, DatePicker, toast } from 'frappe-ui'
import {
  formatCurrency,
  formatDuration,
  formatLongRange,
  formatRange,
  parseDate,
  toTitleCase,
} from '../lib/format'
import {
  createTravelRequest,
  errorMessage,
  getEmployee,
  loadTravel,
  refreshTravel,
  MODES_OF_TRAVEL,
  submitTravelRequest,
  travelStore,
  TRAVEL_TYPES,
} from '../lib/travel'

const router = useRouter()

const inputClass =
  'h-10 w-full rounded-[6px] border border-[#E5EAF1] bg-white px-3 text-[12px] leading-[15px] text-[#172B4D] placeholder:text-[#68778D] focus:border-[#2563EB] focus:outline-none'

const form = reactive({
  travel_type: 'Domestic',
  purpose_of_travel: '',
  from_city: '',
  to_city: '',
  departure_date: '',
  return_date: '',
  mode_of_travel: '',
  estimated_travel_cost: '' as string | number,
  advance_required: false,
  advance_amount: '' as string | number,
  advance_justification: '',
  deviation_requested: false,
  deviation_reason: '',
  description: '',
})

const saving = ref(false)
const submitting = ref(false)
const error = ref('')
const managerName = ref('')

const employeeId = computed(() => travelStore.employee?.name || '')
const employeeName = computed(() =>
  toTitleCase(travelStore.employee?.employee_name),
)
const department = computed(() => travelStore.employee?.department || '—')
const managerId = computed(() => travelStore.employee?.reports_to || '')
const managerMissing = computed(
  () => !!employeeId.value && !managerId.value,
)
const employeeMissing = computed(
  () => travelStore.loaded && !employeeId.value,
)

const purposeOptions = computed(() => travelStore.purposeOptions)

const summaryTitle = computed(() => {
  if (!form.from_city && !form.to_city) return 'Your trip'
  return `${form.from_city || '—'} → ${form.to_city || '—'}`
})

const approvalSteps = computed(() => {
  const steps = [
    { title: 'Manager review', detail: managerName.value || 'Reporting manager' },
    { title: 'Finance & accounts', detail: 'F&A approval' },
  ]
  if (form.deviation_requested) {
    steps.push({ title: 'Policy deviation', detail: 'COO / policy approver' })
  }
  return steps
})

onMounted(() => loadTravel())

// The employee record arrives asynchronously, so resolve the manager's display
// name whenever the reporting manager id becomes available.
watch(
  managerId,
  async (id) => {
    if (!id) {
      managerName.value = ''
      return
    }
    const manager = await getEmployee(id)
    managerName.value = toTitleCase(manager?.employee_name) || id
  },
  { immediate: true },
)

function validate(): boolean {
  error.value = ''

  if (!employeeId.value) {
    error.value =
      'No Employee record is linked to your user. Please contact HR before creating a travel request.'
    return false
  }
  if (!managerId.value) {
    error.value =
      'No reporting manager is mapped to your Employee profile. Please ask HR to set "Reports To" before submitting a travel request.'
    return false
  }
  if (!form.purpose_of_travel) {
    error.value = 'Please select the purpose of travel.'
    return false
  }
  if (!form.from_city.trim() || !form.to_city.trim()) {
    error.value = 'Please enter both the from and to cities.'
    return false
  }
  if (!form.departure_date) {
    error.value = 'Please choose a departure date.'
    return false
  }
  if (form.return_date && form.return_date < form.departure_date) {
    error.value = 'Return date cannot be before the departure date.'
    return false
  }
  if (!form.mode_of_travel) {
    error.value = 'Please select the mode of travel.'
    return false
  }
  if (form.advance_required && Number(form.advance_amount) <= 0) {
    error.value = 'Advance amount is required when advance is requested.'
    return false
  }
  if (form.advance_required && !form.advance_justification.trim()) {
    error.value = 'Advance justification is required when advance is requested.'
    return false
  }
  if (form.deviation_requested && !form.deviation_reason.trim()) {
    error.value = 'Deviation reason is required when a policy deviation is requested.'
    return false
  }
  return true
}

function buildPayload(): Record<string, unknown> {
  return {
    travel_type: form.travel_type,
    purpose_of_travel: form.purpose_of_travel,
    employee: employeeId.value,
    from_city: form.from_city.trim(),
    to_city: form.to_city.trim(),
    departure_date: form.departure_date,
    return_date: form.return_date || null,
    mode_of_travel: form.mode_of_travel,
    estimated_travel_cost: Number(form.estimated_travel_cost) || 0,
    advance_required: form.advance_required ? 1 : 0,
    advance_amount: form.advance_required
      ? Number(form.advance_amount) || 0
      : 0,
    advance_justification: form.advance_required
      ? form.advance_justification.trim()
      : '',
    deviation_requested: form.deviation_requested ? 1 : 0,
    deviation_reason: form.deviation_requested
      ? form.deviation_reason.trim()
      : '',
    description: form.description.trim(),
  }
}

async function save(submit: boolean) {
  if (saving.value) return
  if (!validate()) return

  saving.value = true
  submitting.value = submit

  try {
    const created = await createTravelRequest(buildPayload())
    if (submit) {
      await submitTravelRequest(created.name)
    }
    toast.success(
      submit ? 'Travel request submitted' : 'Draft saved',
      {
        description: submit
          ? `${created.name} has been sent to your reporting manager for approval.`
          : `${created.name} is saved as a draft. You can submit it from My travel requests.`,
      },
    )
    await refreshTravel()
    await router.push('/requests')
  } catch (exception) {
    error.value = errorMessage(exception)
    toast.error(submit ? 'Could not submit request' : 'Could not save draft', {
      description: error.value,
    })
  } finally {
    saving.value = false
    submitting.value = false
  }
}

function cancel() {
  router.push('/requests')
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-7 sm:px-6 lg:px-8">
    <p class="text-[10px] font-semibold uppercase leading-[12px] tracking-[0.06em] text-[#68778D]">
      Travel management
    </p>
    <h1 class="mt-2 text-[27px] font-semibold leading-[33px] text-[#172B4D]">
      Create travel request
    </h1>
    <p class="mt-1 text-[13px] leading-4 text-[#68778D]">
      Provide your trip details to get your travel approved.
    </p>

    <div class="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_322px]">
      <div class="space-y-6">
        <section
          class="rounded-[9px] border border-[#E5EAF1] bg-white px-6 pb-6 pt-5"
        >
          <h2 class="text-[16px] font-semibold leading-[19px] text-[#172B4D]">
            Employee details
          </h2>
          <p class="mt-1.5 text-[11px] leading-[13px] text-[#68778D]">
            Your profile information is filled in automatically.
          </p>

          <div
            v-if="employeeMissing"
            class="mt-4 rounded-[6px] border border-[#F6D5D5] bg-[#FDECEC] px-3 py-2 text-[11px] leading-[16px] text-[#B42318]"
          >
            No Employee record is linked to your user. Please contact HR before
            creating a travel request.
          </div>

          <div class="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <p class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                Employee name
              </p>
              <div class="mt-2 flex h-10 items-center rounded-[6px] border border-[#E5EAF1] bg-[#F8FAFC] px-3 text-[12px] text-[#172B4D]">
                {{ employeeName || '—' }}
              </div>
            </div>
            <div>
              <p class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                Employee ID
              </p>
              <div class="mt-2 flex h-10 items-center rounded-[6px] border border-[#E5EAF1] bg-[#F8FAFC] px-3 text-[12px] text-[#172B4D]">
                {{ employeeId || '—' }}
              </div>
            </div>
            <div>
              <p class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                Department
              </p>
              <div class="mt-2 flex h-10 items-center truncate rounded-[6px] border border-[#E5EAF1] bg-[#F8FAFC] px-3 text-[12px] text-[#172B4D]">
                {{ department }}
              </div>
            </div>
          </div>
        </section>

        <section
          class="rounded-[9px] border border-[#E5EAF1] bg-white px-6 pb-6 pt-5"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <h2 class="text-[16px] font-semibold leading-[19px] text-[#172B4D]">
              Travel details
            </h2>
            <p class="text-[10px] leading-[12px] text-[#68778D]">
              * Required fields
            </p>
          </div>

          <div class="mt-5 space-y-5">
            <div>
              <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                Purpose of travel *
              </label>
              <div class="relative mt-2">
                <select v-model="form.purpose_of_travel" :class="inputClass" class="appearance-none pr-8">
                  <option value="" disabled>Select purpose of travel</option>
                  <option
                    v-for="purpose in purposeOptions"
                    :key="purpose"
                    :value="purpose"
                  >
                    {{ purpose }}
                  </option>
                </select>
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#68778D]">
                  ⌄
                </span>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                  From city *
                </label>
                <input
                  v-model="form.from_city"
                  type="text"
                  placeholder="Delhi"
                  :class="inputClass"
                  class="mt-2"
                />
              </div>
              <div>
                <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                  To city *
                </label>
                <input
                  v-model="form.to_city"
                  type="text"
                  placeholder="Mumbai"
                  :class="inputClass"
                  class="mt-2"
                />
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                  Departure date *
                </label>
                <DatePicker
                  v-model="form.departure_date"
                  class="mt-2 w-full"
                  size="lg"
                  variant="outline"
                  placeholder="Choose departure date"
                />
              </div>
              <div>
                <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                  Return date
                </label>
                <DatePicker
                  v-model="form.return_date"
                  class="mt-2 w-full"
                  size="lg"
                  variant="outline"
                  placeholder="Choose return date"
                />
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                  Travel type *
                </label>
                <div class="relative mt-2">
                  <select v-model="form.travel_type" :class="inputClass" class="appearance-none pr-8">
                    <option v-for="type in TRAVEL_TYPES" :key="type" :value="type">
                      {{ type }}
                    </option>
                  </select>
                  <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#68778D]">
                    ⌄
                  </span>
                </div>
              </div>
              <div>
                <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                  Mode of travel *
                </label>
                <div class="relative mt-2">
                  <select v-model="form.mode_of_travel" :class="inputClass" class="appearance-none pr-8">
                    <option value="" disabled>Select mode of travel</option>
                    <option v-for="mode in MODES_OF_TRAVEL" :key="mode" :value="mode">
                      {{ mode }}
                    </option>
                  </select>
                  <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#68778D]">
                    ⌄
                  </span>
                </div>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                  Estimated travel cost
                </label>
                <input
                  v-model="form.estimated_travel_cost"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  :class="inputClass"
                  class="mt-2"
                />
              </div>
              <div>
                <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                  Reporting manager *
                </label>
                <div
                  class="mt-2 flex h-10 items-center rounded-[6px] border border-[#E5EAF1] px-3 text-[12px]"
                  :class="managerMissing ? 'bg-[#FDECEC] text-[#B42318]' : 'bg-[#F8FAFC] text-[#172B4D]'"
                >
                  {{ managerName || 'Not mapped' }}
                </div>
                <p v-if="managerMissing" class="mt-1.5 text-[10px] leading-[14px] text-[#B42318]">
                  Your Employee profile has no "Reports To". Ask HR to set it, then
                  create the request.
                </p>
              </div>
            </div>

            <div class="rounded-[7px] border border-[#E5EAF1] p-4">
              <label class="flex items-center gap-2.5 text-[12px] font-medium text-[#172B4D]">
                <input
                  v-model="form.advance_required"
                  type="checkbox"
                  class="h-4 w-4 rounded border-[#E5EAF1] text-[#2563EB] focus:ring-[#2563EB]"
                />
                Travel advance required
              </label>

              <div v-if="form.advance_required" class="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                    Advance amount *
                  </label>
                  <input
                    v-model="form.advance_amount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    :class="inputClass"
                    class="mt-2"
                  />
                </div>
                <div>
                  <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                    Justification *
                  </label>
                  <input
                    v-model="form.advance_justification"
                    type="text"
                    placeholder="Why is the advance needed?"
                    :class="inputClass"
                    class="mt-2"
                  />
                </div>
              </div>
            </div>

            <div class="rounded-[7px] border border-[#E5EAF1] p-4">
              <label class="flex items-center gap-2.5 text-[12px] font-medium text-[#172B4D]">
                <input
                  v-model="form.deviation_requested"
                  type="checkbox"
                  class="h-4 w-4 rounded border-[#E5EAF1] text-[#2563EB] focus:ring-[#2563EB]"
                />
                This trip needs a policy deviation
              </label>

              <div v-if="form.deviation_requested" class="mt-4">
                <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                  Deviation reason *
                </label>
                <textarea
                  v-model="form.deviation_reason"
                  rows="2"
                  placeholder="Explain why the standard travel policy does not apply"
                  class="mt-2 w-full rounded-[6px] border border-[#E5EAF1] bg-white px-3 py-2 text-[12px] leading-[16px] text-[#172B4D] placeholder:text-[#68778D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="text-[11px] font-medium leading-[13px] text-[#172B4D]">
                Additional travel details
              </label>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="Add any meeting details, preferences or special requirements…"
                class="mt-2 w-full rounded-[6px] border border-[#E5EAF1] bg-white px-3 py-2 text-[12px] leading-[16px] text-[#172B4D] placeholder:text-[#68778D] focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>
        </section>
      </div>

      <div class="space-y-5">
        <section
          class="rounded-[9px] border border-[#E5EAF1] bg-white px-[22px] pb-5 pt-[22px]"
        >
          <h2 class="text-[16px] font-semibold leading-[19px] text-[#172B4D]">
            Request summary
          </h2>
          <p class="mt-4 text-[18px] font-semibold leading-[22px] text-[#172B4D]">
            {{ summaryTitle }}
          </p>
          <p class="mt-1 text-[11px] leading-[13px] text-[#68778D]">
            {{ form.travel_type }} · Business travel
          </p>

          <div class="my-4 h-px bg-[#E5EAF1]" />

          <dl class="space-y-4">
            <div class="flex items-start justify-between gap-3">
              <dt class="text-[11px] leading-[13px] text-[#68778D]">Travel dates</dt>
              <dd class="text-right text-[11px] font-medium leading-[13px] text-[#172B4D]">
                {{ formatRange(form.departure_date, form.return_date) }}
              </dd>
            </div>
            <div class="flex items-start justify-between gap-3">
              <dt class="text-[11px] leading-[13px] text-[#68778D]">Trip duration</dt>
              <dd class="text-right text-[11px] font-medium leading-[13px] text-[#172B4D]">
                {{ form.departure_date ? formatDuration(form.departure_date, form.return_date) : '—' }}
              </dd>
            </div>
            <div class="flex items-start justify-between gap-3">
              <dt class="text-[11px] leading-[13px] text-[#68778D]">Estimated cost</dt>
              <dd class="text-right text-[11px] font-medium leading-[13px] text-[#172B4D]">
                {{ formatCurrency(form.estimated_travel_cost) }}
              </dd>
            </div>
            <div
              v-if="form.advance_required"
              class="flex items-start justify-between gap-3"
            >
              <dt class="text-[11px] leading-[13px] text-[#68778D]">Advance</dt>
              <dd class="text-right text-[11px] font-medium leading-[13px] text-[#172B4D]">
                {{ formatCurrency(form.advance_amount) }}
              </dd>
            </div>
            <div
              v-if="form.deviation_requested"
              class="flex items-start justify-between gap-3"
            >
              <dt class="text-[11px] leading-[13px] text-[#68778D]">Deviation</dt>
              <dd class="text-right text-[11px] font-medium leading-[13px] text-[#936416]">
                Requested
              </dd>
            </div>
          </dl>

          <p class="mt-4 text-[10px] leading-[12px] text-[#68778D]">
            Final costs are confirmed after approval.
          </p>
        </section>

        <section
          class="rounded-[9px] border border-[#E5EAF1] bg-white px-[22px] pb-5 pt-[22px]"
        >
          <h2 class="text-[14px] font-semibold leading-[17px] text-[#172B4D]">
            Approval process
          </h2>

          <ol class="mt-4 space-y-0">
            <li
              v-for="(step, index) in approvalSteps"
              :key="step.title"
              class="relative flex gap-4 pb-5 last:pb-0"
            >
              <span
                v-if="index < approvalSteps.length - 1"
                class="absolute left-[6px] top-4 h-full w-px bg-[#E5EAF1]"
              />
              <span class="relative z-10 mt-0.5 text-[11px] font-semibold leading-[13px] text-[#2563EB]">
                {{ index + 1 }}
              </span>
              <span class="min-w-0">
                <span class="block text-[12px] font-medium leading-[15px] text-[#172B4D]">
                  {{ step.title }}
                </span>
                <span class="mt-1 block truncate text-[11px] leading-[13px] text-[#68778D]">
                  {{ step.detail }}
                </span>
              </span>
            </li>
          </ol>
        </section>

        <section class="rounded-lg bg-[#F0F5FC] px-[22px] py-5">
          <h2 class="text-[13px] font-semibold leading-4 text-[#172B4D]">
            Before you submit
          </h2>
          <ul class="mt-3 space-y-1.5 text-[10px] leading-[14px] text-[#68778D]">
            <li>• Check your travel dates and destination.</li>
            <li>• Ensure the trip follows the travel policy.</li>
            <li>• Submit at least 7 days before departure.</li>
          </ul>
          <p class="mt-3 text-[10px] leading-[14px] text-[#68778D]">
            Deviation requests go to the policy approver before finance clears the
            trip.
          </p>
        </section>
      </div>
    </div>

    <div
      v-if="error"
      class="mt-5 rounded-[6px] border border-[#F6D5D5] bg-[#FDECEC] px-4 py-3 text-[11px] leading-[16px] text-[#B42318]"
    >
      {{ error }}
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-end gap-3">
      <button
        type="button"
        class="mr-auto text-[12px] font-medium leading-[15px] text-[#68778D] hover:text-[#172B4D]"
        @click="cancel"
      >
        Cancel
      </button>
      <Button
        variant="outline"
        size="lg"
        label="Save as draft"
        :loading="saving && !submitting"
        :disabled="saving"
        @click="save(false)"
      />
      <Button
        theme="blue"
        variant="solid"
        size="lg"
        label="Submit request"
        icon-right="lucide-arrow-right"
        :loading="saving && submitting"
        :disabled="saving"
        @click="save(true)"
      />
    </div>

    <p class="mt-3 text-right text-[10px] leading-[12px] text-[#68778D]">
      Your request will be sent to your reporting manager for approval.
    </p>

    <p v-if="form.departure_date && parseDate(form.departure_date)" class="mt-1 text-right text-[10px] leading-[12px] text-[#8A97A8]">
      Trip window: {{ formatLongRange(form.departure_date, form.return_date) }}
    </p>
  </div>
</template>
