<template>
  <form @submit.prevent="submitForm" class="space-y-8 md:space-y-10 text-xl leading-relaxed">

    <!-- ── 圖片區塊（兩種模式共用） ── -->
    <div :class="isEditMode ? '' : (step === 1 ? 'space-y-4 md:space-y-6' : 'hidden')">
      <!-- Edit mode：顯示現有圖片 -->
      <div v-if="isEditMode && record.image_url && !imagePreview" class="mb-4">
        <p class="text-sm text-gray-600 mb-2">當前照片：</p>
        <LazyImage
          :src="record.image_url"
          alt="當前捕獲照片"
          wrapperClass="fish-image-wrapper"
          imgClass="fish-image"
        />
      </div>

      <!-- 上傳區 -->
      <div
        class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors"
      >
        <div class="space-y-3 md:space-y-4 text-center">
          <div v-if="!imagePreview">
            <div
              v-if="!isEditMode"
              class="mx-auto w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 text-gray-400"
            >
              <svg class="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <svg
              v-else
              class="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <div class="flex text-base text-gray-600 justify-center mt-2">
              <label
                for="image"
                class="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <span>{{ record?.image_url ? '更換照片' : '上傳照片' }}</span>
                <input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  class="sr-only"
                  @change="onImageChange"
                  :disabled="uploading"
                />
              </label>
            </div>
            <p class="text-sm text-gray-500">PNG, JPG, WEBP 最大 10MB</p>
          </div>

          <!-- 預覽（edit mode 有刪除按鈕） -->
          <div v-else :class="isEditMode ? 'relative' : 'mx-auto w-64 md:w-80 lg:w-128 aspect-video'">
            <img
              :src="imagePreview"
              alt="預覽"
              :class="isEditMode ? 'mx-auto h-32 w-auto rounded-lg' : 'h-full w-full object-cover rounded-lg shadow-sm'"
            />
            <button
              v-if="isEditMode"
              type="button"
              @click="onRemoveImage"
              class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              :disabled="uploading"
            >×</button>
            <p v-if="isEditMode && selectedFileName" class="mt-2 text-sm text-gray-600">{{ selectedFileName }}</p>
            <div v-if="uploading" class="mt-2 text-sm text-blue-600 flex items-center justify-center">
              <svg class="animate-spin mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              正在上傳圖片...
            </div>
            <div v-else-if="isEditMode && uploadedFilename" class="mt-2 text-sm text-green-600">✓ 圖片上傳成功</div>
          </div>
        </div>
      </div>
      <div v-if="errors.image" class="text-red-500 text-base mt-1">{{ errors.image }}</div>
    </div>

    <!-- ── Step 2 / Edit mode：部落、地點、日期 ── -->
    <template v-if="isEditMode || step === 2">
      <!-- 過往捕獲資訊選擇器（僅 create mode） -->
      <CaptureRecordSessionSelector
        v-if="!isEditMode && sessionSelectorVisible"
        :sessions="recent_sessions"
        @select="onSessionSelect"
      />
      <template v-if="isEditMode || !sessionSelectorVisible">
        <div>
          <label for="tribe" class="block text-xl font-medium text-gray-700 mb-2">
            捕獲部落 <span class="text-red-500">*</span>
          </label>
          <select
            id="tribe"
            v-model="form.tribe"
            class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">請選擇部落</option>
            <option v-for="tribe in tribes" :key="tribe" :value="tribe">{{ tribe }}</option>
          </select>
          <div v-if="errors.tribe" class="text-red-500 text-base mt-1">{{ errors.tribe }}</div>
        </div>

        <div>
          <label for="location" class="block text-xl font-medium text-gray-700 mb-2">
            捕獲地點 <span class="text-red-500">*</span>
          </label>
          <input
            id="location"
            v-model="form.location"
            type="text"
            class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="請輸入捕獲地點"
          />
          <div v-if="errors.location" class="text-red-500 text-base mt-1">{{ errors.location }}</div>
        </div>

        <div>
          <label for="capture_date" class="block text-xl font-medium text-gray-700 mb-2">
            捕獲日期 <span class="text-red-500">*</span>
          </label>
          <input
            id="capture_date"
            v-model="form.capture_date"
            type="date"
            :max="today"
            class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div v-if="errors.capture_date" class="text-red-500 text-base mt-1">{{ errors.capture_date }}</div>
        </div>
      </template>
    </template>

    <!-- ── Step 3 / Edit mode：捕獲方式、備註 ── -->
    <template v-if="isEditMode || step === 3">
      <div>
        <label for="capture_method" class="block text-xl font-medium text-gray-700 mb-2">
          捕獲方式 <span class="text-red-500">*</span>
        </label>
        <select
          id="capture_method"
          v-model="form.capture_method"
          class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">請選擇捕獲方式</option>
          <option v-for="(label, value) in capture_methods" :key="value" :value="value">{{ label }}</option>
        </select>
        <div v-if="errors.capture_method" class="text-red-500 text-base mt-1">{{ errors.capture_method }}</div>
      </div>

      <div>
        <label for="notes" class="block text-xl font-medium text-gray-700 mb-2">備註</label>
        <textarea
          id="notes"
          v-model="form.notes"
          rows="3"
          class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="請輸入相關備註資訊"
        ></textarea>
        <div v-if="errors.notes" class="text-red-500 text-base mt-1">{{ errors.notes }}</div>
      </div>
    </template>

  </form>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import LazyImage from '@/Components/UI/LazyImage.vue'
