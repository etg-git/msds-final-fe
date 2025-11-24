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
          <!-- 2열 레이아웃 (왼쪽: 구성성분 + 법적 규제 / 오른쪽: SHMS + 선별 항목) -->
          <section class="layout-2col">
            <!-- 왼쪽 컬럼 -->
            <div class="col-left">
              <!-- 구성 성분 목록 -->
              <section class="section-card composition-card">
                <header class="section-header section-header-main">
                  <div>
                    <h3 class="section-title">구성 성분 목록</h3>
                    <p class="section-subtitle">
                      출처: MSDS 3섹션
                    </p>
                  </div>
                  <div class="section-meta">
                    <span class="section-meta-pill">
                      총 {{ compositionRows.length }}개 성분
                    </span>
                  </div>
                </header>

                <!-- 테이블 자체 스크롤 -->
                <n-data-table
                  size="small"
                  :columns="compositionColumns"
                  :data="compositionRows"
                  :bordered="false"
                  :single-line="false"
                  :max-height="260"
                  class="composition-table"
                />
              </section>

              <!-- 법적 규제 현황 -->
              <div class="section-card law-card">
                <header class="section-header">
                  <div>
                    <h3 class="section-title">법적 규제 현황</h3>
                    <p class="section-subtitle">
                      출처: MSDS 15섹션 원문
                    </p>
                  </div>
                </header>

                <!-- 카드 안에서만 스크롤 -->
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
            </div>

            <!-- 오른쪽 컬럼 -->
            <div class="col-right">
              <!-- SHMS 규제대상 항목 목록 -->
              <div class="section-card shms-card">
                <header class="section-header">
                  <div>
                    <h3 class="section-title">
                      SHMS 규제대상 항목 목록
                      <span
                        v-if="shmsRegulList.length"
                        class="shms-badge"
                      >
                        연동됨 {{ shmsRegulList.length }}종
                      </span>
                      <span
                        v-else
                        class="shms-badge shms-badge--empty"
                      >
                        연동 데이터 없음
                      </span>
                    </h3>
                    <p class="section-subtitle">
                      구성성분의 CAS No. 기준으로 SHMS 규제 정보를 연동합니다.
                      규제대상 항목 우측의 숫자를 클릭하면,
                      해당 규제에 포함된 구성성분을 별도 창에서 확인할 수 있습니다.
                    </p>
                  </div>
                </header>

                <!-- 카드 안 스크롤 되는 리스트 -->
                <div v-if="shmsGroupedList.length" class="shms-groups-scroll">
                  <div
                    v-for="group in shmsGroupedList"
                    :key="group.billName || '기타'"
                    class="shms-group"
                  >
                    <div class="shms-group-header">
                      <span class="shms-group-bill">
                        {{ group.billName || '기타 법규' }}
                      </span>
                      <span class="shms-group-count">
                        {{ group.items.length }}개 항목
                      </span>
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
                  구성성분 CAS No. 기준 SHMS 규제 연동 결과가 없습니다.
                </div>
              </div>

              <!-- 선별된 규제대상 항목 -->
              <div class="section-card section-card-right">
                <header class="section-header">
                  <div>
                    <h3 class="section-title">
                      선별된 규제대상 항목
                      <span class="selected-count-badge">
                        {{ selectedReguls.length }}개
                      </span>
                    </h3>
                    <p class="section-subtitle">
                      실제 SHMS에 반영할 규제대상 항목만 선택해 관리합니다.
                    </p>
                  </div>
                </header>

                <div class="selected-block selected-block--tags">
                  <template v-if="selectedReguls.length">
                    <div class="selected-tag-wrap">
                      <span
                        v-for="item in selectedReguls"
                        :key="item.key"
                        class="selected-tag"
                      >
                        <span class="selected-tag-name">
                          {{ item.name }}
                        </span>
                        <span class="selected-tag-meta">
                          {{ item.billName || '법규 미지정' }} ·
                          구성성분 {{ item.count }}개
                        </span>
                      </span>
                    </div>
                  </template>
                  <div v-else class="empty-text">
                    위쪽 SHMS 규제대상 항목을 클릭하면
                    이 영역에 선별 목록으로 추가됩니다.
                  </div>
                </div>

                <!-- 오른쪽 카드 하단에 고정되는 버튼 -->
                <div class="actions actions-fixed">
                  <n-button type="primary" size="small">
                    SHMS 연동
                  </n-button>
                </div>
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
    :style="{ width: '720px', maxWidth: '90vw' }"
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
          <div class="proxy-component-main">
            <div class="proxy-component-name">
              {{ comp.name }}
              <span v-if="comp.eng_name">({{ comp.eng_name }})</span>
            </div>
            <div class="proxy-component-cas">
              CAS No. {{ comp.cas_no || '-' }}
            </div>
          </div>

          <div class="proxy-component-values">
            <span class="proxy-val">
              대표값:
              <strong>{{ comp.repr_display }}</strong>
            </span>
            <span class="proxy-val">
              정량값:
              <strong>{{ comp.threshold_display }}</strong>
            </span>
            <span
              v-if="comp.compare_label"
              class="proxy-compare"
            >
              {{ comp.compare_label }}
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
import { ref, watch, computed, h } from 'vue'
import axios from 'axios'
import {
  NModal,
  NSpin,
  NScrollbar,
  NButton,
  NDataTable
} from 'naive-ui'

