<template>
  <!-- 메인 규제 상세 모달 -->
  <n-modal
    class="shms-regul-modal"
    :show="show"
    preset="card"
    :title="regulModalTitle"
    :style="{ width: '2000px', maxWidth: '90vw' }"
    @update:show="val => emit('update:show', val)"
  >
    <n-spin :show="regulLoading">
      <div v-if="regulError" class="regul-error">
        {{ regulError }}
      </div>

      <template v-else>
        <div v-if="regulSection" class="modal-body">
          <!-- 상단 구성 성분 목록 -->
          <section class="section-card-top composition-card">
            <header class="section-header">
              <div>
                <h3 class="section-title">구성 성분 목록</h3>
                <p class="section-subtitle">
                  출처: MSDS 3섹션 / 15섹션
                </p>
              </div>
            </header>

            <n-data-table
              size="small"
              :columns="compositionColumns"
              :data="compositionRows"
              :bordered="false"
              :single-line="false"
              :max-height="180"
              class="composition-table"
            />
          </section>

          <!-- 하단 3열 그리드 -->
          <section class="section-grid">
            <!-- 1) 법적 규제현황 -->
            <div class="section-card">
              <header class="section-header">
                <div>
                  <h3 class="section-title">법적 규제현황</h3>
                  <p class="section-subtitle">출처: MSDS 15섹션</p>
                </div>
              </header>

              <n-scrollbar class="law-scroll">
                <ul class="law-list">
                  <li
                    v-for="(item, idx) in lawItems"
                    :key="idx"
                    class="law-item"
                  >
                    <div class="law-title">{{ item.title }}</div>
                    <div
                      v-for="(line, i2) in item.lines"
                      :key="i2"
                      class="law-desc"
                    >
                      {{ line }}
                    </div>
                  </li>
                </ul>
              </n-scrollbar>
            </div>

            <!-- 2) SHMS 규제대상 항목 -->
            <div class="section-card">
              <header class="section-header">
                <div>
                  <h3 class="section-title">
                    SHMS 규제대상 항목
                    <span
                      v-if="shmsRegulList.length"
                      class="shms-badge"
                    >
                      연동됨 ({{ shmsRegulList.length }}종)
                    </span>
                    <span
                      v-else
                      class="shms-badge shms-badge--empty"
                    >
                      연동 데이터 없음
                    </span>
                  </h3>
                  <p class="section-subtitle">
                    규제대상 항목을 선택하면 오른쪽에 추가됩니다.
                    숫자(개수)를 클릭하면 해당 규제에 포함된 구성성분이
                    별도 창으로 표시됩니다.
                  </p>
                </div>
              </header>

              <div v-if="shmsRegulGrouped.length" class="shms-groups">
                <div
                  v-for="group in shmsRegulGrouped"
                  :key="group.billCode"
                  class="shms-group"
                >
                  <div class="shms-group-title">
                    {{ group.billName || '기타 법령' }}
                  </div>

                  <div class="shms-list">
                    <button
                      v-for="item in group.items"
                      :key="item.key"
                      type="button"
                      class="shms-item"
                      :class="{ active: selectedRegulKeys.includes(item.key) }"
                      @click="toggleRegul(item)"
                    >
                      <div class="shms-name-wrap">
                        <span class="shms-name">{{ item.name }}</span>
                        <span
                          v-if="item.billName"
                          class="shms-bill-pill"
                        >
                          {{ item.billName }}
                        </span>
                      </div>
                      <!-- 숫자 pill → proxy 모달 -->
                      <span
                        class="shms-count-pill"
                        @click.stop="openRegulProxy(item)"
                      >
                        {{ item.count }}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="empty-text">
                연동된 규제대상 항목이 없습니다.
              </div>
            </div>

            <!-- 3) 선택된 규제대상 항목 + SHMS 연동 버튼 -->
            <div class="section-card section-card-right">
              <header class="section-header">
                <h3 class="section-title">
                  선택된 규제대상 항목
                  <span class="selected-count-badge">
                    {{ selectedReguls.length }}개
                  </span>
                </h3>
              </header>

              <div class="selected-block selected-block--list">
                <template v-if="selectedReguls.length">
                  <div
                    v-for="item in selectedReguls"
                    :key="item.key"
                    class="selected-row"
                  >
                    <div class="selected-dot"></div>
                    <div class="selected-main">
                      <div class="selected-name">
                        {{ item.name }}
                      </div>
                      <div class="selected-meta">
                        <span v-if="item.billName" class="selected-meta-bill">
                          {{ item.billName }}
                        </span>
                        <span class="selected-meta-count">
                          구성성분 {{ item.count }}개
                        </span>
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else class="empty-text">
                  가운데 SHMS 규제대상 항목을 클릭하면 선택 목록에 추가됩니다.
                </div>
              </div>

              <!-- 오른쪽 카드 하단에 고정되는 버튼 -->
              <div class="actions actions-fixed">
                <n-button type="primary" size="small">
                  SHMS 연동
                </n-button>
              </div>
            </div>
          </section>
        </div>

        <div v-else class="regul-empty">
          이 문서에는 섹션 15(법적 규제) 섹션이 없거나 저장되어 있지 않습니다.
        </div>
      </template>
    </n-spin>
  </n-modal>

  <!-- 규제대상 항목별 구성성분 proxy 모달 -->
  <n-modal
    v-model:show="showProxy"
    preset="card"
    class="regul-proxy-modal"
    :style="{ width: '780px', maxWidth: '90vw' }"
  >
    <template #header>
      <div class="proxy-header">
        <div class="proxy-title">
          규제대상 항목별 구성성분
        </div>
        <div v-if="currentRegulForComponents" class="proxy-subtitle">
          {{ currentRegulForComponents.name }}
          <span v-if="currentRegulForComponents.billName">
            · {{ currentRegulForComponents.billName }}
          </span>
          <span class="proxy-count-pill">
            {{ currentRegulComponents.length }}개
          </span>
        </div>
      </div>
    </template>

    <div class="proxy-body">
      <div
        v-if="currentRegulComponents.length"
        class="proxy-component-list"
      >
        <div
          v-for="comp in currentRegulComponents"
          :key="comp.cas_no || comp.name"
          class="proxy-component-card"
        >
          <div class="proxy-component-name">
            {{ comp.name }}
            <span v-if="comp.eng_name">({{ comp.eng_name }})</span>
          </div>
          <div class="proxy-component-cas">
            CAS No. {{ comp.cas_no || '-' }}
          </div>
          <div class="proxy-component-values">
            <span class="proxy-val">
              대표값:
              <strong>{{ comp.repr_display }}</strong>
            </span>
            <span class="proxy-val" v-if="comp.threshold_display">
              정량값:
              <strong>{{ comp.threshold_display }}</strong>
            </span>
            <span
              class="proxy-status"
              :class="{
                'status-on': comp.is_regulated,
                'status-off': comp.is_regulated === false
              }"
            >
              {{ comp.status_label }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="proxy-empty">
        선택한 규제대상 항목에 매핑된 구성성분이 없습니다.
      </div>
    </div>
  </n-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import {
  NModal,
  NSpin,
  NScrollbar,
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

const emit = defineEmits(['update:show'])

const regulLoading = ref(false)
const regulError = ref('')
const regulDetail = ref(null)

const showProxy = ref(false)
const currentRegulForComponents = ref(null)

const regulModalTitle = computed(() => {
  if (!props.doc) return 'SHMS 규정 관리'
  const name = props.doc.chem_name || props.doc.file_name || ''
  return name ? `SHMS 규정 관리 - ${name}` : 'SHMS 규정 관리'
})

const regulSection = computed(() => {
  if (!regulDetail.value || !Array.isArray(regulDetail.value.sections)) return null
  return (
    regulDetail.value.sections.find(
      (sec) => Number(sec.section_num) === 15
    ) || null
  )
})

function getCompositionSource () {
  const d = regulDetail.value
  return (d && (d.composition || d.components || d.common_components)) || []
}

/* ------------ 상단 구성성분 테이블 ------------ */
const compositionColumns = [
  { title: '물질명', key: 'name', minWidth: 160 },
  { title: 'CAS No.', key: 'cas_no', width: 140 },
  { title: '함유량', key: 'range', width: 120 },
  { title: '상한', key: 'upper', width: 80 },
  { title: '하한', key: 'lower', width: 80 },
  { title: '대표값', key: 'repr', width: 80 }
]

const compositionRows = computed(() => {
  const src = getCompositionSource()

  if (Array.isArray(src) && src.length) {
    return src.map((c, idx) => {
      const min = c.min ?? c.lower ?? c.conc_min ?? c.conc_low ?? null
      const max = c.max ?? c.upper ?? c.conc_max ?? c.conc_high ?? null
      const repr =
        c.repr ??
        c.conc_repr ??
        (min != null && max != null ? (Number(min) + Number(max)) / 2 : null)

      return {
        id: c.id ?? idx,
        name: c.name || c.chem_name || c.component_name || '',
        cas_no: c.cas_no || c.cas || c.cas_no_text || '',
        range:
          c.range ||
          c.conc_range ||
          (min != null && max != null ? `${min}-${max}` : ''),
        upper: max,
        lower: min,
        repr
      }
    })
  }

  return []
})

/* ------------ 법적 규제 원문 ------------ */
function parseLawItems (text) {
  if (!text) return []

  const blocks = text
    .split(/\n{2,}/)
    .map(t => t.trim())
    .filter(Boolean)

  return blocks.map((block, idx) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    const title = lines[0] || `항목 ${idx + 1}`
    return {
      title,
      lines: lines.slice(1)
    }
  })
}

const lawItems = computed(() => {
  return regulSection.value
    ? parseLawItems(regulSection.value.content || regulSection.value.text || '')
    : []
})

/* ------------ SHMS 규제대상 항목 리스트 ------------ */
const shmsRegulList = computed(() => {
  const fromApi = regulDetail.value && regulDetail.value.shms_regulations
  if (Array.isArray(fromApi) && fromApi.length) {
    return fromApi.map((item, idx) => ({
      key: item.key || `api-${idx}`,
      name: item.name || item.title || `항목 ${idx + 1}`,
      count: item.count != null
        ? item.count
        : (Array.isArray(item.items) ? item.items.length : 0),
      billCode: item.bill_code || '',
      billName: item.bill_name || '',
      items: item.items || []
    }))
  }

  return []
})

/* 법규(법령)별 그룹핑 */
const shmsRegulGrouped = computed(() => {
  const list = shmsRegulList.value
  if (!list.length) return []

  const map = new Map()
  list.forEach(item => {
    const key = item.billCode || 'UNKNOWN'
    const name = item.billName || '기타 법령'
    if (!map.has(key)) {
      map.set(key, {
        billCode: key,
        billName: name,
        items: []
      })
    }
    map.get(key).items.push(item)
  })

  return Array.from(map.values())
})

const selectedRegulKeys = ref([])

function toggleRegul (item) {
  const key = item.key
  const idx = selectedRegulKeys.value.indexOf(key)
  if (idx >= 0) {
    selectedRegulKeys.value.splice(idx, 1)
  } else {
    selectedRegulKeys.value.push(key)
  }
}

const selectedReguls = computed(() =>
  shmsRegulList.value.filter(item =>
    selectedRegulKeys.value.includes(item.key)
  )
)

/* ------------ 규제대상 항목별 구성성분 (proxy 모달) ------------ */
const currentRegulComponents = computed(() => {
  const regul = currentRegulForComponents.value
  if (!regul) return []

  const items = regul.items || []
  if (!items.length) return []

  const rows = compositionRows.value || []
  const compMap = {}
  rows.forEach(r => {
    const cas = (r.cas_no || '').trim()
    if (cas && !compMap[cas]) {
      compMap[cas] = r
    }
  })

  return items.map(it => {
    const cas = (it.cas_no || '').trim()
    const base = compMap[cas] || {}

    const repr = base.repr != null ? Number(base.repr) : null
    const thresholdType = it.threshold_type || it.thresholdType || null
    const thresholdVal =
      it.threshold_value !== null && it.threshold_value !== undefined
        ? Number(it.threshold_value)
        : null

    let isRegulated = null
    let statusLabel = ''
    let compareLabel = ''

    if (thresholdType === 'EXIST_ONLY') {
      // 존재만으로 규제
      isRegulated = true
      statusLabel = '규제 해당 (존재형)'
    } else if (thresholdType === 'NO_THRESHOLD') {
      // 기준값이 없는 타입
      isRegulated = true
      statusLabel = '규제 해당 (정량값 없음)'
    } else if (thresholdVal == null || repr == null) {
      isRegulated = null
      statusLabel = '판정 불가'
    } else {
      if (repr >= thresholdVal) {
        isRegulated = true
        statusLabel = '규제 해당'
        compareLabel = '대표값 ≥ 정량값'
      } else {
        isRegulated = false
        statusLabel = '비해당'
        compareLabel = '대표값 < 정량값'
      }
    }

    // 화면에 보여줄 문자열
    const reprDisplay = repr != null ? String(repr) : '-'
    let thresholdDisplay = ''
    if (thresholdVal != null) {
      thresholdDisplay = String(thresholdVal)
    } else if (thresholdType === 'EXIST_ONLY') {
      thresholdDisplay = '기준 없음(존재형)'
    } else if (thresholdType === 'NO_THRESHOLD') {
      thresholdDisplay = '-'
    } else {
      thresholdDisplay = '미등록'
    }

    return {
      name: base.name || it.name || '',
      eng_name: base.eng_name || '',
      cas_no: cas,
      repr,
      repr_display: reprDisplay,
      threshold_type: thresholdType,
      threshold_value: thresholdVal,
      threshold_display: thresholdDisplay,
      compare_label: compareLabel,
      status_label: statusLabel,
      is_regulated: isRegulated
    }
  })
})

function openRegulProxy (item) {
  currentRegulForComponents.value = item
  showProxy.value = true
}

/* ------------ SHMS 연동용 데이터 fetch ------------ */
async function fetchShmsByCasList () {
  try {
    const src = getCompositionSource()

    const casList = (src || [])
      .map(c => (c.cas_no || c.cas || c.cas_no_text || '').trim())
      .filter(Boolean)

    if (!casList.length) {
      if (!regulDetail.value) regulDetail.value = {}
      regulDetail.value.shms_regulations = []
      regulDetail.value.common_components = []
      return
    }

    const qs = new URLSearchParams()
    casList.forEach(cas => {
      qs.append('cas_no', cas)
    })

    const resp = await axios.get(
      `${API_BASE_URL}/shms/regulations/by-cas?${qs.toString()}`
    )

    const data = resp.data || {}
    const shmsRegs = data.shms_regulations || []
    const regulatedCas = new Set(data.regulated_cas || [])

    if (!regulDetail.value) regulDetail.value = {}
    regulDetail.value.shms_regulations = shmsRegs

    const common = (src || []).filter(c => {
      const cas = (c.cas_no || c.cas || c.cas_no_text || '').trim()
      return cas && regulatedCas.has(cas)
    })
    regulDetail.value.common_components = common
  } catch (err) {
    console.error(err)
    if (!regulDetail.value) regulDetail.value = {}
    regulDetail.value.shms_regulations = []
    regulDetail.value.common_components = []
  }
}

/* ------------ 상세 조회 ------------ */
async function fetchDetail () {
  if (!props.doc || !props.doc.id) return
  regulLoading.value = true
  regulError.value = ''
  regulDetail.value = null
  selectedRegulKeys.value = []
  showProxy.value = false
  currentRegulForComponents.value = null

  try {
    const resp = await axios.get(
      `${API_BASE_URL}/msds/${props.doc.id}/detail`
    )
    regulDetail.value = resp.data
    await fetchShmsByCasList()
  } catch (err) {
    console.error(err)
    regulError.value =
      '규제사항 상세 정보를 불러오는 중 오류가 발생했습니다. 백엔드 로그를 확인해 주세요.'
  } finally {
    regulLoading.value = false
  }
}

watch(
  () => [props.show, props.doc && props.doc.id],
  ([visible, id]) => {
    if (visible && id) {
      fetchDetail()
    }
    if (!visible) {
      regulDetail.value = null
      regulError.value = ''
      selectedRegulKeys.value = []
      showProxy.value = false
      currentRegulForComponents.value = null
    }
  }
)
</script>

<style scoped>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

* {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    system-ui, -apple-system, sans-serif;
}

.shms-regul-modal :deep(.n-card) {
  height: 92vh;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
}

.shms-regul-modal :deep(.n-card__content) {
  flex: 1;
  overflow: auto;
}

/* 전체 레이아웃 */
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 공통 섹션 카드 */
.section-card-top {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  padding: 12px 14px 14px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
  height: 300px;
}

.section-card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  padding: 12px 14px 14px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  min-height: 260px;
  max-height: 700px;
}

