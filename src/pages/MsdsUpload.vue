<template>
  {{ API_BASE }}
  <n-spin :show="globalLoading" size="large">
    <template #description>
      <div class="spin-desc">
        <div>{{ globalLoadingText || '처리 중입니다...' }}</div>
        <div v-if="globalTotal > 0" class="spin-progress">
          {{ globalDone }} / {{ globalTotal }}개 완료
        </div>
        <div class="spin-warning">
          작업이 완료될 때까지 메뉴 이동이나 새로고침을 하지 마세요.
        </div>
      </div>
    </template>

    <div class="page">
      <!-- 상단 타이틀 영역 -->
      <div class="page-header">
        <div>
          <h1 class="title">MSDS 일괄 업로드 분석</h1>
          <p class="subtitle">
            여러 MSDS PDF를 한 번에 업로드하여 섹션을 자동 분리하고, 제품·취사 정보, 유해성, 구성성분,
            물리·화학적 특성, 법적 규제 현황 등을 요약해 보여줍니다.
          </p>
          <p class="subtitle">
            MSDS PDF 파일 업로드 (여러 개 선택 가능, 권장: 최대 50개)
          </p>
        </div>
        <n-button
          tertiary
          type="error"
          @click="clearAll"
          :disabled="uploading || fileList.length === 0"
        >
          업로드 전체 삭제
        </n-button>
      </div>

      <!-- 본문: 왼쪽 업로드 / 오른쪽 요약 -->
      <div class="page-body">
        <!-- LEFT: 업로드 + 파일 리스트 -->
        <div class="page-left">
          <n-space vertical size="large">
            <!-- 업로드 드래그 박스 -->
            <n-card :bordered="false" class="upload-card">
              <n-upload
                multiple
                :max="50"
                accept=".pdf"
                :default-upload="false"
                :show-file-list="false"
                :file-list="naiveFileList"
                @change="handleUploadChange"
              >
                <n-upload-dragger>
                  <div class="drag-inner">
                    <div class="drag-icon">
                      <n-icon size="40">
                        <CloudUploadOutline />
                      </n-icon>
                    </div>
                    <div class="drag-title">Drag and drop files here</div>
                    <div class="drag-subtitle">Limit 200MB per file · PDF</div>
                    <n-button class="drag-button" type="primary" secondary>
                      Browse files
                    </n-button>
                  </div>
                </n-upload-dragger>
              </n-upload>
            </n-card>

            <!-- 파일 리스트 + 상단 툴바 -->
            <div v-if="fileList.length > 0">
              <!-- 파일 툴바: 개수 + 분석 버튼 -->
              <div class="file-toolbar">
                <div class="file-toolbar-left">
                  <span class="file-count">
                    총 {{ fileList.length }}개 파일
                  </span>
                  <span v-if="statusMessage" class="file-status-text">
                    · {{ statusMessage }}
                  </span>
                </div>
                <n-button
                  type="primary"
                  size="small"
                  :loading="uploading"
                  :disabled="fileList.length === 0"
                  @click="analyzeFiles"
                >
                  {{ uploading ? '분석 중...' : '파일 분석 시작' }}
                </n-button>
              </div>

              <n-divider style="margin: 8px 0 10px 0;" />

              <!-- 업로드된 파일 리스트 -->
              <n-space vertical size="small">
                <div
                  v-for="file in fileList"
                  :key="file.id"
                  class="file-item"
                >
                  <div class="file-main">
                    <div class="file-icon">
                      <n-tag type="error" size="small" round>PDF</n-tag>
                    </div>
                    <div class="file-text">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-meta">
                        {{ formatSize(file.size) }}
                        <!-- <span
                          v-if="file.status === 'done'"
                          class="file-status done"
                        >· 분석 완료</span>
                        <span
                          v-else-if="file.status === 'pending'"
                          class="file-status pending"
                        >· 대기 중</span>
                        <span
                          v-else-if="file.status === 'processing'"
                          class="file-status processing"
                        >· 분석 중...</span> -->
                      </span>
                    </div>
                  </div>
                  <n-button
                    quaternary
                    circle
                    size="tiny"
                    @click="removeFile(file.id)"
                  >
                    ✕
                  </n-button>
                </div>
              </n-space>
            </div>
          </n-space>
        </div>

        <!-- RIGHT: 파일 요약 카드 -->
        <div
          v-if="summaryRows.length > 0"
          class="page-right"
        >
          <h2 class="section-title">파일 요약</h2>
          <p class="section-desc">
            업로드된 MSDS별로 제품명·취사명·주소와 H코드 개수, P코드 개수, 구성성분 개수, 물리·화학적 특성 개수를 요약해 보여줍니다.
          </p>

          <!-- <n-spin :show="loadingSummary"> -->
            <div class="summary-header">
              <span class="summary-count">
                총 {{ filteredSummaryRows.length }}개 파일
              </span>
              <n-button
                size="small"
                type="primary"
                secondary
                :loading="bulkSaving"
                :disabled="!filteredSummaryRows.length"
                @click="saveAll"
              >
                일괄 저장
              </n-button>
            </div>

            <!-- 애니메이션이 적용된 카드 그리드 -->
            <TransitionGroup
              name="summary-fade"
              tag="div"
              class="summary-grid"
            >
              <n-card
                v-for="row in filteredSummaryRows"
                :key="row.id"
                class="summary-card"
                hoverable
                :bordered="row.saved"                
                :class="[{ 'summary-card-saved': row.saved }]"
                @click="openDetail(row)"
              >
                <div class="card-header">
                  <!-- 왼쪽: 제목/회사/메타 -->
                  <div class="card-header-left">
                    <div class="card-title">
                      {{ row.productName || row.fileName }}
                    </div>
                    <div class="card-subtitle">
                      {{ row.companyName || '회사명 정보 없음' }}
                    </div>

                    <div class="card-meta">
                      <div class="meta-row">
                        <div class="meta-item">
                          <span class="meta-label">MSDS No.</span>
                          <span class="meta-value">{{ row.msdsNo || '-' }}</span>
                        </div>
                        <div class="meta-item">
                          <span class="meta-label">개정번호</span>
                          <span class="meta-value">{{ row.versionNo || '-' }}</span>
                        </div>
                      </div>
                      <div class="meta-row">
                        <div class="meta-item">
                          <span class="meta-label">개정일자</span>
                          <span class="meta-value">{{ row.revisionDate || '-' }}</span>
                        </div>
                        <div class="meta-item">
                          <span class="meta-label">CAS No.</span>
                          <span class="meta-value">{{ row.casNo || '-' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 오른쪽 상단 배지 -->
                  <div v-if="row.saved" class="card-saved-badge">
                    이미 저장된 MSDS
                  </div>
                </div>

                <div class="card-metrics">
                  <div class="metric">
                    <div class="metric-label">H코드</div>
                    <div class="metric-value">{{ row.hCount }}</div>
                  </div>
                  <div class="metric">
                    <div class="metric-label">P코드</div>
                    <div class="metric-value">{{ row.pCount }}</div>
                  </div>
                  <div class="metric">
                    <div class="metric-label">구성성분</div>
                    <div class="metric-value">{{ row.componentCount }}</div>
                  </div>
                  <div class="metric">
                    <div class="metric-label">물리·화학적 특성</div>
                    <div class="metric-value">{{ row.physicalCount }}</div>
                  </div>
                </div>

                <div class="card-footer">
                  <div class="card-footer-left">
                    <span class="file-icon-inline">📄</span>
                    <span class="card-file-name" :title="row.fileName">
                      {{ row.fileName }}
                    </span>
                  </div>
                  <n-button
                    size="small"
                    tertiary
                    type="primary"
                    :loading="row.saving"
                    @click.stop="saveOne(row)"
                  >
                    저장
                  </n-button>
                </div>
              </n-card>
            </TransitionGroup>
          <!-- </n-spin> -->
        </div>
      </div>

      <!-- 상세 모달: MsdsDetail.vue를 component로 삽입 -->
      <!-- :title="selectedSummaryTitle" -->
      <n-modal
        v-model:show="detailVisible"
        preset="card"
        style="width: 980px"
      >
        <!-- 커스텀 헤더 -->
        <template #header>
          <div class="detail-modal-header">
            <div class="detail-modal-title">
              {{ selectedSummary?.productName || selectedSummary?.fileName || '상세 정보' }}
            </div>
            <div class="detail-modal-meta">
              <span>
                회사명: {{ selectedSummary?.companyName || '정보 없음' }}
              </span>
              <span class="dot"></span>
              <span>
                파일명: {{ selectedSummary?.fileName }}
              </span>
              <span class="dot"></span>
              <span>
                업로드: {{ selectedUploadedAtText }}
              </span>
            </div>
            <div class="detail-modal-meta">
              <span>
                Msds No: {{ selectedSummary?.msdsNo || '-' }}
              </span>
              <span class="dot"></span>
              <span>
                개정일자: {{ selectedSummary?.revisionDate || '-' }}
              </span>
              <span class="dot"></span>
              <span>
                개정번호: {{ selectedSummary?.versionNo || '-' }}
              </span>
              <span class="dot"></span>
              <span>
                casNo: {{ selectedSummary?.casNo || '-' }}
              </span>
            </div>
          </div>
        </template>
        <component
          :is="MsdsDetail"
          v-if="detailVisible && selectedDocumentId"
          :document-id="selectedDocumentId"
          :embedded="true"
          @click-save="onDetailSave"
        />
      </n-modal>
    </div>
  </n-spin>
</template>

<script setup>
import { computed, ref, TransitionGroup } from 'vue'
import {
  NButton,
  NSpace,
  NCard,
  NUpload,
  NUploadDragger,
  NIcon,
  NTag,
  NSpin,
  NDivider,
  NModal
} from 'naive-ui'
import { useMessage } from 'naive-ui'
import { CloudUploadOutline } from '@vicons/ionicons5'
import axios from 'axios'
import MsdsDetail from './MsdsDetail.vue'

const API_BASE =
  import.meta.env.VITE_MSDS_BACKEND_URL || 'http://localhost:8000'

const message = useMessage()

const fileList = ref([])          // [{ id, name, size, status, raw, result, documentId? }]
const naiveFileList = ref([])

const uploading = ref(false)
const loadingSummary = ref(false)
const statusMessage = ref('')

const summaryRows = ref([])       // [{ id, documentId, ... }]
const bulkSaving = ref(false)

// 글로벌 오버레이 로딩 + 진행률
const globalLoading = ref(false)
const globalLoadingText = ref('')
const globalDone = ref(0)
const globalTotal = ref(0)

// 상세 모달 상태
const detailVisible = ref(false)
const selectedSummary = ref(null)

const selectedDocumentId = computed(() =>
  selectedSummary.value?.documentId ?? null
)

const selectedSummaryTitle = computed(() => {
  if (!selectedSummary.value) return '상세 정보'
  return (
    selectedSummary.value.productName ||
    selectedSummary.value.fileName ||
    '상세 정보'
  )
})


const selectedUploadedAtText = computed(() => {
  const raw = selectedSummary.value?.uploadedAt
  if (!raw) return '-'
  try {
    return new Date(raw).toLocaleString()
  } catch {
    return String(raw)
  }
})

// 요약 필터링(지금은 전체 사용)
const filteredSummaryRows = computed(() => summaryRows.value)

// ---------- 업로드 변경 (중복 방지 포함) ----------
function handleUploadChange(options) {
  const originalList = options.fileList || []

  const seen = new Set()
  const deduped = []
  const skippedNames = new Set()

  for (const item of originalList) {
    const fileObj = item.file || null
    const key = fileObj
      ? `${fileObj.name}__${fileObj.size}`
      : `${item.name}__${item.id}`

    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(item)
    } else {
      skippedNames.add(item.name)
    }
  }

  naiveFileList.value = deduped

  // ① 기존 fileList와 merge
  const prevById = new Map(fileList.value.map((f) => [f.id, f]))
  const nextFileList = []

  for (const item of deduped) {
    const existing = prevById.get(item.id)
    if (existing) {
      // 이전 상태 유지 (done/pending/result 등)
      nextFileList.push(existing)
    } else {
      // 새로 추가된 파일만 pending으로 생성
      nextFileList.push({
        id: item.id,
        name: item.name,
        size: item.file?.size || 0,
        status: 'pending',
        raw: item.file,
        result: null,
        documentId: null
      })
    }
  }

  fileList.value = nextFileList

  // ② 삭제된 파일에 해당하는 summaryRows도 정리
  const aliveIds = new Set(nextFileList.map((f) => f.id))
  summaryRows.value = summaryRows.value.filter((row) =>
    aliveIds.has(row.id)
  )

  statusMessage.value = ''

  if (skippedNames.size > 0) {
    message.info(
      `이미 추가된 파일은 제외했습니다: ${Array.from(skippedNames).join(', ')}`
    )
  }
}

function removeFile(id) {
  // 1) 업로드 리스트에서 제거
  fileList.value = fileList.value.filter((f) => f.id !== id)
  naiveFileList.value = naiveFileList.value.filter((f) => f.id !== id)

  // 2) 요약 카드 리스트에서도 같은 id 제거
  summaryRows.value = summaryRows.value.filter((row) => row.id !== id)

  // 3) 남은 파일 없으면 상태 초기화
  if (fileList.value.length === 0) {
    statusMessage.value = ''
    summaryRows.value = []
  }
}

function clearAll() {
  fileList.value = []
  naiveFileList.value = []
  summaryRows.value = []
  statusMessage.value = ''
}

function formatSize(size) {
  if (!size) return '0B'
  if (size < 1024) return `${size}B`
  const kb = size / 1024
  if (kb < 1024) return `${kb.toFixed(1)}KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)}MB`
}

// H/P 코드 개수 세기 (배열 or 문자열 둘 다 지원)
function countCodesFlexible(raw) {
  if (!raw) return 0
  if (Array.isArray(raw)) return raw.filter(Boolean).length
  if (typeof raw === 'string') {
    return raw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean).length
  }
  return 0
}

