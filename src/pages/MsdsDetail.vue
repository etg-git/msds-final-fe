<template>
  <div class="page" v-if="detail && !loading">
    <!-- 섹션별 상세 -->
    <n-card class="sections-card" :bordered="false">
      <div class="sections-header">
        <div class="sections-title">섹션별 상세</div>

        <!-- 오른쪽: 저장 버튼 + 이전/다음 내비게이션 -->
        <div class="sections-right">
          <div class="sections-nav">
            <n-button
              size="tiny"
              tertiary
              @click="goPrevTab"
              :disabled="activeTab <= 1"
            >
              ‹ 이전
            </n-button>
            <span class="sections-nav-label">
              {{ activeTab }} / 16
            </span>
            <n-button
              size="tiny"
              tertiary
              @click="goNextTab"
              :disabled="activeTab >= 16"
            >
              다음 ›
            </n-button>
          </div>
        </div>
      </div>

      <!-- 탭: 1~16 고정 -->
      <n-tabs
        type="line"
        animated
        v-model:value="activeTab"
        class="sections-tabs"
      >
        <n-tab-pane
          v-for="sec in allSections"
          :key="sec.section_num"
          :name="sec.section_num"
          :tab="tabLabel(sec)"
        >
          <div class="tab-pane-inner">
            <!-- 섹션 1: 제품/회사/주소 + 헤더 메타 요약 -->
            <template v-if="sec.section_num === 1 && detail.sec1_summary">
              <n-card
                size="small"
                class="summary-card"
                title="섹션 1. 화학제품과 회사 정보"
              >
                <n-descriptions
                  :column="6"
                  size="small"
                  label-placement="top"
                >
                  <n-descriptions-item label="제품명">
                    {{ detail.sec1_summary.product_name || '-' }}
                  </n-descriptions-item>
                  <n-descriptions-item label="회사명">
                    {{ detail.sec1_summary.company_name || '-' }}
                  </n-descriptions-item>
                  <n-descriptions-item label="주소">
                    {{ detail.sec1_summary.address || '-' }}
                  </n-descriptions-item>
                  <!-- <n-descriptions-item label="MSDS No.">
                    {{ headerMeta.msdsNo || '-' }}
                  </n-descriptions-item>
                  <n-descriptions-item label="개정일자">
                    {{ headerMeta.revisionDate || '-' }}
                  </n-descriptions-item>
                  <n-descriptions-item label="개정번호">
                    {{ headerMeta.versionNo || '-' }}
                  </n-descriptions-item>
                  <n-descriptions-item label="대표 CAS No.">
                    {{ headerMeta.casNo || '-' }}
                  </n-descriptions-item> -->
                </n-descriptions>
              </n-card>
            </template>

            <!-- 섹션 2: 유해·위험성 요약 (있을 때만) -->
            <template v-else-if="sec.section_num === 2 && detail.hazard_info">
              <n-card
                size="small"
                class="summary-card"
                title="섹션 2. 유해·위험성 요약"
              >
                <div class="sec2-row">
                  <div class="label">신호어</div>
                  <div>
                    <n-tag
                      v-if="detail.hazard_info.signal_word"
                      type="error"
                      size="small"
                    >
                      {{ detail.hazard_info.signal_word }}
                    </n-tag>
                    <span v-else class="text-muted">-</span>
                  </div>
                </div>

                <div class="sec2-row">
                  <div class="label">H코드</div>
                  <div class="tag-list">
                    <n-tag
                      v-for="code in hCodeList"
                      :key="code"
                      size="small"
                      type="warning"
                      round
                    >
                      {{ code }}
                    </n-tag>
                    <span v-if="!hCodeList.length" class="text-muted">없음</span>
                  </div>
                </div>

                <div class="sec2-row">
                  <div class="label">P코드</div>
                  <div class="tag-list">
                    <n-tag
                      v-for="code in pCodeList"
                      :key="code"
                      size="small"
                      type="success"
                      round
                    >
                      {{ code }}
                    </n-tag>
                    <span v-if="!pCodeList.length" class="text-muted">없음</span>
                  </div>
                </div>

                <div class="sec2-row">
                  <div class="label">그림문자</div>
                  <div class="pictogram-list">
                    <template v-if="pictogramList.length">
                      <div
                        v-for="g in pictogramList"
                        :key="g"
                        class="pictogram-item"
                      >
                        <img
                          v-if="pictogramImages[g]"
                          :src="pictogramImages[g]"
                          :alt="g"
                          class="pictogram-img"
                        />
                        <n-tag v-else size="small" type="default">
                          {{ g }}
                        </n-tag>
                      </div>
                    </template>
                    <span v-else class="text-muted">없음</span>
                  </div>
                </div>
              </n-card>
            </template>

            <!-- 섹션 3: 구성성분 표 (있을 때만) -->
            <template
              v-else-if="sec.section_num === 3 && detail.composition?.length"
            >
              <n-card
                size="small"
                class="summary-card"
                title="섹션 3. 구성성분 정보"
              >
                <n-data-table
                  :columns="compositionColumns"
                  :data="detail.composition"
                  :bordered="false"
                  size="small"
                />
              </n-card>
            </template>

            <!-- 섹션 9: 물리·화학적 특성 (있을 때만) -->
            <template
              v-else-if="sec.section_num === 9 && detail.physical_props?.length"
            >
              <n-card
                size="small"
                class="summary-card"
                title="섹션 9. 물리·화학적 특성"
              >
                <n-data-table
                  :columns="physicalColumns"
                  :data="detail.physical_props"
                  :bordered="false"
                  size="small"
                />
              </n-card>
            </template>

            <!-- 그 외 섹션: 구조화 요약 없음 안내 (섹션이 존재할 때만) -->
            <template v-else-if="sec.exists">
              <n-card
                size="small"
                class="summary-card"
                :title="tabLabel(sec)"
              >
                <div class="text-muted">
                  이 섹션에 대한 구조화된 요약 정보는 아직 없습니다.
                  아래 원문을 참고하세요.
                </div>
              </n-card>
            </template>

            <!-- 공통: 섹션 원문 -->
            <n-card size="small" class="section-raw-card" title="섹션 원문">
              <template v-if="sec.exists && sec.content">
                <n-scrollbar class="section-scroll">
                  <pre class="section-raw">{{ sec.content }}</pre>
                </n-scrollbar>
              </template>
              <template v-else>
                <div class="text-muted">저장된 섹션 원문이 없습니다.</div>
              </template>
            </n-card>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>

  <div v-else class="page page-loading">
    <n-spin size="large" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import axios from 'axios'
