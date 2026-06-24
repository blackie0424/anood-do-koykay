<template>
  <div>
    <!-- Dropdown Panel -->
    <div
      class="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-fade-in-down"
    >
      <!-- User Info Header (optional) -->
      <div
        v-if="showUserInfo"
        data-testid="user-info-header"
        class="px-4 py-3 border-b border-gray-50 bg-gray-50/50"
      >
        <div class="text-sm font-bold text-gray-900 truncate">{{ user.name }}</div>
        <div v-if="user?.role !== 'admin'" class="text-xs text-blue-600 font-medium mt-0.5">
          田調人員
        </div>
      </div>

      <!-- Admin Links -->
      <Link
        v-if="user?.role === 'admin'"
        href="/dashboard"
        data-testid="link-dashboard"
        class="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition"
        @click="$emit('close')"
      >
        統計面板
      </Link>
      <Link
        v-if="user?.role === 'admin'"
        href="/line-users"
        data-testid="link-line-users"
        class="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600 transition"
        @click="$emit('close')"
      >
        使用者管理
      </Link>
      <Link
        v-if="user?.role === 'admin'"
        href="/admin/references"
        data-testid="link-references"
        class="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition"
        @click="$emit('close')"
      >
        文獻管理
      </Link>

      <!-- Logout -->
      <Link
        href="/logout"
        method="post"
        as="button"
        class="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 transition"
      >
        登出
      </Link>
    </div>

    <!-- Backdrop -->
    <div
      data-testid="dropdown-backdrop"
      class="fixed inset-0 z-40"
      style="background: transparent"
      @click="$emit('close')"
    ></div>
  </div>
</template>

<script setup>
import { Link } from '@inertiajs/vue3'

defineProps({
  user: { type: Object, required: true },
  showUserInfo: { type: Boolean, default: false },
})

defineEmits(['close'])
</script>
