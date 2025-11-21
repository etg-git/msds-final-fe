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

              <n-form-item label="Cas No">
                <n-input v-model:value="basicForm.cas_no" placeholder="Please Input" />
              </n-form-item>

              <n-form-item label="MSDS_NO">
                <n-input v-model:value="basicForm.msds_no" placeholder="Please Input" />
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
                  placeholder="쉼표(,)로 구분하여 입력"
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

          <!-- 탭 3. 구성 성분 (편집 가능한 테이블) -->
          <n-tab-pane name="composition" tab="구성 성분">
            <div class="composition-toolbar">
              <n-button size="small" @click="addCompositionRow">
                행 추가
              </n-button>
            </div>
            <n-data-table
              size="small"
              :columns="compositionColumns"
              :data="compositionRows"
              :bordered="false"
            />
          </n-tab-pane>

          <!-- 탭 4. 물리·화학적 특성 -->
          <n-tab-pane name="physical" tab="물리·화학적 특성">
            <n-form
              label-placement="left"
              label-width="110"
              :show-require-mark="false"
              class="form-section"
            >
              <n-form-item label="외관 / 상태">
                <n-input
                  v-model:value="physicalForm.appearance"
                  type="textarea"
                  placeholder="예: 무색 투명한 액체"
                />
              </n-form-item>
              <n-form-item label="색 / 냄새">
                <n-input
                  v-model:value="physicalForm.color_odor"
                  type="textarea"
                  placeholder="예: 특유의 용제 냄새"
                />
              </n-form-item>
              <n-form-item label="pH">
                <n-input v-model:value="physicalForm.ph" placeholder="예: 7.0" />
              </n-form-item>
              <n-form-item label="비점">
                <n-input
                  v-model:value="physicalForm.boiling_point"
                  placeholder="예: 80 ℃"
                />
              </n-form-item>
              <n-form-item label="인화점">
                <n-input
                  v-model:value="physicalForm.flash_point"
                  placeholder="예: 25 ℃"
                />
              </n-form-item>
              <n-form-item label="기타 특성">
                <n-input
                  v-model:value="physicalForm.etc"
                  type="textarea"
                  placeholder="기타 물리·화학적 특성을 자유롭게 기록합니다."
                />
              </n-form-item>
            </n-form>
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

/* 1) 기본 정보 */
const basicForm = reactive({
  chem_name: '',
  vendor_name: '',
  cas_no: '',
  msds_no: '',
  revision_date: null,
  version_no: ''
})

/* 2) 유해성 정보 */
const hazardForm = reactive({
  signal_word: '',
  pictograms: '',
  h_codes: '',
  p_codes: ''
})

/* 3) 구성 성분 (편집 가능 테이블) */
const compositionRows = ref([])

