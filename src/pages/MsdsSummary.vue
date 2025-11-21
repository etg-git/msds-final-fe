<template>
  <div class="page">
    <!-- 상단 헤더 카드 (업로드 페이지와 유사) -->
    <div class="page-header">
      <div class="page-title-block">
        <h1 class="page-title">MSDS 상세보기</h1>
        <p class="page-subtitle">
          저장된 MSDS 중 하나를 선택하면 섹션 1, 2, 3, 9, 15를 중심으로
          AI 요약과 상세 정보를 함께 볼 수 있습니다.
        </p>
      </div>
      <n-button size="small" tertiary @click="fetchDocs">
        목록 새로고침
      </n-button>
    </div>

    <!-- 본문 -->
    <div class="page-body">
      <!-- 왼쪽: MSDS 목록 -->
      <div class="left-panel">
        <div class="panel-header">
          <div class="panel-title">저장된 MSDS 목록</div>
        </div>

        <div class="panel-body">
          <n-spin :show="listLoading">
            <n-data-table
              size="small"
              :columns="columns"
              :data="docs"
              :row-props="rowProps"
              :row-class-name="rowClassName"
              :bordered="false"
              :single-line="true"
            />
          </n-spin>
        </div>
      </div>

      <!-- 오른쪽: AI 요약 + 상세 탭 -->
      <div class="right-panel">
        <n-card size="small" class="summary-card">
          <template #header>
            <div class="summary-card-header">
              <div class="summary-card-title">
                {{ summaryTitle }}
              </div>
            </div>
          </template>

          <template v-if="selectedDoc">
            <!-- 상단 메타 -->
            <div class="summary-meta">
              <div class="summary-meta-row">
                <span class="label">제품명</span>
                <span class="value">{{ selectedDoc.chem_name || '-' }}</span>
                <span class="label">회사명</span>
                <span class="value">{{ selectedDoc.vendor_name || '-' }}</span>
              </div>
              <div class="summary-meta-row">
                <span class="label">Cas No.</span>
                <span class="value">{{ selectedDoc.cas_no || '-' }}</span>
                <span class="label">MSDS No.</span>
                <span class="value">{{ selectedDoc.msds_no || '-' }}</span>
              </div>
              <div class="summary-meta-row">
                <span class="label">개정일자</span>
                <span class="value">{{ selectedDoc.revision_date || '-' }}</span>
                <span class="label">개정번호</span>
                <span class="value">{{ selectedDoc.version_no || '-' }}</span>
              </div>
            </div>

            <!-- AI 요약 / 상세 탭 -->
            <n-tabs
              v-model:value="activeTab"
              type="line"
              @update:value="handleTabChange"
              class="summary-tabs"
            >
              <!-- 탭 2: 상세 (MsdsDetail 컴포넌트 그대로 사용) -->
              <n-tab-pane name="detail" tab="상세">
                <div class="detail-wrapper" v-if="selectedDocId">
                  <MsdsDetail :document-id="selectedDocId" />
                </div>
                <div v-else class="detail-empty">
                  선택된 문서가 없습니다.
                </div>
              </n-tab-pane>

              <!-- 탭 1: AI 요약 -->
              <n-tab-pane name="summary" tab="AI 요약">
                <div class="question-block">
                  <div class="question-label">질문(프롬프트)</div>
                  <n-input
                    v-model:value="question"
                    type="textarea"
                    :autosize="{ minRows: 5, maxRows: 8 }"
                  />
                  <div class="question-actions">
                    <n-space justify="end">
                      <n-button size="small" tertiary @click="resetQuestion">
                        기본 질문으로 되돌리기
                      </n-button>
                      <n-button
                        size="small"
                        type="primary"
                        :loading="summaryLoading"
                        @click="runSummary"
                      >
                        AI 요약 다시 실행
                      </n-button>
                    </n-space>
                  </div>
                </div>

                <n-divider />

                <div class="summary-text-wrapper">
                  <!-- <n-spin :show="summaryLoading"> -->
                    <div v-if="summaryError" class="summary-error">
                      {{ summaryError }}
                    </div>
                    <pre v-else class="summary-text">
{{ summaryText || '아직 AI 요약이 없습니다. AI 요약 다시 실행 버튼을 눌러 주세요.' }}
                    </pre>
                  <!-- </n-spin> -->

                  <!-- AI 주의 문구 -->
                  <div class="ai-disclaimer">
                    AI는 실수할 수 있습니다. 항상 원본 MSDS와 상단의 표·섹션 정보를 함께 확인해 주세요.
                  </div>
                </div>
              </n-tab-pane>
            </n-tabs>
          </template>

          <template v-else>
            <div class="summary-empty-wrapper">
              <n-empty
                description="왼쪽 목록에서 MSDS를 선택하면 AI 요약과 상세 정보가 여기 표시됩니다."
              />
            </div>
          </template>
        </n-card>
      </div>
    </div>

    <!-- RAG 실행 시 전체 화면 로딩 오버레이 -->
    <div v-if="summaryLoading" class="page-overlay">
      <n-spin size="large" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import {
  NButton,
  NSpin,
  NDataTable,
  NCard,
  NDivider,
  NInput,
  NSpace,
  NEmpty,
  NTabs,
  NTabPane
} from 'naive-ui'
import MsdsDetail from './MsdsDetail.vue'

