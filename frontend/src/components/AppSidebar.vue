<script setup lang="ts">
import { useRoute } from 'vue-router'

defineProps<{ open?: boolean }>()
defineEmits<{ close: [] }>()

const route = useRoute()

interface NavItem {
  label: string
  to: string
  icon: 'grid' | 'calendar' | 'requests' | 'plus'
  exact: boolean
}

const items: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: 'grid', exact: true },
  { label: 'Travel calendar', to: '/calendar', icon: 'calendar', exact: true },
  { label: 'My travel requests', to: '/requests', icon: 'requests', exact: true },
  { label: 'Create request', to: '/requests/new', icon: 'plus', exact: false },
]

function isActive(item: NavItem): boolean {
  if (item.exact) return route.path === item.to
  return route.path.startsWith(item.to)
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-30 bg-black/20 lg:hidden"
    @click="$emit('close')"
  />

  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-[232px] shrink-0 flex-col border-r border-[#E5EAF1] bg-white transition-transform duration-200 lg:static lg:h-screen lg:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="px-6 pb-4 pt-[26px]">
      <p class="text-[18px] font-bold leading-[22px] tracking-[0.01em] text-[#172B4D]">
        SAHAYOG
      </p>
      <p class="mt-[6px] text-[10px] font-medium uppercase leading-[12px] tracking-[0.08em] text-[#68778D]">
        Travel desk
      </p>
    </div>

    <nav class="px-3">
      <p class="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase leading-[12px] tracking-[0.08em] text-[#68778D]">
        Workspace
      </p>
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="mb-[6px] flex h-[42px] items-center gap-3 rounded-[7px] px-3 text-[13px] leading-4 transition-colors"
        :class="
          isActive(item)
            ? 'bg-[#EFF5FF] font-semibold text-[#2563EB]'
            : 'font-medium text-[#68778D] hover:bg-[#F8FAFC]'
        "
        @click="$emit('close')"
      >
        <svg
          v-if="item.icon === 'grid'"
          viewBox="0 0 18 18"
          class="h-[18px] w-[18px] shrink-0"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <rect x="2.2" y="2.2" width="5.6" height="5.6" rx="0.6" />
          <rect x="10.2" y="2.2" width="5.6" height="5.6" rx="0.6" />
          <rect x="2.2" y="10.2" width="5.6" height="5.6" rx="0.6" />
          <rect x="10.2" y="10.2" width="5.6" height="5.6" rx="0.6" />
        </svg>
        <svg
          v-else-if="item.icon === 'calendar'"
          viewBox="0 0 18 18"
          class="h-[18px] w-[18px] shrink-0"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
        >
          <rect x="2.2" y="3.8" width="13.6" height="12" rx="1.4" />
          <path d="M2.2 7.8h13.6M6 2.2v3.2M12 2.2v3.2" />
        </svg>
        <svg
          v-else-if="item.icon === 'requests'"
          viewBox="0 0 18 18"
          class="h-[18px] w-[18px] shrink-0"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4.5 2.2h9a1 1 0 0 1 1 1v11.6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V3.2a1 1 0 0 1 1-1Z" />
          <path d="M6.4 6h5.2M6.4 9h5.2M6.4 12h3.2" />
        </svg>
        <svg
          v-else
          viewBox="0 0 18 18"
          class="h-[18px] w-[18px] shrink-0"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
        >
          <path d="M9 3.8v10.4M3.8 9h10.4" />
        </svg>

        <span class="truncate">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="mt-auto px-4 pb-4 pt-6">
      <div class="rounded-lg bg-[#F8FAFC] px-3.5 py-4">
        <p class="text-[12px] font-semibold leading-[15px] text-[#172B4D]">
          Travel with confidence
        </p>
        <p class="mt-1.5 text-[11px] leading-[13px] text-[#68778D]">
          Review the company's travel policy before submitting a request.
        </p>
        <a
          href="/app/travel-request"
          class="mt-4 inline-flex items-center gap-1 text-[11px] font-medium leading-[13px] text-[#2563EB] hover:underline"
        >
          View travel requests <span aria-hidden="true">↗</span>
        </a>
      </div>

      <a
        href="/app"
        class="mt-4 flex items-center gap-3 px-2 py-1 text-[12px] leading-[15px] text-[#68778D] hover:text-[#172B4D]"
      >
        <svg
          viewBox="0 0 18 18"
          class="h-[18px] w-[18px] shrink-0"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
        >
          <circle cx="9" cy="9" r="7.2" />
          <path d="M7.2 7.1a1.9 1.9 0 1 1 2.4 1.9c-.4.2-.6.5-.6.9v.4" />
          <circle cx="9" cy="12.7" r="0.4" fill="currentColor" stroke="none" />
        </svg>
        Help &amp; support
      </a>

      <p class="mt-3 pl-2 text-[10px] leading-[12px] text-[#8A97A8]">
        © 2026 Sahayog
      </p>
    </div>
  </aside>
</template>