const compositionColumns = [
  {
    title: '물질명',
    key: 'name',
    minWidth: 160,
    render (row) {
      return h(NInput, {
        value: row.name,
        placeholder: '물질명',
        size: 'small',
        'onUpdate:value': (v) => { row.name = v }
      })
    }
  },
  {
    title: 'CAS No.',
    key: 'cas_no',
    width: 160,
    render (row) {
      return h(NInput, {
        value: row.cas_no,
        placeholder: 'CAS No.',
        size: 'small',
        'onUpdate:value': (v) => { row.cas_no = v }
      })
    }
  },
  {
    title: '함유량',
    key: 'range',
    width: 120,
    render (row) {
      return h(NInput, {
        value: row.range,
        placeholder: '예: 10-20',
        size: 'small',
        'onUpdate:value': (v) => { row.range = v }
      })
    }
  },
  {
    title: '상한',
    key: 'conc_max',
    width: 80,
    render (row) {
      return h(NInput, {
        value: row.conc_max,
        placeholder: '',
        size: 'small',
        'onUpdate:value': (v) => { row.conc_max = v }
      })
    }
  },
  {
    title: '하한',
    key: 'conc_min',
    width: 80,
    render (row) {
      return h(NInput, {
        value: row.conc_min,
        placeholder: '',
        size: 'small',
        'onUpdate:value': (v) => { row.conc_min = v }
      })
    }
  },
  {
    title: '대표값',
    key: 'conc_repr',
    width: 80,
    render (row) {
      return h(NInput, {
        value: row.conc_repr,
        placeholder: '',
        size: 'small',
        'onUpdate:value': (v) => { row.conc_repr = v }
      })
    }
  },
  {
    title: '관리',
    key: 'actions',
    width: 80,
    align: 'center',
    render (row, index) {
      return h(
        NButton,
        {
          size: 'tiny',
          type: 'error',
          quaternary: true,
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
    range: '',
    conc_min: '',
    conc_max: '',
    conc_repr: ''
  })
}

function removeCompositionRow (idx) {
  compositionRows.value.splice(idx, 1)
}

/* 4) 물리·화학적 특성 */
const physicalForm = reactive({
  appearance: '',
  color_odor: '',
  ph: '',
  boiling_point: '',
  flash_point: '',
  etc: ''
})

/* 5) 상세 조회 & 매핑 */
async function fetchDetail () {
  if (!props.doc || !props.doc.id) return
  loading.value = true

  try {
    const resp = await axios.get(
      `${API_BASE_URL}/msds/${props.doc.id}/manage`
    )
    const data = resp.data || {}

    // document
    if (data.document) {
      const d = data.document
      basicForm.chem_name = d.chem_name || ''
      basicForm.vendor_name = d.vendor_name || ''
      basicForm.cas_no = d.cas_no || ''
      basicForm.msds_no = d.msds_no || ''
      basicForm.version_no = d.version_no || ''
      basicForm.revision_date = d.revision_date || null
    } else {
      basicForm.chem_name = ''
      basicForm.vendor_name = ''
      basicForm.cas_no = ''
      basicForm.msds_no = ''
      basicForm.version_no = ''
      basicForm.revision_date = null
    }

    // hazard
    if (data.hazard) {
      const h = data.hazard
      hazardForm.signal_word = h.signal_word || ''
      hazardForm.pictograms =
        Array.isArray(h.pictograms) ? h.pictograms.join(', ') : (h.pictograms || '')
      hazardForm.h_codes =
        Array.isArray(h.h_codes) ? h.h_codes.join(', ') : (h.h_codes || '')
      hazardForm.p_codes =
        Array.isArray(h.p_codes) ? h.p_codes.join(', ') : (h.p_codes || '')
    } else {
      hazardForm.signal_word = ''
      hazardForm.pictograms = ''
      hazardForm.h_codes = ''
      hazardForm.p_codes = ''
    }

    // composition
    if (Array.isArray(data.composition)) {
      compositionRows.value = data.composition.map((c, idx) => {
        const min = c.conc_min ?? c.min ?? null
        const max = c.conc_max ?? c.max ?? null
        return {
          id: c.id ?? idx,
          name: c.name || c.chem_name || c.component_name || '',
          cas_no: c.cas_no || c.cas || '',
          conc_min: min ?? '',
          conc_max: max ?? '',
          conc_repr:
            c.conc_repr ??
            (min != null && max != null
              ? (Number(min) + Number(max)) / 2
              : ''),
          range:
            c.range ||
            (min != null && max != null ? `${min}-${max}` : '')
        }
      })
    } else {
      compositionRows.value = []
    }

    // physical (객체 또는 배열 둘 다 처리)
    let pRaw =
      data.physical ||
      data.physical_property ||
      data.physical_properties ||
      null

    if (Array.isArray(pRaw)) {
      pRaw = pRaw[0] || null
    }

    if (pRaw) {
      physicalForm.appearance = pRaw.appearance || ''
      physicalForm.color_odor = pRaw.color_odor || ''
      physicalForm.ph = pRaw.ph || ''
      physicalForm.boiling_point = pRaw.boiling_point || ''
      physicalForm.flash_point = pRaw.flash_point || ''
      physicalForm.etc = pRaw.etc || ''
    } else {
      physicalForm.appearance = ''
      physicalForm.color_odor = ''
      physicalForm.ph = ''
      physicalForm.boiling_point = ''
      physicalForm.flash_point = ''
      physicalForm.etc = ''
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

/* Drawer 열릴 때마다 재조회 */
watch(
  () => props.show,
  (visible) => {
    if (visible && props.doc?.id) {
      activeTab.value = 'basic'
      fetchDetail()
    }
  }
)

/* 6) 저장 */
async function handleSave () {
  if (!props.doc || !props.doc.id) return

  const payload = {
    document: {
      chem_name: basicForm.chem_name,
      vendor_name: basicForm.vendor_name,
      cas_no: basicForm.cas_no,
      msds_no: basicForm.msds_no,
      revision_date: basicForm.revision_date,
      version_no: basicForm.version_no
    },
    hazard: {
      signal_word: hazardForm.signal_word || null,
      pictograms: hazardForm.pictograms,
      h_codes: hazardForm.h_codes,
      p_codes: hazardForm.p_codes
    },
    composition: compositionRows.value,
    physical: { ...physicalForm }
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

.composition-toolbar {
  margin-bottom: 8px;
  display: flex;
  justify-content: flex-end;
}
</style>
