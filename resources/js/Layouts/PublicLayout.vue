<script setup>
import { onMounted, onUnmounted } from 'vue'
import ConsentDialog from '@/components/ConsentDialog.vue'
import { useContentProtection } from '@/composables/useContentProtection'

const { enable, disable } = useContentProtection()

onMounted(enable)
onUnmounted(disable)
</script>

<template>
    <div class="select-none">
        <ConsentDialog />
        <slot />
    </div>
</template>