// 문서 목록 / RAG 백엔드
const BACKEND_BASE_URL =
  import.meta.env.VITE_MSDS_BACKEND_URL || 'http://localhost:8000'

const docs = ref([])
const listLoading = ref(false)

const selectedDocId = ref(null)
const selectedDoc = computed(
  () => docs.value.find((d) => d.id === selectedDocId.value) || null
)

const summaryText = ref('')
const summaryLoading = ref(false)
const summaryError = ref('')

const activeTab = ref('detail') // 기본은 상세 탭 먼저 보이게

const defaultQuestion =
  '이 MSDS 문서를 현장 작업자와 안전관리자가 빠르게 이해할 수 있도록, ' +
  '섹션 1(제품/회사 정보), 2(유해성/위험성), 3(구성성분), 9(물리·화학적 특성), 15(법적 규제)를 중심으로 ' +
  '다음 형식으로 한국어로 요약해 주세요.\n\n' +
  '1) 제품 및 회사 정보: 제품명, 주요 용도, 회사명/연락처를 2~3줄로 정리\n' +
  '2) 유해성 요약: 신호어, 주요 위험성(H코드 의미), 주의할 점을 3~4줄로 정리\n' +
  '3) 구성성분 개요: 주요 성분명과 대략적인 함유량 범위를 문장으로 정리\n' +
  '4) 물리·화학적 특성: 상태, 색, 냄새, 끓는점/인화점 등 핵심만 2~3줄로 요약\n' +
  '5) 법적 규제: 작업환경측정대상, 특별관리물질 등 중요한 규제 사항을 bullet 형식으로 정리'

const question = ref(defaultQuestion)

const summaryTitle = computed(() => {
  if (!selectedDoc.value) return 'MSDS AI 요약본'
  const name = selectedDoc.value.chem_name || selectedDoc.value.file_name
  return `MSDS AI 요약본 - ${name}`
})

const columns = [
  {
    title: '제품명',
    key: 'chem_name',
    ellipsis: { tooltip: true },
    render(row) {
      return row.chem_name || row.file_name || '-'
    }
  },
  {
    title: '회사명',
    key: 'vendor_name',
    ellipsis: { tooltip: true }
  },
  {
    title: 'MSDS_NO',
    key: 'msds_no',
    width: 250,
    ellipsis: { tooltip: true }
  },
  {
    title: '개정일자',
    key: 'revision_date',
    width: 120
  },
  {
    title: '개정번호',
    key: 'version_no',
    width: 110
  }
]

const rowProps = (row) => ({
  style: 'cursor: pointer;',
  onClick: () => handleSelectRow(row)
})

const rowClassName = (row) =>
  row.id === selectedDocId.value ? 'msds-row-selected' : ''

async function fetchDocs() {
  listLoading.value = true
  try {
    const resp = await axios.get(`${BACKEND_BASE_URL}/msds/documents`)
    docs.value = Array.isArray(resp.data) ? resp.data : []
  } catch (err) {
    console.error(err)
  } finally {
    listLoading.value = false
  }
}

