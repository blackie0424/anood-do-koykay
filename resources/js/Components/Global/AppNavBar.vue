<template>
  <header class="sticky top-4 z-30">
    <div
      class="container mx-auto max-w-7xl bg-white/90 backdrop-blur-md shadow-sm border border-gray-100 rounded-2xl"
    >
      <div class="px-4 flex flex-col lg:flex-row lg:items-center justify-between">
        <!-- Mobile Row 1: Nav & User -->
        <div class="flex items-center justify-between w-full lg:hidden h-14">
          <!-- Mobile Breadcrumb -->
          <div
            data-testid="mobile-breadcrumb"
            class="flex items-center gap-1 shrink-0 overflow-hidden"
          >
            <!-- Home Link (Hide when breadcrumbPage exists) -->
            <Link
              v-if="!breadcrumbPage"
              href="/"
              class="font-medium text-gray-500 hover:text-gray-900 transition flex items-center gap-1 shrink-0"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                ></path>
              </svg>
              <span class="text-sm">首頁</span>
            </Link>

            <!-- Separator 1 -->
            <svg
              v-if="!breadcrumbPage"
              class="w-4 h-4 text-gray-300 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>

            <!-- Intermediate Link -->
            <template v-if="mobileBackUrl !== '/'">
              <Link
                :href="mobileBackUrl"
                class="font-bold text-gray-500 hover:text-blue-600 transition shrink-0 whitespace-nowrap text-sm sm:text-base"
              >
                {{ mobileBackText }}
              </Link>
              <!-- Separator 2 -->
              <svg
                class="w-4 h-4 text-gray-300 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                ></path>
              </svg>
            </template>

            <!-- Current Page Title -->
            <span class="font-bold text-gray-900 text-lg tracking-wide truncate">
              {{ pageTitle }}
            </span>
          </div>

          <!-- Right: User Menu -->
          <div class="relative shrink-0">
            <!-- Logged In: Avatar Button -->
            <button
              v-if="user"
              @click="showMobileUserMenu = !showMobileUserMenu"
              class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                ></path>
              </svg>
            </button>
            <!-- Guest: Login Link -->
            <Link
              v-else
              :href="loginUrl"
              class="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600"
            >
              登入
            </Link>

            <!-- Mobile User Dropdown -->
            <UserMenuDropdown
              v-if="showMobileUserMenu && user"
              :user="user"
              :showUserInfo="true"
              @close="showMobileUserMenu = false"
            />
          </div>
        </div>

        <!-- Mobile Row 2: Actions Slot -->
        <div class="lg:hidden w-full border-t border-gray-100 py-2">
          <slot name="mobile-actions" />
        </div>

        <!-- Desktop Nav (>= 1024px) -->
        <div class="hidden lg:flex items-center gap-4 w-full h-14">
          <!-- Desktop Navigation Links -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Home Link -->
            <Link
              href="/"
              class="font-medium text-gray-500 hover:text-gray-900 transition flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                ></path>
              </svg>
              首頁
            </Link>

            <!-- Separator -->
            <svg
              class="w-4 h-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>

            <!-- App / Fish List Link -->
            <Link
              href="/fishs"
              class="font-bold text-gray-900 text-lg tracking-wide hover:text-blue-600 transition"
            >
              among no tao
            </Link>
          </div>

          <!-- Desktop Nav Content (Breadcrumbs by default) -->
          <div class="flex-1 flex items-center min-w-0">
            <slot name="desktop-nav">
              <div class="flex items-center text-sm text-gray-500 gap-2">
                <svg
                  class="w-4 h-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
                <Link
                  v-if="breadcrumbPage"
                  :href="`/fish/${fish?.id}`"
                  class="hover:text-blue-600 transition"
                  >{{ fish?.name }}</Link
                >
                <span v-if="breadcrumbPage" class="text-gray-300">/</span>
                <span class="font-medium text-gray-900">{{ breadcrumbPage || fish?.name }}</span>
              </div>
            </slot>
          </div>

          <!-- User Menu (Right aligned) -->
          <div class="ml-auto flex items-center gap-3 shrink-0">
            <!-- Admin: Dropdown Button -->
            <div v-if="user?.role === 'admin'" class="relative">
              <button
                @click="showDesktopAdminMenu = !showDesktopAdminMenu"
                class="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition"
              >
                {{ user.name }}
                <svg
                  class="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <UserMenuDropdown
                v-if="showDesktopAdminMenu"
                :user="user"
                @close="showDesktopAdminMenu = false"
              />
            </div>
            <!-- Non-Admin: Name with Badge -->
            <div v-else-if="user" class="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span class="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs">田調人員</span>
              {{ user.name }}
            </div>
            <!-- Non-Admin Logout -->
            <Link
              v-if="user && user.role !== 'admin'"
              href="/logout"
              method="post"
              as="button"
              class="text-sm text-gray-500 hover:text-red-600"
            >
              登出
            </Link>
            <Link
              v-if="!user"
              :href="loginUrl"
              class="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              登入
            </Link>
          </div>
        </div>
      </div>
      <!-- Header Extension Slot -->
      <slot name="header-extension" />
    </div>
  </header>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Link, usePage } from '@inertiajs/vue3'
import UserMenuDropdown from '@/Components/Global/UserMenuDropdown.vue'

defineProps({
  pageTitle: {
    type: String,
    default: '基本資料',
  },
  breadcrumbPage: {
    type: String,
    default: '',
  },
  mobileBackUrl: {
    type: String,
    default: '/fishs',
  },
  mobileBackText: {
    type: String,
    default: 'among no tao',
  },
})

const page = usePage()
const fish = computed(() => page.props.fish)
const user = computed(() => page.props.auth?.user)

const loginUrl = computed(() => {
  if (typeof window === 'undefined') return '/login'
  const currentUrl = window.location.pathname + window.location.search
  return `/login?redirect=${encodeURIComponent(currentUrl)}`
})

const showMobileUserMenu = ref(false)
const showDesktopAdminMenu = ref(false)
</script>