// 구성성분 개수 (sec3.rows 기준)
function countComponents(sec3) {
  if (!sec3) return 0
  if (Array.isArray(sec3.rows)) return sec3.rows.length
  if (Array.isArray(sec3)) return sec3.length
  return 0
}

// 물성 항목 개수 (sec9)
function countPhysicalProps(sec9) {
  if (!sec9) return 0
  if (Array.isArray(sec9.rows)) return sec9.rows.length
  if (typeof sec9 === 'object') {
    return Object.values(sec9).filter((v) => {
      if (v === null || v === undefined) return false
      return String(v).trim() !== ''
    }).length
  }
  return 0
}

// ---------- 분석 ----------
async function analyzeFiles() {
  if (!fileList.value.length) return

  // ① 새로 분석해야 할 파일만 선택 (status !== 'done')
  const targets = fileList.value.filter((f) => f.status !== 'done')

  if (!targets.length) {
    message.info('새로 분석할 파일이 없습니다. 모든 파일이 이미 분석되었습니다.')
    return
  }

  uploading.value = true
  loadingSummary.value = true

  globalLoadingText.value = 'MSDS 파일을 분석 중입니다...'
  globalLoading.value = true
  globalDone.value = 0
  globalTotal.value = targets.length

  statusMessage.value = ''
  // summaryRows.value = []  ← 이 줄은 지워야 함!! (기존 카드 유지)

  const start = performance.now()

  // ② 타겟만 processing으로 표시
  fileList.value = fileList.value.map((f) =>
    targets.some((t) => t.id === f.id)
      ? { ...f, status: 'processing' }
      : f
  )

  try {
    const promises = targets.map(async (f) => {
      const formData = new FormData()
      formData.append('file', f.raw, f.name)

      const resp = await axios.post(
        `${API_BASE}/api/msds/upload-file`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120_000
        }
      )

      const data = resp.data
      const sec1 = data.sec1 || {}
      const sec2 = data.sec2 || {}
      const sec3 = data.sec3 || {}
      const sec9 = data.sec9 || {}

      const header = data.header_meta || data.header || {}
      data.msds_no = data.msds_no || header.msds_no || null
      data.revision_date = data.revision_date || header.revision_date || null
      data.version_no = data.version_no || header.version_no || null
      data.cas_no = data.cas_no || header.cas_no || null

      const hCount = countCodesFlexible(
        sec2.h_codes ?? sec2.hazard_codes
      )
      const pCount = countCodesFlexible(
        sec2.p_codes ?? sec2.precautionary_codes_flat
      )
      const componentCount = countComponents(sec3)
      const physicalCount = countPhysicalProps(sec9)

      f.result = data
      f.status = 'done'
      f.documentId = data.document_id || null

      // 같은 id 카드가 이미 있으면 먼저 제거 후 다시 push
      summaryRows.value = summaryRows.value.filter((row) => row.id !== f.id)

      summaryRows.value.push({
        id: f.id,
        documentId: data.document_id || null,
        fileName: data.file_name ?? f.name,
        productName: sec1.product_name ?? '',
        companyName: sec1.company_name ?? '',
        hCount,
        pCount,
        componentCount,
        physicalCount,
        detail: data,
        saving: false,
        uploadedAt: data.uploaded_at || new Date().toISOString(),
        msdsNo: data.msds_no,
        revisionDate: data.revision_date,
        versionNo: data.version_no,
        casNo: data.cas_no,
        saved: !!data.document_id && data.is_new === false
      })

      globalDone.value += 1
    })

    await Promise.all(promises)

    const elapsed = (performance.now() - start) / 1000
    statusMessage.value = `신규 ${targets.length}개 파일 분석이 완료되었습니다. (약 ${elapsed.toFixed(
      1
    )}초)`
  } catch (e) {
    console.error(e)
    statusMessage.value =
      e.response?.data?.detail || '파일 분석 중 오류가 발생했습니다.'
    fileList.value = fileList.value.map((f) => ({
      ...f,
      status: f.status === 'processing' ? 'pending' : f.status
    }))
  } finally {
    uploading.value = false
    loadingSummary.value = false
    globalLoading.value = false
    globalLoadingText.value = ''
    globalDone.value = 0
    globalTotal.value = 0
  }
}