/* 오른쪽 카드: 버튼 고정 위해 column flex */
.section-card-right {
  display: flex;
  flex-direction: column;
}

/* 섹션 헤더 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.section-subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: #9ca3af;
}

/* 테이블 */
.composition-table :deep(.n-data-table-th) {
  background: #f3f4f6;
  font-size: 12px;
}

.composition-table :deep(.n-data-table-td) {
  font-size: 12px;
}

/* 하단 3열 그리드 */
.section-grid {
  display: grid;
  grid-template-columns: 1.4fr 1.1fr 1.1fr;
  gap: 16px;
}

/* 법적 규제 스크롤 */
.law-scroll {
  flex: 1;
  max-height: 100%;
}

.law-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.law-item + .law-item {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

.law-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 3px;
  color: #111827;
}

.law-desc {
  font-size: 12px;
  color: #4b5563;
}

.law-title,
.law-desc {
  white-space: pre-wrap;
  word-break: break-word;
}

/* SHMS 규제대상 항목 리스트 (법규 그룹) */
.shms-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shms-group {
  padding-bottom: 6px;
  border-bottom: 1px dashed #e5e7eb;
}

.shms-group:last-child {
  border-bottom: none;
}

.shms-group-title {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
}

/* 항목 리스트 */
.shms-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shms-item {
  width: 100%;
  text-align: left;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s ease, box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.shms-item:hover {
  background: #f3f4ff;
  border-color: #c7d2fe;
}

.shms-item.active {
  background: #e0f2fe;
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.5);
}

