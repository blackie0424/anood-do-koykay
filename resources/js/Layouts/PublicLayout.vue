<script setup>
import { onMounted, onUnmounted } from 'vue'
import ConsentModal from '@/Components/ConsentModal.vue'
import { useContentProtection } from '@/composables/useContentProtection'

const { enable, disable } = useContentProtection()

onMounted(enable)
onUnmounted(disable)
</script>

<template>
    <div class="select-none">
        <ConsentModal />
        <slot />
    </div>
</template>
