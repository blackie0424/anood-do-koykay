<template>
  <section
    v-if="isEditor && (hasKnowledge || user)"
    class="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
  >
    <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
      <h2 class="text-xl font-bold flex items-center gap-2 text-gray-900">
        <span>📚</span> 文獻知識
      </h2>
    </div>

    <div v-if="hasKnowledge" class="space-y-6">
      <article
        v-for="group in groupedReferenceKnowledge"
        :key="group.key"
        data-testid="reference-group"
        class="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
      >
        <div class="flex items-start gap-4 border-b border-gray-200 bg-white p-4">
          <div
            data-testid="reference-group-cover"
            class="aspect-[3/4] w-32 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 sm:w-40"
          >
            <LazyImage
              v-if="group.reference.image_url"
              :src="group.reference.image_url"
              :alt="group.reference.name"
              wrapperClass="h-full w-full"
              imgClass="h-full w-full object-cover"
            />
            <div
              v-else
              class="flex h-full items-center justify-center px-2 text-center text-xs font-medium text-gray-400"
            >
              暫無封面
            </div>
          </div>
          <div class="min-w-0 space-y-1">
            <h3 class="text-lg font-bold text-gray-900">{{ group.reference.name }}</h3>
            <p class="text-sm text-gray-500">共 {{ group.items.length }} 筆文獻知識</p>
          </div>
        </div>

        <div class="space-y-4 p-4">
          <div
            v-for="item in group.items"
            :key="item.id"
            class="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div class="mb-3 flex flex-wrap items-center gap-2">
              <span class="text-sm font-medium text-gray-500">頁碼：{{ item.pages }}</span>
              <span
                v-if="item.tribe"
                class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
              >
                部落：{{ item.tribe }}
              </span>
            </div>
            <div class="whitespace-pre-line leading-relaxed text-gray-800">
              {{ item.content }}
            </div>
            <div v-if="item.note" class="mt-3 text-sm text-gray-500">
              備註：{{ item.note }}
            </div>
          </div>
        </div>
      </article>
    </div>
    <div
      v-else
      class="text-gray-500 text-center py-8 border border-dashed border-gray-300 rounded-lg"
    >
      目前沒有文獻知識的紀錄
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import LazyImage from '@/Components/UI/LazyImage.vue'
import { groupReferenceKnowledgeByReference } from '@/utils/referenceKnowledge'

const props = defineProps({
  referenceKnowledge: { type: Array, default: () => [] },
  isEditor: { type: Boolean, default: false },
  user: { type: Object, default: null },
})

const hasKnowledge = computed(() => props.referenceKnowledge.length > 0)
const groupedReferenceKnowledge = computed(() => groupReferenceKnowledgeByReference(props.referenceKnowledge))
</script>
