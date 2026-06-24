<template>
  <div class="space-y-6 w-full mb-6 md:mb-10">
    <!-- 區塊一：地方知識（分類與處理方式表格，保留原貌） -->
    <div class="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
      <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <h3 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          地方知識
        </h3>
      </div>

      <!-- 比較檢視（統一顯示所有部落，無資料則顯示未紀錄） -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-3 py-2 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">部落</th>
              <th class="px-3 py-2 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">飲食分類</th>
              <th class="px-3 py-2 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">處理方式</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr v-for="item in mappedClassifications" :key="item.tribe">
              <td class="px-3 py-2 align-top">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ item.tribe }}
                </span>
              </td>
              <td class="px-3 py-2 align-top text-base md:text-lg" :class="item.hasData ? 'text-gray-900' : 'text-gray-400'">
                {{ item.food_category || '尚未紀錄' }}
              </td>
              <td class="px-3 py-2 align-top text-base md:text-lg" :class="item.hasData ? 'text-gray-900' : 'text-gray-400'">
                {{ item.processing_method || '尚未紀錄' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 區塊二：地方知識田調紀錄（僅顯示有 notes 註記的部落） -->
    <div v-if="validClassifications.length > 0" class="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
      <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
        <h3 class="text-xl font-bold flex items-center gap-2 text-gray-900">
          <span>🏝️</span> 地方知識田調紀錄
        </h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="(item, index) in validClassifications" :key="index" class="bg-gray-50 rounded-lg p-4 border border-gray-200 h-full flex flex-col">
           <div class="flex items-center mb-2 shrink-0">
             <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {{ item.tribe }}
             </span>
           </div>
           <p class="text-gray-800 text-sm md:text-base whitespace-pre-line leading-relaxed flex-grow">
              {{ item.notes }}
           </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePage, Link } from '@inertiajs/vue3'
import { computed } from 'vue'

const props = defineProps({
  classifications: {
    type: Array,
    default: () => [],
  },
  fishId: {
    type: [String, Number],
    required: true,
  },
  tribes: {
    type: Array,
    default: () => [],
  }
})

const page = usePage()
const user = computed(() => page.props.auth?.user)

const mappedClassifications = computed(() => {
  // 防呆：如果父層尚未傳遞 tribes 或 tribes 為空，回退到原本的邏輯
  if (!props.tribes || props.tribes.length === 0) {
    return props.classifications.map(c => ({
      ...c,
      hasData: true
    }))
  }

  // 映射所有 tribes，並標示有沒有現存資料
  return props.tribes.map(tribe => {
    const existing = props.classifications.find(c => c.tribe === tribe)
    return {
      tribe: tribe,
      food_category: existing?.food_category || null,
      processing_method: existing?.processing_method || null,
      hasData: !!existing
    }
  })
})

const validClassifications = computed(() => {
   if (!props.classifications) return [];
   // 僅列出有部落屬性且有寫註記的資料
   return props.classifications.filter(c => c.tribe && c.notes && c.notes.trim() !== '');
})
</script>
