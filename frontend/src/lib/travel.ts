/**
 * Travel Request data layer.
 *
 * The only data source is the existing HRMS `Travel Request` doctype. Reads go
 * through `frappe.client.get_list` (which applies Frappe's role + owner
 * permissions) and creation goes through `frappe.client.insert` plus
 * `frappe.model.workflow.apply_workflow`, so every existing validation and
 * workflow rule still runs on the server.
 *
 * `limit_page_length: 0` returns the complete, permission-filtered dataset in
 * one request. All counts, tabs and the calendar are derived from that full set
 * instead of the current page.
 */

import { reactive } from 'vue'
import { call } from 'frappe-ui'
import { addDays, parseDate, toISODate } from './format'

export const DOCTYPE = 'Travel Request'

export const SUBMIT_ACTION = 'Submit for Approval'

export const STATES = {
  draft: 'Draft',
  manager: 'Pending Reporting Manager',
  fna: 'Pending F&A Approval',
  coo: 'Pending COO Approval',
  approved: 'Approved',
  rejected: 'Rejected',
} as const

export const PENDING_STATES: string[] = [
  STATES.manager,
  STATES.fna,
  STATES.coo,
]

export const ALL_STATES: string[] = [
  STATES.draft,
  STATES.manager,
  STATES.fna,
  STATES.coo,
  STATES.approved,
  STATES.rejected,
]

/** Short badge label. The full state is kept in the tooltip and details panel. */
export const STATE_SHORT_LABEL: Record<string, string> = {
  [STATES.draft]: 'Draft',
  [STATES.manager]: 'Pending manager',
  [STATES.fna]: 'Pending F&A',
  [STATES.coo]: 'Pending COO',
  [STATES.approved]: 'Approved',
  [STATES.rejected]: 'Rejected',
}

export type StatusTone = 'green' | 'amber' | 'gray' | 'blue' | 'red'

export const STATE_TONE: Record<string, StatusTone> = {
  [STATES.draft]: 'gray',
  [STATES.manager]: 'amber',
  [STATES.fna]: 'amber',
  [STATES.coo]: 'amber',
  [STATES.approved]: 'green',
  [STATES.rejected]: 'red',
}

export const MODES_OF_TRAVEL = ['Train', 'Bus', 'Own Car', 'Cab', 'Air', 'Bike']

export const TRAVEL_TYPES = ['Domestic', 'International']

export const LIST_FIELDS = [
  'name',
  'employee',
  'employee_name',
  'company',
  'travel_type',
  'purpose_of_travel',
  'from_city',
  'to_city',
  'departure_date',
  'return_date',
  'mode_of_travel',
  'estimated_travel_cost',
  'reporting_manager',
  'advance_required',
  'advance_amount',
  'advance_justification',
  'deviation_requested',
  'deviation_reason',
  'approver_remarks',
  'description',
  'workflow_state',
  'docstatus',
  'creation',
  'owner',
]

export interface TravelRequestRow {
  name: string
  employee?: string
  employee_name?: string
  company?: string
  travel_type?: string
  purpose_of_travel?: string
  from_city?: string
  to_city?: string
  departure_date?: string
  return_date?: string
  mode_of_travel?: string
  estimated_travel_cost?: number
  reporting_manager?: string
  advance_required?: number
  advance_amount?: number
  advance_justification?: string
  deviation_requested?: number
  deviation_reason?: string
  approver_remarks?: string
  description?: string
  workflow_state?: string
  docstatus?: number
  creation?: string
  owner?: string
}

export interface EmployeeInfo {
  name: string
  employee_name?: string
  designation?: string
  department?: string
  company?: string
  reports_to?: string
  user_id?: string
  image?: string
}

export interface CalendarEvent {
  id: string
  name: string
  employee_name: string
  from_city: string
  to_city: string
  start: string
  end: string
  workflow_state: string
  purpose: string
  row: TravelRequestRow
}

export interface RequestTab {
  key: string
  label: string
  states: string[] | null
}

