<template>
  <div v-if="notes && notes.length" class="w-full flex flex-col items-center">
    <div
      v-for="note in notes"
      :key="note.id"
      class="section w-full max-w-md p-4 bg-beige-100 rounded-lg shadow-custom mb-4"
    >
      <div class="section-title text-xl font-semibold text-primary mb-2">{{ note.note_type }}</div>
      <div class="text text-secondary">{{ note.note }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  notes: Array,
})
</script>
