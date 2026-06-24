<template>
  <div v-if="user && fishId" class="fixed bottom-8 right-8 z-50 hidden lg:flex flex-col-reverse items-end group">
    <!-- Main FAB -->
    <button class="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 z-10" aria-label="管理選單">
      <!-- 齒輪 SVG -->
      <svg class="w-6 h-6 transition-transform duration-300 group-hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </button>

    <!-- Menu Items (appear on hover) -->
    <div class="flex flex-col items-end mb-4 space-y-3 opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 origin-bottom">
      
      <!-- 進階知識 -->
      <Link :href="`/fish/${fishId}/knowledge-manager`" class="flex items-center gap-3 w-max group/item">
        <span class="px-3 py-1.5 bg-white text-gray-800 text-sm font-medium rounded-lg shadow-sm opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap">進階知識</span>
        <div class="flex items-center justify-center w-12 h-12 bg-white rounded-full text-indigo-600 shadow-md hover:bg-indigo-50 transition border border-gray-100">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
        </div>
      </Link>

      <!-- 地方知識 -->
      <Link :href="`/fish/${fishId}/tribal-classifications/create`" class="flex items-center gap-3 w-max group/item">
        <span class="px-3 py-1.5 bg-white text-gray-800 text-sm font-medium rounded-lg shadow-sm opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap">地方知識</span>
        <div class="flex items-center justify-center w-12 h-12 bg-white rounded-full text-green-600 shadow-md hover:bg-green-50 transition border border-gray-100">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
      </Link>

      <!-- 捕獲紀錄與發音 -->
      <Link :href="`/fish/${fishId}/media-manager`" class="flex items-center gap-3 w-max group/item">
        <span class="px-3 py-1.5 bg-white text-gray-800 text-sm font-medium rounded-lg shadow-sm opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap">捕獲紀錄與發音列表</span>
        <div class="flex items-center justify-center w-12 h-12 bg-white rounded-full text-teal-600 shadow-md hover:bg-teal-50 transition border border-gray-100">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </div>
      </Link>

      <!-- 修改名稱 -->
      <Link :href="`/fish/${fishId}/edit`" class="flex items-center gap-3 w-max group/item">
        <span class="px-3 py-1.5 bg-white text-gray-800 text-sm font-medium rounded-lg shadow-sm opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap">編輯魚類名稱</span>
        <div class="flex items-center justify-center w-12 h-12 bg-white rounded-full text-blue-600 shadow-md hover:bg-blue-50 transition border border-gray-100">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        </div>
      </Link>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Link, usePage } from '@inertiajs/vue3'

const props = defineProps({
  fishId: {
    type: [String, Number],
    required: true
  }
})

const page = usePage()
const user = computed(() => page.props.auth?.user)
</script>