export const REQUEST_TABS: RequestTab[] = [
  { key: 'all', label: 'All requests', states: null },
  { key: 'pending', label: 'Pending approval', states: PENDING_STATES },
  { key: 'approved', label: 'Approved', states: [STATES.approved] },
  { key: 'draft', label: 'Drafts', states: [STATES.draft] },
  { key: 'rejected', label: 'Rejected', states: [STATES.rejected] },
]

interface TravelStore {
  loaded: boolean
  loading: boolean
  error: string
  requests: TravelRequestRow[]
  employee: EmployeeInfo | null
  employees: EmployeeInfo[]
  /** Reporting manager id → employee name, for the details panel. */
  managerNames: Record<string, string>
  purposeOptions: string[]
  user: string
}

export const travelStore = reactive<TravelStore>({
  loaded: false,
  loading: false,
  error: '',
  requests: [],
  employee: null,
  employees: [],
  managerNames: {},
  purposeOptions: [],
  user: '',
})

export function isPending(state?: string | null): boolean {
  return !!state && PENDING_STATES.includes(state)
}

export function stateLabel(state?: string | null): string {
  if (!state) return 'Draft'
  return STATE_SHORT_LABEL[state] || state
}

export function stateTone(state?: string | null): StatusTone {
  if (!state) return 'gray'
  return STATE_TONE[state] || 'gray'
}

export function matchesTab(row: TravelRequestRow, tab: RequestTab): boolean {
  if (!tab.states) return true
  return tab.states.includes(row.workflow_state || STATES.draft)
}

export function countForTab(rows: TravelRequestRow[], tab: RequestTab): number {
  return rows.filter((row) => matchesTab(row, tab)).length
}

/**
 * Shared in-flight request. `App.vue` and every page call `loadTravel()` on
 * mount, so concurrent callers must await the same load instead of returning
 * early and reading a store that is still empty.
 */
let inFlight: Promise<void> | null = null

export function loadTravel(force = false): Promise<void> {
  if (inFlight) return inFlight
  if (travelStore.loaded && !force) return Promise.resolve()

  inFlight = fetchTravel().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function fetchTravel(): Promise<void> {
  travelStore.loading = true
  travelStore.error = ''

  try {
    const user: string =
      (typeof window !== 'undefined' && window.user) ||
      (await call<string>('frappe.auth.get_logged_user'))
    travelStore.user = user

    const [requests, employeeRows, purposes] = await Promise.all([
      call<TravelRequestRow[]>('frappe.client.get_list', {
        doctype: DOCTYPE,
        fields: LIST_FIELDS,
        order_by: 'creation desc',
        limit_page_length: 0,
      }),
      call<EmployeeInfo[]>('frappe.client.get_list', {
        doctype: 'Employee',
        filters: { user_id: user },
        fields: [
          'name',
          'employee_name',
          'designation',
          'department',
          'company',
          'reports_to',
          'user_id',
          'image',
        ],
        limit_page_length: 1,
      }).catch(() => []),
      call<Array<{ name: string }>>('frappe.client.get_list', {
        doctype: 'Purpose of Travel',
        fields: ['name'],
        order_by: 'name asc',
        limit_page_length: 0,
      }).catch(() => []),
    ])

    travelStore.requests = requests || []
    travelStore.employee = employeeRows?.[0] || null
    travelStore.purposeOptions = (purposes || []).map((purpose) =>
      String(purpose.name),
    )
    travelStore.employees = uniqueEmployees(travelStore.requests)
    travelStore.managerNames = await loadManagerNames(travelStore.requests)
    travelStore.loaded = true
  } catch (error) {
    travelStore.error = errorMessage(error)
  } finally {
    travelStore.loading = false
  }
}

/** One lookup for every reporting manager referenced by the visible rows. */
async function loadManagerNames(
  rows: TravelRequestRow[],
): Promise<Record<string, string>> {
  const ids = Array.from(
    new Set(rows.map((row) => row.reporting_manager).filter(Boolean)),
  ) as string[]
  if (!ids.length) return {}

  const managers = await call<Array<{ name: string; employee_name?: string }>>(
    'frappe.client.get_list',
    {
      doctype: 'Employee',
      filters: { name: ['in', ids] },
      fields: ['name', 'employee_name'],
      limit_page_length: 0,
    },
  ).catch(() => [])

  return (managers || []).reduce<Record<string, string>>((names, manager) => {
    if (manager.employee_name) names[manager.name] = manager.employee_name
    return names
  }, {})
}

export function refreshTravel(): Promise<void> {
  return loadTravel(true)
}

export function uniqueEmployees(
  rows: TravelRequestRow[],
): EmployeeInfo[] {
  const seen = new Map<string, EmployeeInfo>()
  for (const row of rows) {
    if (!row.employee || seen.has(row.employee)) continue
    seen.set(row.employee, {
      name: row.employee,
      employee_name: row.employee_name,
    })
  }
  return Array.from(seen.values()).sort((a, b) =>
    (a.employee_name || '').localeCompare(b.employee_name || ''),
  )
}

export function toCalendarEvents(
  rows: TravelRequestRow[],
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const row of rows) {
    if (!row.departure_date) continue
    const end =
      row.return_date && row.return_date >= row.departure_date
        ? row.return_date
        : row.departure_date
    events.push({
      id: row.name,
      name: row.name,
      employee_name: row.employee_name || '',
      from_city: row.from_city || '',
      to_city: row.to_city || '',
      start: row.departure_date,
      end,
      workflow_state: row.workflow_state || STATES.draft,
      purpose: row.purpose_of_travel || '',
      row,
    })
  }
  return events
}