import type { DataTableColumns } from 'naive-ui'
import {
  NCard,
  NTabs,
  NTabPane,
  NDataTable,
  NScrollbar,
  NTag,
  NDescriptions,
  NDescriptionsItem,
  NSpin,
  NButton
} from 'naive-ui'
import { useRoute } from 'vue-router'

const API_BASE_URL =
  import.meta.env.VITE_MSDS_API_BASE || 'http://localhost:8000'

const props = defineProps<{
  documentId?: number | null
}>()

const emit = defineEmits<{
  (e: 'click-save', payload: any): void
}>()

const route = useRoute()
const loading = ref(false)
const detail = ref<any | null>(null)

const activeTab = ref<number>(1)

const SECTION_NAMES: Record<number, string> = {
  1: '화학제품과 회사 정보',
  2: '유해·위험성',
  3: '구성성분',
  4: '응급조치요령',
  5: '폭발·화재시 대처방법',
  6: '누출사고시 대처방법',
  7: '취급 및 저장방법',
  8: '노출방지 및 개인보호구',
  9: '물리·화학적 특성',
  10: '안정성 및 반응성',
  11: '독성에 관한 정보',
  12: '환경에 미치는 영향',
  13: '폐기시 주의사항',
  14: '운송에 필요한 정보',
  15: '법적 규제 현황',
  16: '기타 참고사항'
}

const compositionColumns: DataTableColumns<any> = [
  { title: '성분명', key: 'name' },
  { title: 'CAS No.', key: 'cas_no' },
  { title: '함유량(%)', key: 'conc_raw', align: 'right' },
  { title: '하한', key: 'conc_min', align: 'right' },
  { title: '상한', key: 'conc_max', align: 'right' },
  { title: '대표값', key: 'conc_repr', align: 'right' }
]

const physicalColumns: DataTableColumns<any> = [
  { title: '항목', key: 'item' },
  { title: '값', key: 'value' }
]

// 섹션1 회사명 (필요시 계속 사용)
const sec1Company = computed(
  () => detail.value?.sec1_summary?.company_name || ''
)

// 헤더 메타 (document 우선, 없으면 header_meta fallback)
const headerMeta = computed(() => {
  const d = detail.value || {}
  const doc = d.document || {}
  const hm = d.header_meta || {}

  return {
    msdsNo: doc.msds_no ?? doc.msdsNo ?? hm.msds_no ?? '',
    revisionDate:
      doc.revision_date ?? doc.revisionDate ?? hm.revision_date ?? '',
    versionNo: doc.version_no ?? doc.versionNo ?? hm.version_no ?? '',
    casNo: doc.cas_no ?? doc.casNo ?? hm.cas_no ?? ''
  }
})

const productTitle = computed(() => {
  const d = detail.value
  if (!d) return ''
  return (
    d.sec1_summary?.product_name ||
    d.document?.chem_name ||
    d.document?.file_name ||
    ''
  )
})

const formattedUploadedAt = computed(() => {
  if (!detail.value?.document?.uploaded_at) return ''
  return new Date(detail.value.document.uploaded_at).toLocaleString()
})

// pictogram 코드 -> 이미지 매핑
const pictogramImages: Record<string, string> = {
  GHS01: new URL('../assets/image/GHS01.gif', import.meta.url).href,
  GHS02: new URL('../assets/image/GHS02.gif', import.meta.url).href,
  GHS03: new URL('../assets/image/GHS03.gif', import.meta.url).href,
  GHS04: new URL('../assets/image/GHS04.gif', import.meta.url).href,
  GHS05: new URL('../assets/image/GHS05.gif', import.meta.url).href,
  GHS06: new URL('../assets/image/GHS06.gif', import.meta.url).href,
  GHS07: new URL('../assets/image/GHS07.gif', import.meta.url).href,
  GHS08: new URL('../assets/image/GHS08.gif', import.meta.url).href,
  GHS09: new URL('../assets/image/GHS09.gif', import.meta.url).href
}

