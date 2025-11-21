<template>
  <n-drawer
    :show="show"
    :width="960"
    placement="right"
    @update:show="val => emit('update:show', val)"
  >
    <n-drawer-content :title="drawerTitle">
      <n-spin :show="loading">
        <n-tabs v-model:value="activeTab" type="line">
          <!-- 탭 1. 기본 정보 -->
          <n-tab-pane name="basic" tab="기본 정보">
            <n-form
              label-placement="left"
              label-width="80"
              :show-require-mark="false"
              class="form-section"
            >
              <n-form-item label="제품명">
                <n-input v-model:value="basicForm.chem_name" placeholder="Please Input" />
              </n-form-item>

              <n-form-item label="회사명">
                <n-input v-model:value="basicForm.vendor_name" placeholder="Please Input" />
              </n-form-item>

              <n-form-item label="MSDS_NO">
                <n-input v-model:value="basicForm.msds_no" placeholder="Please Input" />
              </n-form-item>

              <n-form-item label="CAS No.">
                <n-input v-model:value="basicForm.cas_no" placeholder="예: 64-17-5" />
              </n-form-item>

              <n-form-item label="개정일자">
                <n-date-picker
                  v-model:value="basicForm.revision_date"
                  type="date"
                  placeholder="YYYY-MM-DD"
                  format="yyyy-MM-dd"
                  value-format="yyyy-MM-dd"
                  clearable
                  style="width: 100%;"
                />
              </n-form-item>

              <n-form-item label="개정번호">
                <n-input v-model:value="basicForm.version_no" placeholder="Please Input" />
              </n-form-item>
            </n-form>
          </n-tab-pane>

          <!-- 탭 2. 유해성 정보 -->
          <n-tab-pane name="hazard" tab="유해성 정보">
            <n-form
              label-placement="left"
              label-width="100"
              :show-require-mark="false"
              class="form-section"
            >
              <n-form-item label="신호어">
                <n-input v-model:value="hazardForm.signal_word" placeholder="예: 위험, 경고" />
              </n-form-item>
              <n-form-item label="GHS 그림문자">
                <n-input
                  v-model:value="hazardForm.pictograms"
                  placeholder="쉼표(,)로 구분하여 입력 (예: GHS02,GHS07)"
                />
              </n-form-item>
              <n-form-item label="H 코드">
                <n-input
                  v-model:value="hazardForm.h_codes"
                  placeholder="예: H225, H315 (쉼표로 구분)"
                />
              </n-form-item>
              <n-form-item label="P 코드">
                <n-input
                  v-model:value="hazardForm.p_codes"
                  placeholder="예: P210, P233 (쉼표로 구분)"
                />
              </n-form-item>
            </n-form>
          </n-tab-pane>

          <!-- 탭 3. 구성 성분 (수정 가능 테이블) -->
          <n-tab-pane name="composition" tab="구성 성분">
            <div class="physical-header">
              <p class="physical-desc">
                섹션 3(구성 성분)에서 추출된 성분 목록입니다. 성분명, CAS No., 함유량(하한/상한)을 직접 수정하거나 행을 추가·삭제할 수 있습니다.
              </p>
              <n-button size="small" tertiary @click="addCompositionRow">
                행 추가
              </n-button>
            </div>

            <n-data-table
              size="small"
              :columns="compositionColumns"
              :data="compositionRows"
              :max-height="150"
              :bordered="false"
            />
          </n-tab-pane>

          <!-- 탭 4. 물리·화학적 특성 (섹션 9 행 테이블) -->
          <n-tab-pane name="physical" tab="물리·화학적 특성">
            <div class="physical-header">
              <p class="physical-desc">
                섹션 9(물리·화학적 특성)에서 추출된 항목/값 목록입니다. 필요한 행을 직접 수정하거나 추가·삭제할 수 있습니다.
              </p>
              <n-button size="small" tertiary @click="addPhysicalRow">
                행 추가
              </n-button>
            </div>

            <n-data-table
              size="small"
              :columns="physicalColumns"
              :data="physicalRows"
              :bordered="false"
            />
          </n-tab-pane>

          <!-- 탭 5. 섹션 원문 -->
          <n-tab-pane name="sections" tab="섹션 원문">
            <p class="physical-desc" style="margin-bottom: 8px;">
              섹션 1~16의 원문 내용입니다. 필요한 섹션의 제목/내용을 직접 수정할 수 있습니다.
            </p>
            <n-data-table
              size="small"
              :columns="sectionColumns"
              :data="sectionRows"
              :bordered="false"
            />
          </n-tab-pane>
        </n-tabs>
      </n-spin>

      <template #footer>
        <div class="footer-buttons">
          <n-button size="small" @click="emit('update:show', false)">닫기</n-button>
          <n-button type="primary" size="small" @click="handleSave">
            저장
          </n-button>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { computed, reactive, ref, watch, h } from 'vue'
