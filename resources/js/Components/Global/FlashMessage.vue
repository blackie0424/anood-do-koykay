<template>
  <teleport to="body">
    <!-- 成功訊息 -->
    <transition name="flash">
      <div
        v-if="flashSuccess"
        class="fixed top-4 right-4 max-w-md w-full bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[9999] flex items-center justify-between animate-slide-in"
        role="alert"
      >
        <div class="flex items-center">
          <svg
            class="w-6 h-6 mr-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span class="font-medium">{{ flashSuccess }}</span>
        </div>
        <button
          @click="clearSuccess"
          class="ml-4 text-white hover:text-green-200 focus:outline-none transition-colors"
          aria-label="關閉"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </transition>

    <!-- 錯誤訊息 -->
    <transition name="flash">
      <div
        v-if="flashError"
        class="fixed top-4 right-4 max-w-md w-full bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[9999] flex items-center justify-between animate-slide-in"
        role="alert"
      >
        <div class="flex items-center">
          <svg
            class="w-6 h-6 mr-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span class="font-medium">{{ flashError }}</span>
        </div>
        <button
          @click="clearError"
          class="ml-4 text-white hover:text-red-200 focus:outline-none transition-colors"
          aria-label="關閉"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </transition>

    <!-- 資訊訊息（可選） -->
    <transition name="flash">
      <div
        v-if="flashInfo"
        class="fixed top-4 right-4 max-w-md w-full bg-blue-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[9999] flex items-center justify-between animate-slide-in"
        role="alert"
      >
        <div class="flex items-center">
          <svg
            class="w-6 h-6 mr-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="font-medium">{{ flashInfo }}</span>
        </div>
        <button
          @click="clearInfo"
          class="ml-4 text-white hover:text-blue-200 focus:outline-none transition-colors"
          aria-label="關閉"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { usePage } from '@inertiajs/vue3'

const page = usePage()

// 使用 ref 來控制顯示/隱藏，這樣才能手動清除
const showSuccess = ref(false)
const showError = ref(false)
const showInfo = ref(false)

const successMessage = ref('')
const errorMessage = ref('')
const infoMessage = ref('')

// 從 Inertia props 讀取 flash messages
const flashSuccess = computed(() => {
  const msg = page.props.flash?.success || page.props.success
  if (msg && msg !== successMessage.value) {
    successMessage.value = msg
    showSuccess.value = true
    autoHideSuccess()
  }
  return showSuccess.value ? successMessage.value : null
})

const flashError = computed(() => {
  const msg = page.props.flash?.error || page.props.error
  if (msg && msg !== errorMessage.value) {
    errorMessage.value = msg
    showError.value = true
    autoHideError()
  }
  return showError.value ? errorMessage.value : null
})

const flashInfo = computed(() => {
  const msg = page.props.flash?.info || page.props.info
  if (msg && msg !== infoMessage.value) {
    infoMessage.value = msg
    showInfo.value = true
    autoHideInfo()
  }
  return showInfo.value ? infoMessage.value : null
})

// 手動清除訊息
const clearSuccess = () => {
  showSuccess.value = false
  successMessage.value = ''
}

const clearError = () => {
  showError.value = false
  errorMessage.value = ''
}

const clearInfo = () => {
  showInfo.value = false
  infoMessage.value = ''
}

// 自動隱藏（5秒後）
const autoHideSuccess = () => {
  setTimeout(() => {
    showSuccess.value = false
  }, 5000)
}

const autoHideError = () => {
  setTimeout(() => {
    showError.value = false
  }, 5000)
}

const autoHideInfo = () => {
  setTimeout(() => {
    showInfo.value = false
  }, 5000)
}
</script>

<style scoped>
.flash-enter-active,
.flash-leave-active {
  transition: all 0.3s ease;
}

.flash-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.flash-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
</style>