export function upcomingRows(
  rows: TravelRequestRow[],
  todayISO: string,
  days = 30,
): TravelRequestRow[] {
  const start = parseDate(todayISO)
  if (!start) return []
  const limitISO = toISODate(addDays(start, days))
  return rows
    .filter(
      (row) =>
        !!row.departure_date &&
        row.departure_date >= todayISO &&
        row.workflow_state !== STATES.rejected,
    )
    .filter((row) => (row.departure_date || '') <= limitISO)
    .sort((a, b) => (a.departure_date || '').localeCompare(b.departure_date || ''))
}

export async function searchEmployees(
  query: string,
): Promise<EmployeeInfo[]> {
  const filters: Record<string, unknown> = { status: 'Active' }
  const text = query.trim()
  if (text) {
    filters.employee_name = ['like', `%${text}%`]
  }
  return call<EmployeeInfo[]>('frappe.client.get_list', {
    doctype: 'Employee',
    filters,
    fields: ['name', 'employee_name', 'designation', 'department'],
    order_by: 'employee_name asc',
    limit_page_length: 20,
  }).catch(() => [])
}

export async function getEmployee(
  name: string,
): Promise<EmployeeInfo | null> {
  if (!name) return null
  // `frappe.client.get` only accepts GET, but frappe-ui's `call` posts. A
  // one-row `get_list` keeps the request a POST and still honours permissions.
  const rows = await call<EmployeeInfo[]>('frappe.client.get_list', {
    doctype: 'Employee',
    filters: { name },
    fields: [
      'name',
      'employee_name',
      'designation',
      'department',
      'company',
      'reports_to',
      'user_id',
      'image',
    ],
    limit_page_length: 1,
  }).catch(() => [])
  return rows?.[0] || null
}

export async function createTravelRequest(
  values: Record<string, unknown>,
): Promise<TravelRequestRow> {
  return call<TravelRequestRow>('frappe.client.insert', {
    doc: { doctype: DOCTYPE, ...values },
  })
}

export async function submitTravelRequest(
  name: string,
): Promise<unknown> {
  return call('frappe.model.workflow.apply_workflow', {
    doc: JSON.stringify({ doctype: DOCTYPE, name }),
    action: SUBMIT_ACTION,
  })
}

export function errorMessage(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  const anyError = error as {
    message?: string
    error?: { message?: string }
    response?: { _server_messages?: string }
    _server_messages?: string
  }
  const messages = anyError.response?._server_messages || anyError._server_messages
  if (messages) {
    try {
      const parsed = JSON.parse(messages)
      if (Array.isArray(parsed) && parsed.length) {
        const first = JSON.parse(parsed[0])
        if (first?.message) return stripHtml(first.message)
      }
    } catch {
      return String(messages)
    }
  }
  return anyError.error?.message || anyError.message || 'Something went wrong'
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim()
}