import CaptureRecordSessionSelector from '@/Components/CaptureRecord/CaptureRecordSessionSelector.vue'
import { useImageUpload } from '@/composables/useImageUpload'
import { useCaptureFormFields } from '@/composables/useCaptureFormFields'

const props = defineProps({
  record: { type: Object, default: null },
  tribes: Array,
  capture_methods: [Array, Object],
  fishName: String,
  fishImage: String,
  recent_sessions: { type: Array, default: () => [] },
})

const emit = defineEmits(['submit', 'statusChange'])

const isEditMode = computed(() => !!props.record)

// ── Create mode state ──
const step = ref(1)
const sessionSelectorVisible = ref(false)
const imageFilename = ref(null)
const processing = ref(false)

// ── Edit mode state ──
const selectedFileName = ref('')
const canSubmit = ref(true)

const today = computed(() => new Date().toISOString().split('T')[0])

// ── Composables ──
const {
  imagePreview,
  uploading,
  uploadedFilename,
  imageError,
  handleImageChange: baseHandleImageChange,
  uploadImage,
  removeImage: baseRemoveImage,
} = useImageUpload({ autoUpload: isEditMode.value })

const { form, errors, validateCaptureFields, buildFormData } = useCaptureFormFields()

// ── Edit mode: 初始化表單資料 ──
onMounted(() => {
  if (props.record) {
    form.tribe = props.record.tribe || ''
    form.location = props.record.location || ''
    form.capture_method = props.record.capture_method || ''
    form.capture_date = props.record.capture_date
      ? new Date(props.record.capture_date).toISOString().split('T')[0]
      : ''
    form.notes = props.record.notes || ''
  }
})

// ── 圖片處理 ──
function onImageChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (isEditMode.value) {
    // edit mode：自動上傳，同時通知父元件狀態
    selectedFileName.value = file.name
    canSubmit.value = false
    errors.value = {}
    emit('statusChange', { canSubmit: false, uploading: true })

    baseHandleImageChange(event)
      .then(() => {
        uploadedFilename.value && (imageFilename.value = uploadedFilename.value)
        canSubmit.value = true
        emit('statusChange', { canSubmit: true, uploading: false })
      })
      .catch(() => {
        errors.value = { image: imageError.value }
        canSubmit.value = true
        emit('statusChange', { canSubmit: true, uploading: false })
      })
  } else {
    // create mode：僅設定 file，上傳由 nextStep 觸發
    form.image = file
    baseHandleImageChange(event)
  }
}

function onRemoveImage() {
  baseRemoveImage()
  selectedFileName.value = ''
  imageFilename.value = null
  canSubmit.value = true
  const input = document.getElementById('image')
  if (input) input.value = ''
}

// ── Create mode：步驟控制 ──
async function doUploadStep() {
  if (imageFilename.value) return true
  if (!form.image) { errors.value.image = '請先選擇圖片'; return false }
  try {
    errors.value.image = null
    const filename = await uploadImage(form.image)
    imageFilename.value = filename
    return true
  } catch {
    errors.value.image = imageError.value
    return false
  }
}

function nextStep() {
  if (step.value === 1) {
    doUploadStep().then((ok) => { if (ok) step.value = 2 })
  } else if (step.value === 2) {
    const e = {}
    if (!form.tribe) e.tribe = '請選擇部落'
    if (!form.location) e.location = '請輸入地點'
    if (!form.capture_date) e.capture_date = '請選擇日期'
    if (Object.keys(e).length) { errors.value = e; return }
    errors.value = {}
    step.value = 3
  }
}

function prevStep() {
  if (step.value > 1) step.value--
}

// ── Submit ──
function finalSubmit() {
  if (!form.capture_method) {
    errors.value = { capture_method: '請選擇捕獲方式' }
    return
  }
  emit('submit', { ...buildFormData(), image_filename: imageFilename.value })
}

function submitForm() {
  if (isEditMode.value) {
    if (!validateCaptureFields()) return
    const formData = { ...buildFormData(), _method: 'PUT' }
    if (uploadedFilename.value) formData.image_filename = uploadedFilename.value
    emit('submit', formData)
    return
  }

  // Create mode：依步驟處理
  if (step.value === 1) {
    doUploadStep().then((ok) => { if (ok) step.value = 2 })
  } else if (step.value === 2) {
    nextStep()
  } else if (step.value === 3) {
    finalSubmit()
  }
}

// ── Create mode helpers ──
function setPrefillImage(filename) {
  if (filename) {
    imageFilename.value = filename
    step.value = 2
    if (props.recent_sessions?.length > 0) sessionSelectorVisible.value = true
  }
}

function onSessionSelect(session) {
  if (session) {
    form.tribe = session.tribe
    form.location = session.location
    form.capture_date = session.capture_date
    form.capture_method = session.capture_method
  }
  sessionSelectorVisible.value = false
}

function setErrors(e) {
  errors.value = e || {}
}

defineExpose({
  // create mode
  step, nextStep, prevStep, finalSubmit, setPrefillImage,
  // shared
  submitForm, uploading, processing, canSubmit, setErrors,
})
</script>