// ---------- 저장 로직 ----------
async function saveOne(row, options) {
  options = options || {};
  const silent = options.silent === true;
  const overlay = options.overlay !== false; // 기본 true

  if (!row) return 'skip';
  if (row.saving) return 'skip';

  row.saving = true;

  // 로딩 오버레이 (기존 코드 그대로 사용)
  if (overlay) {
    globalLoadingText.value = '선택한 MSDS를 저장 중입니다...';
    globalLoading.value = true;
    globalTotal.value = 1;
    globalDone.value = 0;
  }

  // 메시지용 표시 이름 (row, detail 둘 다 커버)
  const displayName =
    row.fileName ||
    (row.document && row.document.file_name) ||
    'MSDS';

  try {
    const payload = buildSavePayload(row);

    const resp = await axios.post(`${API_BASE}/msds`, payload, {
      timeout: 120000
    });

    const data = resp.data || {};
    const status = data.status || 'created';
    const msg = data.message || '';

    // document_id가 있으면 row에도 반영 (목록/모달 둘 다)
    if (data.document_id) {
      row.documentId = data.document_id;
      if (row.document) {
        row.document.id = data.document_id;
      }
    }

    if (status === 'created' || status === 'duplicate') {
      row.saved = true;
    }
    if (overlay) {
      globalDone.value = 1;
    }

    if (!silent) {
      if (status === 'created') {
        message.success(`'${displayName}' 저장 완료`);
      } else if (status === 'duplicate') {
        message.info(`'${displayName}'는 이미 저장되어 있습니다.`);
      } else {
        message.warning(
          msg || `'${displayName}' 저장 처리 상태: ${status}`
        );
      }
    }

    return status;
  } catch (e) {
    console.error(e);
    const errMsg =
      (e.response && e.response.data && e.response.data.detail) ||
      e.message ||
      `'${displayName}' 저장 중 오류가 발생했습니다.`;
    if (!silent) {
      message.error(errMsg);
    }
    return 'error';
  } finally {
    row.saving = false;
    if (overlay) {
      globalLoading.value = false;
      globalLoadingText.value = '';
      globalDone.value = 0;
      globalTotal.value = 0;
    }
  }
}