import axios from 'axios'
import {
  NDrawer,
  NDrawerContent,
  NSpin,
  NTabs,
  NTabPane,
  NForm,
  NFormItem,
  NInput,
  NDatePicker,
  NButton,
  NDataTable
} from 'naive-ui'

const API_BASE_URL =
  import.meta.env.VITE_MSDS_API_BASE || 'http://localhost:8000'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  doc: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:show', 'saved'])

const loading = ref(false)
const activeTab = ref('basic')

const drawerTitle = computed(() => {
  const name = props.doc?.chem_name || props.doc?.file_name || ''
  return name ? `MSDS 상세 / 수정 - ${name}` : 'MSDS 상세 / 수정'
})

/* --------------------------
   1) 기본 정보 폼
--------------------------- */
const basicForm = reactive({
  chem_name: '',
  vendor_name: '',
  msds_no: '',
  cas_no: '',
  revision_date: null,
  version_no: ''
})

/* --------------------------
   2) 유해성 정보 폼
--------------------------- */
const hazardForm = reactive({
  signal_word: '',
  pictograms: '',
  h_codes: '',
  p_codes: ''
})

/* --------------------------
   3) 구성 성분 (편집 가능한 테이블)
--------------------------- */
const compositionRows = ref([])

const compositionColumns = [
  {
    title: '물질명',
    key: 'name',
    minWidth: 180,
    render (row, index) {
      return h(NInput, {
        value: row.name || '',
        onUpdateValue: (val) => {
          compositionRows.value[index].name = val
        }
      })
    }
  },
  {
    title: 'CAS No.',
    key: 'cas_no',
    width: 160,
    render (row, index) {
      return h(NInput, {
        value: row.cas_no || '',
        onUpdateValue: (val) => {
          compositionRows.value[index].cas_no = val
        }
      })
    }
  },
  {
    title: '하한(%)',
    key: 'conc_min',
    width: 90,
    render (row, index) {
      return h(NInput, {
        value: row.conc_min ?? '',
        onUpdateValue: (val) => {
          const num = val === '' ? null : Number(val)
          compositionRows.value[index].conc_min = isNaN(num) ? null : num
        }
      })
    }
  },
  {
    title: '상한(%)',
    key: 'conc_max',
    width: 90,
    render (row, index) {
      return h(NInput, {
        value: row.conc_max ?? '',
        onUpdateValue: (val) => {
          const num = val === '' ? null : Number(val)
          compositionRows.value[index].conc_max = isNaN(num) ? null : num
        }
      })
    }
  },
  {
    title: '대표값(%)',
    key: 'conc_repr',
    width: 90,
    render (row, index) {
      return h(NInput, {
        value: row.conc_repr ?? '',
        onUpdateValue: (val) => {
          const num = val === '' ? null : Number(val)
          compositionRows.value[index].conc_repr = isNaN(num) ? null : num
        }
      })
    }
  },
  {
    title: '',
    key: 'actions',
    width: 80,
    align: 'center',
    render (row, index) {
      return h(
        NButton,
        {
          size: 'small',
          tertiary: true,
          type: 'error',
          onClick: () => removeCompositionRow(index)
        },
        { default: () => '삭제' }
      )
    }
  }
]

function addCompositionRow () {
  compositionRows.value.push({
    id: null,
    name: '',
    cas_no: '',
    conc_min: null,
    conc_max: null,
    conc_repr: null
  })
}

function removeCompositionRow (idx) {
  compositionRows.value.splice(idx, 1)
}

/* --------------------------
   4) 물리·화학적 특성 (행 테이블)
--------------------------- */

const physicalRows = ref([])

const physicalColumns = [
  {
    title: '항목',
    key: 'item',
    minWidth: 200,
    render (row, index) {
      return h(NInput, {
        value: row.item || '',
        onUpdateValue: (val) => {
          physicalRows.value[index].item = val
        }
      })
    }
  },
  {
    title: '값',
    key: 'value',
    minWidth: 260,
    render (row, index) {
      return h(NInput, {
        value: row.value || '',
        onUpdateValue: (val) => {
          physicalRows.value[index].value = val
        }
      })
    }
  },
  {
    title: '',
    key: 'actions',
    width: 80,
    align: 'center',
    render (row, index) {
      return h(
        NButton,
        {
          size: 'small',
          tertiary: true,
          type: 'error',
          onClick: () => removePhysicalRow(index)
        },
        { default: () => '삭제' }
      )
    }
  }
]

function addPhysicalRow () {
  physicalRows.value.push({
    id: null,
    item: '',
    value: ''
  })
}

function removePhysicalRow (idx) {
  physicalRows.value.splice(idx, 1)
}

/* --------------------------
   5) 섹션 원문 (1~16) 편집 테이블
--------------------------- */
const sectionRows = ref([])

