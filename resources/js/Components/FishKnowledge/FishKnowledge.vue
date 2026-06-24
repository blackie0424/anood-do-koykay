<template>
  <div class="w-full flex flex-col items-center">
    <!-- Locate 區塊 -->
    <div
      class="section section-locate w-full max-w-3xl text-center p-4 rounded-lg shadow-custom mb-4 bg-gray-100"
    >
      <div class="text text-xl text-secondary mb-2">地區筆記</div>
      <div class="relative flex justify-center">
        <button
          class="px-6 py-1 rounded-full border bg-yellow-500 text-white font-bold shadow transition flex items-center min-w-[120px]"
          @click="toggleDropdown"
          type="button"
        >
          {{ currentLabel }}
          <svg
            class="ml-2 w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          v-if="dropdownOpen"
          class="absolute left-0 mt-2 w-full bg-white border rounded-xl shadow-lg z-50"
        >
          <ul>
            <li
              v-for="loc in locates"
              :key="loc.value"
              @click="selectLocate(loc.value)"
              class="px-6 py-2 cursor-pointer hover:bg-yellow-100 rounded-full transition"
              :class="loc.value === selectedLocate ? 'font-bold text-yellow-600' : ''"
            >
              {{ loc.label }}
            </li>
          </ul>
        </div>
      </div>
    </div>
    <!-- LoadingBar -->
    <LoadingBar :loading="loading" :error="error" type="text" loading-text="筆記載入中..." />

    <!-- 筆記區塊 -->
    <div v-if="!loading">
      <div v-if="notes.length" class="w-full flex flex-col items-center mb-2">
        <div
          v-for="note in notes"
          :key="note.id"
          class="w-full max-w-md p-4 bg-beige-100 rounded-lg shadow-custom mb-4"
        >
          <div class="flex items-center justify-between w-full">
            <div class="text-xl font-semibold text-primary truncate">
              {{ note.note_type }}
            </div>
            <OverflowMenu
              :apiUrl="`/prefix/api/fish/${fishId}/note/${note.id}`"
              @deleted="notes = notes.filter((n) => n.id !== note.id)"
            />
          </div>

          <div class="text text-secondary">{{ note.note }}</div>
        </div>
      </div>
      <div v-else class="text-center text-gray-500 mt-4">沒有筆記資料</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import LoadingBar from '@/Components/UI/LoadingBar.vue'
import OverflowMenu from '@/Components/UI/OverflowMenu.vue'

const props = defineProps({
  locates: Array,
  fishId: Number,
  currentLocate: {
    type: String,
    default: 'iraraley',
  },
})

const emit = defineEmits(['update:locateData'])

const dropdownOpen = ref(false)
const selectedLocate = ref(props.currentLocate || 'iraraley')
const notes = ref([])
const loading = ref(false)
const menuOpenId = ref(null)

const currentLabel = computed(() => {
  const found = props.locates.find((l) => l.value === selectedLocate.value)
  return found ? found.label : ''
})

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

async function fetchNotes() {
  loading.value = true
  try {
    const res = await fetch(`/prefix/api/fish/${props.fishId}/notes?locate=${selectedLocate.value}`)
    const data = await res.json()
    notes.value = data.data || []
    emit('update:locateData', { locate: selectedLocate.value, notes: notes.value })
  } finally {
    loading.value = false
  }
}

function selectLocate(value) {
  console.log(`選擇地區: ${value}`)
  selectedLocate.value = value
  dropdownOpen.value = false
  fetchNotes()
}

// 初始化時自動取得 notes
onMounted(fetchNotes)

// 若父層 currentLocate 有變動，需同步
watch(
  () => props.currentLocate,
  (val) => {
    selectedLocate.value = val
    fetchNotes()
  }
)

async function deleteNote(id) {
  menuOpenId.value = null
  if (!confirm('確定要刪除這則筆記嗎？')) return
  const res = await fetch(`/prefix/api/fish/${props.fishId}/note/${id}`, { method: 'DELETE' })
  if (res.ok) {
    notes.value = notes.value.filter((n) => n.id !== id)
  } else {
    alert('刪除失敗')
  }
}
</script>