async function saveAll() {
  if (!filteredSummaryRows.value.length || bulkSaving.value) return

  bulkSaving.value = true
  globalLoading.value = true
  globalLoadingText.value = '분석 결과를 일괄 저장 중입니다...'
  globalTotal.value = filteredSummaryRows.value.length
  globalDone.value = 0

  let created = 0
  let duplicate = 0
  let error = 0

  try {
    for (const row of filteredSummaryRows.value) {
      const status = await saveOne(row, { silent: true, overlay: false })
      if (status === 'created') created++
      else if (status === 'duplicate') duplicate++
      else if (status !== 'skip') error++

      globalDone.value += 1
    }

    message.success(
      `일괄 저장 완료: 신규 ${created}개, 중복 ${duplicate}개, 오류 ${error}개`
    )
  } finally {
    bulkSaving.value = false
    globalLoading.value = false
    globalLoadingText.value = ''
    globalDone.value = 0
    globalTotal.value = 0
  }
}

// ---------- 상세 모달 열기: MsdsDetail.vue 내부 렌더 ----------
async function openDetail(row) {
  if (!row) return

  // documentId가 없으면 먼저 저장
  if (!row.documentId) {
    const status = await saveOne(row, { silent: false, overlay: true })
    if (!(status === 'created' || status === 'duplicate') || !row.documentId) {
      message.error('저장에 실패하여 상세 정보를 열 수 없습니다.')
      return
    }
  }

  selectedSummary.value = row
  detailVisible.value = true
}

