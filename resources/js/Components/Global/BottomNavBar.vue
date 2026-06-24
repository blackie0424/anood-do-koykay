<template>
  <div
    v-if="user"
    class="fixed bottom-0 left-0 right-0 z-40 flex justify-center lg:hidden pointer-events-none"
    style="padding-bottom: calc(env(safe-area-inset-bottom) + 1rem);"
  >
    <button
      @click="showAdminMenu = true"
      class="pointer-events-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 active:scale-95 transition-all focus:outline-none ring-4 ring-blue-600/20"
      aria-label="管理選單"
    >
      <svg fill="none" class="w-5 h-5" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
      <span class="font-bold tracking-wider text-[15px]">管理選單</span>
    </button>
  </div>

  <!-- Bottom Sheet 遮罩 -->
  <Transition
    enter-active-class="transition-opacity ease-linear duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity ease-linear duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-show="showAdminMenu" @click="showAdminMenu = false" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden pointer-events-auto"></div>
  </Transition>

  <!-- Bottom Sheet 內容 -->
  <Transition
    enter-active-class="transition ease-out duration-300 transform"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition ease-in duration-200 transform"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div v-show="showAdminMenu" class="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl lg:hidden max-h-[90vh] overflow-y-auto pointer-events-auto">
      <div class="p-4 pb-8 space-y-4" :style="`padding-bottom: calc(env(safe-area-inset-bottom) + 1.5rem)`">
        <!-- 頂部拉動條暗示 (純視覺) -->
        <div class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>

        <h3 class="text-lg font-bold text-gray-900 px-2 mb-2">請選擇管理動作</h3>

        <div class="grid grid-cols-2 gap-3">
          <!-- 修改基本資料 -->
          <Link :href="`/fish/${fishId}/edit`" class="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors active:bg-blue-200">
            <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm mb-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </div>
            <span class="text-xs sm:text-sm font-bold text-blue-900">編輯魚類名稱</span>
          </Link>

          <!-- 照片與發音 -->
          <Link :href="`/fish/${fishId}/media-manager`" class="flex flex-col items-center justify-center p-4 bg-teal-50 rounded-2xl hover:bg-teal-100 transition-colors active:bg-teal-200">
            <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-teal-600 shadow-sm mb-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <span class="text-xs sm:text-sm font-bold text-teal-900 text-center">捕獲紀錄與發音列表</span>
          </Link>

          <!-- 地方知識 -->
          <Link :href="`/fish/${fishId}/tribal-classifications/create`" class="flex flex-col items-center justify-center p-4 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors active:bg-green-200">
            <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm mb-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <span class="text-xs sm:text-sm font-bold text-green-900">地方知識</span>
          </Link>

          <!-- 進階知識 -->
          <Link :href="`/fish/${fishId}/knowledge-manager`" class="flex flex-col items-center justify-center p-4 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-colors active:bg-indigo-200">
            <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm mb-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            </div>
            <span class="text-xs sm:text-sm font-bold text-indigo-900">進階知識</span>
          </Link>
        </div>
        
        <button @click="showAdminMenu = false" class="w-full mt-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold active:bg-gray-200 focus:ring-2 focus:ring-gray-300">
          取消
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { usePage, Link } from '@inertiajs/vue3'

const props = defineProps({
  fishId: { type: [String, Number], required: true },
  activeTab: { type: String, default: 'basic' },
})

const page = usePage()
const user = computed(() => page.props.auth?.user)

const showAdminMenu = ref(false)

// Optional: scroll lock when bottom sheet is open
watch(showAdminMenu, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

// Ensures that the scroll lock is removed when navigating away from the component
onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>
