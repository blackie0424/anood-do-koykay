<template>
  <div
    class="min-h-screen bg-gray-50 relative"
    :class="[
      showHeader ? 'pt-4' : 'pt-0',
      user && fishId ? 'pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-6' : 'pb-6',
    ]"
  >
    <!-- 頂部導覽列 -->
    <AppNavBar
      v-if="showHeader"
      :pageTitle="pageTitle"
      :breadcrumbPage="breadcrumbPage"
      :mobileBackUrl="mobileBackUrl"
      :mobileBackText="mobileBackText"
    >
      <template #mobile-actions><slot name="mobile-actions" /></template>
      <template v-if="$slots['desktop-nav']" #desktop-nav>
        <slot name="desktop-nav" />
      </template>
      <template v-if="$slots['header-extension']" #header-extension>
        <slot name="header-extension" />
      </template>
    </AppNavBar>

    <!-- 全局 Flash Message -->
    <FlashMessage />

    <!-- 主要內容區域 -->
    <main class="container mx-auto max-w-7xl px-4 py-6">
      <slot />
    </main>

    <AppFooter />

    <!-- 桌面版懸浮管理選單 -->
    <AdminFloatingMenu v-if="user && fishId" :fishId="fishId" />

    <!-- 手機版底部管理選單 (常駐) -->
    <BottomNavBar v-if="user && fishId" :fishId="fishId" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import BottomNavBar from '@/Components/Global/BottomNavBar.vue'
import FlashMessage from '@/Components/Global/FlashMessage.vue'
import AppFooter from '@/Components/Global/AppFooter.vue'
import AdminFloatingMenu from '@/Components/Global/AdminFloatingMenu.vue'
import AppNavBar from '@/Components/Global/AppNavBar.vue'

const page = usePage()
const fish = computed(() => page.props.fish)
const user = computed(() => page.props.auth?.user)

// Props 定義
const props = defineProps({
  pageTitle: {
    type: String,
    default: '基本資料',
  },
  activeTab: {
    type: String,
    default: 'basic', // 'basic' | 'media' | 'knowledge'
  },
  // 用於子頁面的 breadcrumb (例如：「捕獲與發音」)
  breadcrumbPage: {
    type: String,
    default: '',
  },
  // 手機版返回按鈕設定
  mobileBackUrl: {
    type: String,
    default: '/fishs',
  },
  mobileBackText: {
    type: String,
    default: 'among no tao',
  },
  showBottomNav: {
    type: Boolean,
    default: true,
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
})

// 計算 fishId，優先使用 fish 物件
const fishId = computed(() => fish.value?.id)
</script>