function formatCodesForView(raw) {
  if (!raw) return '-'
  if (Array.isArray(raw)) {
    const arr = raw.map((v) => String(v).trim()).filter(Boolean)
    return arr.length ? arr.join(', ') : '-'
  }
  if (typeof raw === 'string') {
    const arr = raw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    return arr.length ? arr.join(', ') : '-'
  }
  return '-'
}

function onDetailSave(row) {
  saveOne(row, { silent: false, overlay: true })
}

function buildSavePayload(src) {
  // 1) MsdsDetail.vue 모달에서 온 detail 객체
  //    구조: { document, sec1_summary, hazard_info, composition, physical_props, sections }
  if (src && src.document && !src.detail) {
    const doc = src.document || {}
    const sec1 = src.sec1_summary || {}

    // sections: List[MsdsSectionOut] → Dict[str, str]
    const sectionsDict = {}
    ;(src.sections || []).forEach(function (s) {
      if (s && s.section_num != null && s.content) {
        sectionsDict[String(s.section_num)] = s.content
      }
    })

    return {
      // MsdsSaveRequest 필수/핵심 필드만 전송
      file_name: doc.file_name,
      file_size_kb: doc.file_size_kb ?? null,

      vendor_name: doc.vendor_name || sec1.company_name || null,
      product_name:
        sec1.product_name ||
        doc.chem_name ||
        null,

      // 메타 정보는 이미 DB에 있으므로 굳이 다시 검증시키지 않음
      // msds_no, chem_name, revision_date, version_no 는 아예 생략

      sections: sectionsDict,

      // 구조화 요약들
      sec1: src.sec1_summary || null,
      sec2: src.hazard_info || null,
      sec3: src.composition || null,
      sec9: src.physical_props || null,
      sec15_raw: sectionsDict['15'] || null
    }
  }

  // 2) 업로드 목록 row 에서 저장할 때 (기존 로직 유지)
  if (src && src.detail) {
    const row = src
    const d = row.detail || {}
    const sec1 = d.sec1 || {}
    const sec2 = d.sec2 || {}
    const sec3 = d.sec3 || {}
    const sec9 = d.sec9 || {}

    return {
      file_name: d.file_name || row.fileName,
      file_size_kb: d.file_size_kb ?? null,

      vendor_name:
        d.vendor_name ||
        sec1.company_name ||
        row.companyName ||
        null,
      product_name:
        d.product_name ||
        sec1.product_name ||
        row.productName ||
        null,

      msds_no: d.msds_no ?? null,
      chem_name:
        d.chem_name ||
        sec1.product_name ||
        row.productName ||
        null,
      revision_date: d.revision_date ?? null,
      version_no: d.version_no ?? null,
      cas_no: d.cas_no ?? null,     

      sections: d.sections || {},

      sec1: sec1,
      sec2: sec2,
      sec3: sec3,
      sec9: sec9,
      sec15_raw: d.sec15_raw || (d.sections && d.sections['15']) || null
    }
  }

  // 3) fallback
  var sectionsDict = {}
  if (src && src.sections && !Array.isArray(src.sections)) {
    sectionsDict = src.sections
  }

  return {
    file_name: src.file_name || src.fileName,
    file_size_kb: src.file_size_kb ?? src.fileSizeKb ?? null,

    vendor_name: src.vendor_name ?? src.companyName ?? null,
    product_name: src.product_name ?? src.productName ?? null,

    msds_no: src.msds_no ?? null,
    chem_name: src.chem_name ?? src.productName ?? null,
    revision_date: src.revision_date ?? null,
    version_no: src.version_no ?? null,
    cas_no: src.cas_no ?? null,  

    sections: sectionsDict,

    sec1: src.sec1 || null,
    sec2: src.sec2 || null,
    sec3: src.sec3 || null,
    sec9: src.sec9 || null,
    sec15_raw: src.sec15_raw || null
  }
}