.shms-name-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shms-name {
  flex: 1;
}

.shms-bill-pill {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  max-width: 100%;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

/* 숫자 pill (proxy 열기 버튼 느낌 강화) */
.shms-count-pill {
  min-width: 40px;
  height: 26px;
  padding: 0 12px;
  margin-left: 8px;
  border-radius: 999px;
  border: 1px solid #1d4ed8;
  background: #2563eb;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.35);
  transform: translateY(0);
  transition:
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.05s ease,
    border-color 0.15s ease;
}

.shms-count-pill:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
  box-shadow: 0 3px 6px rgba(37, 99, 235, 0.45);
}

.shms-count-pill:active {
  transform: translateY(1px) scale(0.97);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.35);
}

/* SHMS 연동 배지 */
.shms-badge {
  margin-left: 6px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 10px;
  background: #dcfce7;
  color: #166534;
}

.shms-badge--empty {
  background: #fee2e2;
  color: #b91c1c;
}

/* 선택된 규제대상 항목 리스트 */
.selected-count-badge {
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: #eff6ff;
  color: #1d4ed8;
}

.selected-block {
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  margin-bottom: 8px;
}

/* column list 스타일 */
.selected-block--list {
  flex: 1;
  overflow: auto;
}

.selected-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 6px 4px;
}