const sectionsMap = computed<Record<number, any>>(() => {
  const map: Record<number, any> = {}
  const list = detail.value?.sections || []
  list.forEach((s: any) => {
    if (s.section_num != null) {
      map[Number(s.section_num)] = s
    }
  })
  return map
})

const allSections = computed(() => {
  const map = sectionsMap.value
  const arr: {
    section_num: number
    title: string
    content: string
    exists: boolean
  }[] = []
  for (let i = 1; i <= 16; i++) {
    const raw = map[i]
    arr.push({
      section_num: i,
      title: raw?.title || SECTION_NAMES[i] || `섹션 ${i}`,
      content: raw?.content || '',
      exists: !!raw
    })
  }
  return arr
})

function normalizeList(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean)
  }
  if (typeof val === 'string') {
    return val
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

const hCodeList = computed(() =>
  normalizeList(detail.value?.hazard_info?.h_codes)
)
const pCodeList = computed(() =>
  normalizeList(detail.value?.hazard_info?.p_codes)
)
const pictogramList = computed(() =>
  normalizeList(detail.value?.hazard_info?.pictogram_ids)
)

function tabLabel(sec: { section_num: number; title: string }) {
  return `${sec.section_num}. ${sec.title}`
}

function goPrevTab() {
  if (activeTab.value > 1) activeTab.value -= 1
}
function goNextTab() {
  if (activeTab.value < 16) activeTab.value += 1
}

function handleSaveClick() {
  if (!detail.value) return
  emit('click-save', detail.value)
}

async function fetchDetail(id: number) {
  if (!id) return
  loading.value = true
  try {
    const resp = await axios.get(`${API_BASE_URL}/msds/${id}/detail`)
    detail.value = resp.data
  } finally {
    loading.value = false
  }
}

const targetId = computed(() => {
  if (props.documentId != null && props.documentId > 0) {
    return props.documentId
  }
  const fromRoute = Number(route.params.id || 0)
  return fromRoute || 0
})

watch(
  () => targetId.value,
  (id) => {
    if (id) {
      activeTab.value = 1
      fetchDetail(id)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px 0 24px;
  background-color: #f3f4f6;
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    system-ui, -apple-system, sans-serif;
  letter-spacing: -0.01em;
}

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.sections-card {
  border-radius: 18px;
  margin-top: 4px;
  border: none;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  background: #f9fafb;
  padding-bottom: 10px;
}

.sections-card :deep(.n-card__content) {
  padding: 6px;
}

.sections-card :deep(.n-card__border) {
  display: none;
}

.sections-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.sections-title {
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}

.sections-card :deep(.n-card-header__main) {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    system-ui, sans-serif;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.sections-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.save-btn {
  font-size: 12px;
  padding: 0 14px;
  font-family: inherit;
}

.sections-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.sections-nav-label {
  min-width: 56px;
  text-align: center;
}

.sections-tabs :deep(.n-tabs-nav) {
  margin-bottom: 4px;
}

.sections-tabs :deep(.n-tabs-tab) {
  padding: 6px 10px;
  font-size: 13px;
  color: #4b5563;
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    system-ui, sans-serif;
}

.sections-tabs :deep(.n-tabs-tab--active) {
  color: #2563eb;
  font-weight: 600;
}

.sections-tabs :deep(.n-tabs-divider) {
  border-color: #e5e7eb;
}

.tab-pane-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 700px;
  overflow-y: auto;
  padding-right: 4px;
}

.summary-card,
.section-raw-card {
  flex: 0 0 auto;
  border-radius: 14px;
  border: none;
  box-shadow: none;
  background-color: #ffffff;
}

.summary-card {
  background: #ffffff;
}

.summary-card :deep(.n-card__content),
.section-raw-card :deep(.n-card__content) {
  padding: 10px 14px;
}

.summary-card :deep(.n-card-header),
.section-raw-card :deep(.n-card-header) {
  border-bottom: none;
  padding-bottom: 6px;
}

.section-raw-card {
  min-height: 520px;
}

.section-scroll {
  max-height: 100%;
}

.sec2-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 6px;
}

.sec2-row .label {
  width: 64px;
  font-size: 13px;
  color: #6b7280;
}

:deep(.n-descriptions-header),
:deep(.n-descriptions-item-label),
:deep(.n-data-table-th),
:deep(.n-data-table-td),
:deep(.n-tag) {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    system-ui, sans-serif;
  letter-spacing: -0.01em;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pictogram-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.pictogram-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border-radius: 4px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.pictogram-img {
  width: 40px;
  height: auto;
  display: block;
}

.section-raw {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  color: #111827;
}

.text-muted {
  color: #9ca3af;
  font-size: 13px;
}
</style>