</script>

<style scoped>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

.page {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    system-ui, -apple-system, sans-serif;
  max-width: 2300px;
  margin: 0 auto;
  padding: 16px 0 32px;
  background-color: transparent;
  box-sizing: border-box;

  /* shmsRegulApi와 동일 컨셉: 뷰포트 기준 높이 고정 */
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
}

/* 상단 타이틀 영역: 배경색 + 카드 느낌 */
.page-header {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;

  padding: 16px 20px;
  border-radius: 16px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
}

/* 본문은 남은 높이를 나눠 쓰게 */
.page-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  gap: 32px;
  align-items: stretch;
}

/* 왼쪽(업로드) 영역 */
.page-left {
  flex: 2;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 오른쪽(요약) 영역 */
.page-right {
  flex: 3;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  border-left: 1px solid #e5e7eb;
  padding-left: 32px;
}

@media (max-width: 1024px) {
  .page-body {
    flex-direction: column;
  }

  .page-left,
  .page-right {
    overflow-y: visible;
  }

  .upload-card {
    max-width: 100%;
  }

  .page-right {
    border-left: none;
    padding-left: 0;
  }
}

.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.upload-card {
  background-color: #f9fafb;
  border-radius: 16px;
  width: 100%;
}

.drag-inner {
  text-align: center;
  padding: 36px 12px;
}

.drag-icon {
  margin-bottom: 8px;
}

.drag-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
}

