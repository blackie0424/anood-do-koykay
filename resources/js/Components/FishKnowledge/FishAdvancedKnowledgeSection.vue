<template>
  <section
    v-if="isEditor && (hasNotes || user)"
    class="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
  >
    <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
      <h2 class="text-xl font-bold flex items-center gap-2 text-gray-900">
        <span>📖</span> 進階知識
      </h2>
    </div>

    <div v-if="hasNotes" class="space-y-8">
      <div v-for="(locates, type) in groupedNotesByTypeAndLocate" :key="type">
        <h4 class="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center border-b pb-2">
          <span class="w-1.5 h-5 bg-teal-500 rounded-full mr-2"></span>
          {{ type }}
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="(notes, locate) in locates"
            :key="locate"
            class="bg-gray-50 rounded-xl p-5 border border-gray-200"
          >
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-3"
            >
              {{ locate }}
            </span>
            <ul class="space-y-4">
              <li v-for="note in notes" :key="note.id">
                <div class="text-gray-800 md:text-lg whitespace-pre-line leading-relaxed">
                  {{ note.note }}
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div
      v-else
      class="text-gray-500 text-center py-8 border border-dashed border-gray-300 rounded-lg"
    >
      目前沒有進階地方知識的紀錄
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useFishNotes } from '@/composables/useFishNotes.js'

const props = defineProps({
  fishNotes: { type: Object, default: () => ({}) },
  isEditor: { type: Boolean, default: false },
  user: { type: Object, default: null },
})

const fishNotesRef = computed(() => props.fishNotes)
const { hasNotes, groupedNotesByTypeAndLocate } = useFishNotes(fishNotesRef)
</script>