const sectionColumns = [
  {
    title: '섹션',
    key: 'section_num',
    width: 70
  },
  {
    title: '키',
    key: 'section_key',
    width: 140
  },
  {
    title: '제목',
    key: 'title',
    minWidth: 180,
    render (row, index) {
      return h(NInput, {
        value: row.title || '',
        onUpdateValue: (val) => {
          sectionRows.value[index].title = val
        }
      })
    }
  },
  {
    title: '내용',
    key: 'content',
    minWidth: 400,
    render (row, index) {
      return h(NInput, {
        type: 'textarea',
        value: row.content || '',
        autosize: { minRows: 3, maxRows: 10 },
        onUpdateValue: (val) => {
          sectionRows.value[index].content = val
        }
      })
    }
  }
]

/* --------------------------
   6) 상세 조회 & 매핑
--------------------------- */
async function fetchDetail () {
  if (!props.doc || !props.doc.id) return
  loading.value = true

  try {
    const resp = await axios.get(
      `${API_BASE_URL}/msds/${props.doc.id}/manage`
    )
    const data = resp.data || {}

    // 1) document → basicForm
    if (data.document) {
      const d = data.document
      basicForm.chem_name = d.chem_name || ''
      basicForm.vendor_name = d.vendor_name || ''
      basicForm.msds_no = d.msds_no || ''
      basicForm.cas_no = d.cas_no || ''
      basicForm.version_no = d.version_no || ''
      basicForm.revision_date = d.revision_date || null
    } else {
      basicForm.chem_name = ''
      basicForm.vendor_name = ''
      basicForm.msds_no = ''
      basicForm.cas_no = ''
      basicForm.version_no = ''
      basicForm.revision_date = null
    }

    // 2) hazard
    if (data.hazard) {
      const h = data.hazard
      hazardForm.signal_word = h.signal_word || ''
      hazardForm.pictograms = h.pictograms || ''
      hazardForm.h_codes = h.h_codes || ''
      hazardForm.p_codes = h.p_codes || ''
    } else {
      hazardForm.signal_word = ''
      hazardForm.pictograms = ''
      hazardForm.h_codes = ''
      hazardForm.p_codes = ''
    }

    // 3) composition
    if (Array.isArray(data.composition)) {
      compositionRows.value = data.composition.map((c, idx) => {
        const min = c.conc_min ?? null
        const max = c.conc_max ?? null
        return {
          id: c.id ?? idx,
          name: c.name || '',
          cas_no: c.cas_no || '',
          conc_min: min,
          conc_max: max,
          conc_repr:
            c.conc_repr ??
            (min != null && max != null
              ? (Number(min) + Number(max)) / 2
              : null)
        }
      })
    } else {
      compositionRows.value = []
    }

    // 4) physical rows
    if (Array.isArray(data.physical_rows)) {
      physicalRows.value = data.physical_rows.map((r) => ({
        id: r.id ?? null,
        item: r.item || '',
        value: r.value || ''
      }))
    } else {
      physicalRows.value = []
    }

    // 5) sections (원문)
    if (Array.isArray(data.sections)) {
      sectionRows.value = data.sections.map((s) => ({
        id: s.id ?? null,
        section_num: s.section_num,
        section_key: s.section_key || '',
        title: s.title || '',
        content: s.content || ''
      }))
    } else {
      sectionRows.value = []
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

/* Drawer가 열릴 때마다 상세 재조회 */
watch(
  () => props.show,
  (visible) => {
    if (visible && props.doc?.id) {
      activeTab.value = 'basic'
      fetchDetail()
    }
  }
)

/* --------------------------
   7) 저장
--------------------------- */
async function handleSave () {
  if (!props.doc || !props.doc.id) return

  const payload = {
    document: {
      chem_name: basicForm.chem_name,
      vendor_name: basicForm.vendor_name,
      msds_no: basicForm.msds_no,
      cas_no: basicForm.cas_no,
      revision_date: basicForm.revision_date,
      version_no: basicForm.version_no
    },
    hazard: {
      signal_word: hazardForm.signal_word || null,
      pictograms: hazardForm.pictograms,
      h_codes: hazardForm.h_codes,
      p_codes: hazardForm.p_codes
    },
    composition: compositionRows.value.map((c) => ({
      id: c.id ?? null,
      name: c.name || null,
      cas_no: c.cas_no || null,
      conc_min: c.conc_min,
      conc_max: c.conc_max,
      conc_repr: c.conc_repr
    })),
    physical_rows: physicalRows.value.map((r) => ({
      id: r.id ?? null,
      item: r.item || '',
      value: r.value || ''
    })),
    sections: sectionRows.value.map((s) => ({
      id: s.id ?? null,
      section_num: s.section_num,
      section_key: s.section_key || null,
      title: s.title || null,
      content: s.content || ''
    }))
  }

  try {
    await axios.patch(
      `${API_BASE_URL}/msds/${props.doc.id}/manage`,
      payload
    )
    emit('saved')
  } catch (err) {
    console.error(err)
  }
}
</script>

<style scoped>
.form-section {
  max-width: 640px;
}

.footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.physical-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.physical-desc {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}
</style>
