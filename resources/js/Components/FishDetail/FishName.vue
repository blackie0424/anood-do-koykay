<template>
  <div class="section section-name w-full max-w-3xl p-4 mb-4 flex flex-col items-end">
    <div class="flex justify-between w-full mb-4">
      <div class="text text-xl text-secondary">ngaran no among</div>
      <OverflowMenu
        v-if="!readonly"
        :apiUrl="`/fish/${fishId}`"
        :redirectUrl="`/fishs`"
        :fishId="fishId"
        :enableMergeFish="true"
        @deleted="onFishDeleted"
      />
    </div>
    <!-- 魚名與 icon 水平排列 -->
    <div class="section-title text-2xl font-bold text-primary flex justify-between w-full">
      <span>{{ fishName }}</span>
      <template v-if="props.audio">
        <Volume :audioUrl="props.audio" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { router } from '@inertiajs/vue3'
import Volume from '@/Components/UI/Volume.vue'
import OverflowMenu from '@/Components/UI/OverflowMenu.vue'

const props = defineProps({
  fishName: String,
  fishId: [String, Number],
  audio: String,
  readonly: {
    type: Boolean,
    default: false,
  },
})
</script>