.drag-subtitle {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 12px;
}

.drag-button {
  margin-top: 4px;
}

/* 파일 툴바 */
.file-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
}

.file-toolbar-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.file-count {
  font-size: 12px;
  color: #4b5563;
  font-weight: 500;
}

.file-status-text {
  font-size: 11px;
  color: #9ca3af;
}

/* 파일 아이템 */
.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  margin-bottom: 6px;
}

.file-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-icon {
  display: flex;
  align-items: center;
}

.file-text {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
}

.file-meta {
  font-size: 12px;
  color: #6b7280;
}

.file-status {
  margin-left: 4px;
}

.file-status.done   { color: #059669; }
.file-status.pending{ color: #9ca3af; }
.file-status.processing { color: #2563eb; }

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.section-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px;
}

/* 요약 카드 그리드 */
.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.summary-count {
  font-size: 12px;
  color: #6b7280;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 8px;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

.summary-card {
  cursor: pointer;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.summary-card-saved {
  border: 1px solid #10b981 !important;
  box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.12),
    0 10px 30px rgba(15, 23, 42, 0.08);
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
}

.card-header-left {
  flex: 1 1 auto;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.card-subtitle {
  font-size: 12px;
  color: #6b7280;
}

.card-metrics {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid #f3f4f6;
}

.metric {
  flex: 1;
  text-align: center;
}

.metric-label {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 2px;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.card-footer {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
  font-size: 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.card-footer-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.file-icon-inline {
  font-size: 14px;
}

.card-file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* TransitionGroup 애니메이션 */
.summary-fade-enter-from,
.summary-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.summary-fade-enter-active,
.summary-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.summary-fade-move {
  transition: transform 0.25s ease;
}

/* 스피너 description */
.spin-desc {
  text-align: center;
  font-size: 13px;
}

.spin-progress {
  margin-top: 4px;
  font-size: 12px;
  color: #10b981;
}

.spin-warning {
  margin-top: 6px;
  font-size: 11px;
  color: #ef4444;
}

/* 상세 모달 헤더 */
.detail-modal-header {
  padding: 8px 4px 4px;
}

.detail-modal-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.detail-modal-meta {
  font-size: 13px;
  color: #6b7280;
}

.detail-modal-meta .dot::before {
  content: '•';
  margin: 0 8px;
}

.card-meta {
  margin-top: 6px;
  font-size: 11px;
  color: #6b7280;
}

.meta-row {
  display: flex;
  gap: 12px;
  margin-top: 2px;
}

.meta-item {
  display: flex;
  gap: 4px;
  min-width: 0;
}

.meta-label {
  color: #9ca3af;
  white-space: nowrap;
}

.meta-value {
  color: #4b5563;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-saved-badge {
  flex: 0 0 auto;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  color: #047857;
  background-color: #ecfdf5;
  border: 1px solid #6ee7b7;
  white-space: nowrap;
}
</style>
