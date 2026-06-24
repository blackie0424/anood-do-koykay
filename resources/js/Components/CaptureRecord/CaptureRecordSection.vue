<template>
  <section
    v-if="captureRecords.length || user"
    class="rounded-xl bg-white shadow-sm border border-gray-200 p-4"
  >
    <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
      <div class="flex items-center gap-3">
        <h3 class="text-2xl font-bold text-gray-900">捕獲紀錄</h3>
        <span class="text-sm font-bold bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
          {{ captureRecords.length }}
        </span>
      </div>
    </div>

    <div v-if="captureRecords.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <CaptureRecordDisplayCard
        v-for="(record, index) in captureRecords"
        :key="record.id"
        :record="record"
        :index="index"
        :fishName="fishName"
      />
    </div>
  </section>
</template>

<script setup>
import CaptureRecordDisplayCard from '@/Components/CaptureRecord/CaptureRecordDisplayCard.vue'

defineProps({
  captureRecords: { type: Array, default: () => [] },
  fishName: { type: String, default: '' },
  user: { type: Object, default: null },
})
</script>