.selected-row + .selected-row {
  border-top: 1px solid #e5e7eb;
}

.selected-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #22c55e;
  margin-top: 6px;
}

.selected-main {
  flex: 1;
}

.selected-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.selected-meta {
  margin-top: 2px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 11px;
  color: #6b7280;
}

.selected-meta-bill {
  padding: 1px 6px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
}

.selected-meta-count {
  padding: 1px 6px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #15803d;
}

/* SHMS 연동 버튼 고정 */
.actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.actions-fixed {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

/* 기타 */
.empty-text {
  font-size: 12px;
  color: #6b7280;
}

.regul-error {
  font-size: 13px;
  color: #d03050;
}

.regul-empty {
  font-size: 13px;
  color: #6b7280;
}

/* proxy 모달 스타일 */
.regul-proxy-modal :deep(.n-card__content) {
  max-height: 70vh;
  overflow: auto;
}

.proxy-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.proxy-title {
  font-size: 15px;
  font-weight: 600;
}

.proxy-subtitle {
  font-size: 12px;
  color: #4b5563;
  display: flex;
  align-items: center;
  gap: 6px;
}

.proxy-count-pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
}

.proxy-body {
  padding-top: 4px;
}

.proxy-component-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.proxy-component-card {
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  background: #f9fafb;
}

.proxy-component-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.proxy-component-cas {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}

.proxy-component-values {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  color: #4b5563;
}

.proxy-val strong {
  font-weight: 600;
}

.proxy-compare {
  padding: 2px 6px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
}

.proxy-status.status-on {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

.proxy-status.status-off {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}

.proxy-empty {
  font-size: 12px;
  color: #6b7280;
}
</style>