function handleSelectRow(row) {
  if (!row || !row.id) return
  selectedDocId.value = row.id
  summaryText.value = ''
  summaryError.value = ''
  // 선택 바뀌면 기본은 상세부터
  activeTab.value = 'detail'
}

function resetQuestion() {
  question.value = defaultQuestion
}

async function runSummary() {
  if (!selectedDocId.value) return

  summaryLoading.value = true
  summaryError.value = ''
  try {
    const payload = {
      document_id: selectedDocId.value,
      question: question.value
      // sections_filter 안 보냄 → 백엔드 기본값 사용
    }

    const resp = await axios.post(
      `${BACKEND_BASE_URL}/msds/rag_query`,
      payload
    )

    const data = resp.data || {}
    if (data.answer) {
      summaryText.value = data.answer
    } else {
      summaryText.value =
        typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    }
  } catch (err) {
    console.error(err)
    summaryError.value =
      'AI 요약 생성 중 오류가 발생했습니다. 콘솔 로그를 확인해 주세요.'
  } finally {
    summaryLoading.value = false
  }
}

function handleTabChange(tab) {
  // 필요하면 탭 전환 시 자동 요약 실행 같은 로직 넣어도 됨
}

// 선택된 문서가 바뀌면 항상 상세 탭부터
watch(selectedDocId, () => {
  activeTab.value = 'detail'
})

onMounted(() => {
  fetchDocs()
})
</script>

<style scoped>
.page {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    system-ui, -apple-system, sans-serif;
  max-width: 2300px;
  margin: 0 auto;
  padding: 12px 16px 16px;
  box-sizing: border-box;

  background-color: transparent;

  /* 부모(#app / app-layout) 기준으로 꽉 채우기 */
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden; /* 내부 패널만 스크롤 */
}

/* 상단 헤더 */
.page-header {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin: 0 0 12px 0;
  padding: 16px 20px;
  border-radius: 16px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
}

.page-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: #7f8596;
  margin: 0;
}

/* 본문 전체 레이아웃 */
.page-body {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 20px;
}

/* 왼쪽 패널 */
.left-panel {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  padding: 16px 18px 18px;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
}

.panel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

/* 오른쪽 패널 */
.right-panel {
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  height: 100%;
}

.summary-card {
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);

  display: flex;
  flex-direction: column;
}

.summary-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary-card-title {
  font-size: 14px;
  font-weight: 600;
}

/* Naive 카드 컨텐츠 높이 고정 + 스크롤 가능 */
.summary-card :deep(.n-card__content) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 선택된 row 배경 */
:deep(.msds-row-selected td) {
  background-color: #d9f2e4 !important;
}

/* 메타 정보 */
.summary-meta {
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 10px;
}

.summary-meta-row {
  display: flex;
  gap: 8px;
}

.summary-meta-row .label {
  width: 80px;
  color: #9ca3af;
}

.summary-meta-row .value {
  flex: 1;
  color: #111827;
  word-break: break-all;
}

/* 탭 전체를 꽉 채우게 */
.summary-tabs {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.summary-tabs :deep(.n-tabs-nav) {
  flex: 0 0 auto;
}

.summary-tabs :deep(.n-tabs-content) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

/* 요약 탭 안쪽 스크롤 */
.summary-text-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

/* 프롬프트 영역 */
.question-block {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.question-label {
  font-size: 12px;
  color: #6b7280;
}

.question-actions {
  margin-top: 4px;
}

/* 요약 텍스트 */
.summary-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.summary-error {
  color: #d03050;
  font-size: 13px;
  margin-bottom: 8px;
}

/* AI 주의 문구 */
.ai-disclaimer {
  margin-top: 6px;
  font-size: 11px;
  color: #9ca3af;
}

/* 상세 탭 안에서 MsdsDetail 감싸는 래퍼 */
.detail-wrapper {
  height: 100%;
  overflow: auto;
}

.detail-empty {
  font-size: 13px;
  color: #6b7280;
}

/* MSDS Detail 내부 page 스타일 살짝 억제 */
.detail-wrapper :deep(.page) {
  background-color: transparent;
  padding: 0;
}

/* RAG 전체 오버레이 */
.page-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
</style>