const API_BASE_URL =
  import.meta.env.VITE_MSDS_BACKEND_URL || 'http://localhost:8000'

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

// 규제사항 셀에서 어떤 CAS가 선택됐는지
const selectedRegulCas = ref('')

const regulModalTitle = computed(() => {
  if (!props.doc) return 'SHMS 규제검증'
  const name = props.doc.chem_name || props.doc.file_name || ''
  return name ? `SHMS 규제검증 관리 - ${name}` : 'SHMS 규제검증 관리'
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

/* ------------ SHMS 규제대상 항목 리스트 (flat) ------------ */
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

/* ------------ CAS별 규제 목록 맵 ------------ */
// { '64742-47-8': [ { key, name, billName }, ... ] } 형태
const casRegulMap = computed(() => {
  const map = {}
  const regs = shmsRegulList.value || []

  regs.forEach(reg => {
    const billName = reg.billName || ''
    const name = reg.name || ''
    ;(reg.items || []).forEach(it => {
      const cas = (it.cas_no || '').trim()
      if (!cas) return
      if (!map[cas]) map[cas] = []
      map[cas].push({
        key: reg.key,
        name,
        billName
      })
    })
  })

  return map
})

/* ------------ 법규별 그룹 ------------ */
const shmsGroupedList = computed(() => {
  const src = shmsRegulList.value
  const map = {}
  const groups = []

  src.forEach(item => {
    const key = item.billName || '기타'
    if (!map[key]) {
      map[key] = {
        billName: item.billName || '기타 법규',
        items: []
      }
      groups.push(map[key])
    }
    map[key].items.push(item)
  })

  return groups
})

/* ------------ 상단 구성성분 테이블 ------------ */
function onClickRegulCell (cas) {
  selectedRegulCas.value = cas
  // 나중에 CAS 단위 proxy 모달 붙일 거면 여기에서 열면 됨
  // e.g. openCasProxy(cas)
}

const compositionColumns = computed(() => [
  { title: '물질명', key: 'name', minWidth: 160 },
  { title: 'CAS No.', key: 'cas_no', width: 140 },
  { title: '함유량', key: 'range', width: 120 },
  { title: '상한', key: 'upper', width: 80 },
  { title: '하한', key: 'lower', width: 80 },
  { title: '대표값', key: 'repr', width: 80 },
  {
    title: '규제사항',
    key: 'reguls',
    width: 260,
    render (row) {
      const cas = (row.cas_no || '').trim()
      const regs = casRegulMap.value[cas] || []

      if (!regs.length) {
        return h('span', { class: 'regul-cell-empty' }, '없음')
      }

      // 법규명은 빼고, 규제항목 이름만 콤마로
      const label = regs.map(reg => reg.name).join(', ')
      const isActive = selectedRegulCas.value === cas

      return h(
        'div',
        {
          class: ['regul-cell', isActive ? 'regul-cell-active' : ''],
          onClick: () => onClickRegulCell(cas)
        },
        [
          h('span', { class: 'regul-cell-text', title: label }, label)
        ]
      )
    }
  }
])

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

/* ------------ 선택된 규제대상 항목 ------------ */
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
      isRegulated = true
      statusLabel = '규제 해당 (존재형)'
    } else if (thresholdType === 'NO_THRESHOLD') {
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

    const reprDisplay = repr != null ? String(repr) : '-'
    let thresholdDisplay = ''
    if (thresholdVal != null) {
      thresholdDisplay = String(thresholdVal)
    } else if (thresholdType === 'EXIST_ONLY') {
      thresholdDisplay = '정량값 없음(존재형)'
    } else if (thresholdType === 'NO_THRESHOLD') {
      thresholdDisplay = '정량값 없음'
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
  selectedRegulCas.value = ''
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
      selectedRegulCas.value = ''
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

/* 모달 카드: 높이 살짝 낮춤 */
.shms-regul-modal :deep(.n-card) {
  height: 88vh;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
}


.shms-regul-modal :deep(.n-card__content) {
  flex: 1;
  overflow: hidden; /* 안에서 각 카드가 스크롤 */
}

/* 전체 레이아웃 */
.modal-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 2열 레이아웃 */
.layout-2col {
  flex: 1;
  display: grid;
  /* 왼쪽 카드 조금 더 넓게 */
  grid-template-columns: minmax(0, 2.6fr) minmax(0, 1fr);
  gap: 16px;
}

.col-left,
.col-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 공통 카드 */
.section-card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  padding: 12px 14px 14px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
}

/* 구성성분 카드: 왼쪽 상단, 조금 크게 */
.composition-card {
  flex: 1.1;
  max-height: 370px;
}

/* 법적 규제 현황: 상대적으로 낮게 */
.law-card {
  flex: 0.9;
  min-height: 180px;
  max-height: 680px;
  display: flex;
  flex-direction: column;
}

/* 오른쪽: SHMS 카드 더 크게, 선별카드는 약간 작게 */
.shms-card {
  flex: 1.15;
  min-height: 220px;
  display: flex;
  flex-direction: column;
}

.section-card-right {
  flex: 0.95;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

/* 섹션 헤더 */
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-header-main {
  align-items: center;
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

.section-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-meta-pill {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: #eff6ff;
  color: #1d4ed8;
}

/* 테이블 */
.composition-table :deep(.n-data-table-th) {
  background: #f3f4f6;
  font-size: 12px;
}

.composition-table :deep(.n-data-table-td) {
  font-size: 12px;
}

/* 법적 규제 스크롤 (카드 안에서만) */
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

/* SHMS 카드 내부 스크롤 */
.shms-groups-scroll {
  flex: 1;
  overflow: auto;
  padding-right: 4px;
}

.shms-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shms-group {
  padding-top: 4px;
  border-top: 1px dashed #e5e7eb;
}

.shms-group:first-child {
  border-top: none;
}

.shms-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.shms-group-bill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
}

.shms-group-count {
  font-size: 11px;
  color: #6b7280;
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

/* SHMS 규제대상 항목 버튼 리스트 */
.shms-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
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

/* 숫자 pill (proxy 열기 버튼) */
.shms-count-pill {
  min-width: 36px;
  height: 24px;
  padding: 0 10px;
  margin-left: 8px;
  border-radius: 999px;
  border: 1px solid #22c55e;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.05s ease,
    border-color 0.15s ease;
}

.shms-count-pill:hover {
  background: #bbf7d0;
  border-color: #16a34a;
}

.shms-count-pill:active {
  transform: translateY(1px) scale(0.97);
}

/* 선별된 규제대상 항목 */
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

.selected-block--tags {
  flex: 1;
  overflow: auto; /* 카드 안 스크롤 */
}

.selected-tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.selected-tag {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  max-width: 100%;
}

.selected-tag-name {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}

.selected-tag-meta {
  font-size: 11px;
  color: #6b7280;
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
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  margin-top: 4px;
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

.proxy-status {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #4b5563;
}

.proxy-status.status-on {
  background: #dcfce7;
  border-color: #16a34a;
  color: #166534;
}

.proxy-status.status-off {
  background: #fee2e2;
  border-color: #b91c1c;
  color: #b91c1c;
}

.proxy-empty {
  font-size: 12px;
  color: #6b7280;
}

/* 구성성분 테이블 내 규제사항 셀 */
.regul-cell {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  cursor: pointer;
}

.regul-cell-text {
  font-size: 12px;
  color: #374151;
  padding: 2px 4px;
  border-radius: 4px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.regul-cell:hover .regul-cell-text {
  background: #eef2ff;
  color: #4f46e5;
}

.regul-cell-active .regul-cell-text {
  background: #e0f2fe;
  color: #0369a1;
}

/* 규제 없음 셀 */
.regul-cell-empty {
  font-size: 11px;
  color: #9ca3af;
}
</style>
