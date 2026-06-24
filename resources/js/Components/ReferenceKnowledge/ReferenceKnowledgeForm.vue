<template>
  <form class="space-y-4" @submit.prevent="submitForm">
    <div>
      <label for="reference_id" class="block text-sm font-medium text-gray-700 mb-1">引用文獻</label>
      <select
        id="reference_id"
        v-model="form.reference_id"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
      >
        <option value="">請選擇文獻</option>
        <option v-for="reference in references" :key="reference.id" :value="reference.id">
          {{ reference.name }}
        </option>
      </select>
      <p v-if="errors.reference_id" class="mt-1 text-sm text-red-600">
        {{ errors.reference_id }}
      </p>
    </div>

    <div>
      <label for="tribe" class="block text-sm font-medium text-gray-700 mb-1">部落</label>
      <select
        id="tribe"
        v-model="form.tribe"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
      >
        <option value="">不指定部落</option>
        <option v-for="tribe in tribes" :key="tribe" :value="tribe">
          {{ tribe }}
        </option>
      </select>
      <p v-if="errors.tribe" class="mt-1 text-sm text-red-600">{{ errors.tribe }}</p>
    </div>

    <div>
      <label for="pages" class="block text-sm font-medium text-gray-700 mb-1">頁碼</label>
      <input
        id="pages"
        v-model="form.pages"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
        placeholder="例如：12 或 12-15，跳頁請分筆輸入"
      />
      <p class="mt-1 text-sm text-gray-500">僅接受單頁或連續頁，例如 12 或 12-15，跳頁請分筆輸入。</p>
      <p v-if="errors.pages" class="mt-1 text-sm text-red-600">{{ errors.pages }}</p>
    </div>

    <div>
      <label for="content" class="block text-sm font-medium text-gray-700 mb-1">內容</label>
      <textarea
        id="content"
        v-model="form.content"
        rows="8"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      <p v-if="errors.content" class="mt-1 text-sm text-red-600">{{ errors.content }}</p>
    </div>

    <div>
      <label for="note" class="block text-sm font-medium text-gray-700 mb-1">備註</label>
      <textarea
        id="note"
        v-model="form.note"
        rows="3"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      <p v-if="errors.note" class="mt-1 text-sm text-red-600">{{ errors.note }}</p>
    </div>

    <div class="flex justify-end gap-3">
      <Link :href="cancelUrl" class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">
        取消
      </Link>
      <button
        type="submit"
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        :disabled="processing"
      >
        {{ submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { Link } from '@inertiajs/vue3'

const props = defineProps({
  knowledge: { type: Object, default: null },
  references: { type: Array, default: () => [] },
  tribes: { type: Array, default: () => [] },
  cancelUrl: { type: String, required: true },
  isEditMode: { type: Boolean, default: false },
  submitLabel: { type: String, default: '儲存' },
  processing: { type: Boolean, default: false },
})

const emit = defineEmits(['submit'])

const form = reactive({
  reference_id: props.knowledge?.reference_id ?? '',
  tribe: props.knowledge?.tribe ?? '',
  content: props.knowledge?.content ?? '',
  pages: props.knowledge?.pages ?? '',
  note: props.knowledge?.note ?? '',
})

const errors = ref({})

function submitForm() {
  const formData = { ...form, ...(props.isEditMode ? { _method: 'PUT' } : {}) }
  emit('submit', formData)
}

function setErrors(serverErrors) {
  errors.value = serverErrors || {}
}

defineExpose({ setErrors })
</script>
