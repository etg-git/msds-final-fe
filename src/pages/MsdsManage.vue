<template>
  <div class="page">
    <n-card class="list-card" size="small" :bordered="false">
      <template #header>
        <div class="card-header">
          <div class="title-block">
            <h1 class="title">MSDS 관리</h1>
            <p class="subtitle">
              저장된 MSDS 문서를 조회·검색하고,
              각 행의 ‘상세 / 수정’ 버튼을 눌러 기본 정보와 CAS No., 구성성분, 유해성, 물리·화학적 특성, 섹션 원문을 수정합니다.
            </p>
          </div>
          <n-button size="small" tertiary @click="fetchDocs" :loading="listLoading">
            목록 새로고침
          </n-button>
        </div>
      </template>

      <!-- 카드 내부 스크롤 영역 -->
      <div class="table-wrapper">
        <n-spin :show="listLoading">
          <n-data-table
            size="small"
            :columns="columns"
            :data="docs"
            :bordered="false"
            :single-line="true"
          />
        </n-spin>
      </div>
    </n-card>

    <!-- 상세 / 수정 드로어 -->
    <MsdsManageDetailDrawer
      v-model:show="detailVisible"
      :doc="selectedDoc"
      @saved="fetchDocs"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'
import axios from 'axios'
import {
  NCard,
  NButton,
  NSpin,
  NDataTable,
  NIcon,
  useDialog,
  useMessage
} from 'naive-ui'
import { PencilOutline, TrashOutline } from '@vicons/ionicons5'

import MsdsManageDetailDrawer from './MsdsManageDetailDrawer.vue'

const API_BASE_URL =
  import.meta.env.VITE_MSDS_API_BASE || 'http://localhost:8000'

const docs = ref([])
const listLoading = ref(false)

const detailVisible = ref(false)
const selectedDoc = ref(null)

const dialog = useDialog()
const message = useMessage()

function openDetail (row) {
  if (!row || !row.id) return
  selectedDoc.value = row
  detailVisible.value = true
}

/** 삭제 확인 다이얼로그 */
function confirmDelete (row) {
  if (!row || !row.id) return

  dialog.warning({
    title: '알림',
    positiveText: '삭제',
    negativeText: '취소',
    positiveButtonProps: {
      type: 'error'
    },
    content: () =>
      h('div', { style: 'font-size:13px; line-height:1.6;' }, [
        h(
          'p',
          {
            style:
              'font-size:16px; font-weight:800; color:#b91c1c;'
          },
          '정말 삭제하시겠습니까?'
        ),
        h(
          'p',
          {
            style:
              'margin:0 0 10px; font-size:14px; color:#4b5563;'
          },
          '이 문서와 연결된 모든 정보가 아래 항목까지 포함하여 영구적으로 삭제됩니다.'
        ),
        h(
          'ol',
          {
            style:
              'margin:0; padding-left:18px; font-size:14px; color:#374151;'
          },
          [
            h('li', '제품명 / 회사 정보'),
            h('li', '유해/위험성 GHS 정보'),
            h('li', '구성성분 목록'),
            h('li', 'Charm 관련된 정보'),
            h('li', 'MSDS 섹션별 원문 텍스트')
          ]
        )
      ]),
    async onPositiveClick () {
      try {
        await axios.delete(`${API_BASE_URL}/msds/${row.id}`)
        message.success('MSDS와 관련된 모든 정보가 삭제되었습니다.')
        await fetchDocs()
      } catch (err) {
        console.error(err)
        message.error('삭제 중 오류가 발생했습니다. 다시 시도해 주세요.')
        throw err
      }
    }
  })
}

// 컬럼 정의 – 관리 컬럼에 삭제 버튼 추가
const columns = [
  {
    title: '제품명',
    key: 'chem_name',
    ellipsis: { tooltip: true },
    render (row) {
      return row.chem_name || row.file_name || '-'
    }
  },
  {
    title: '회사명',
    key: 'vendor_name',
    ellipsis: { tooltip: true }
  },
  {
    title: 'CAS No.',
    key: 'cas_no',
    width: 200,
    ellipsis: { tooltip: true }
  },
  {
    title: 'MSDS_NO',
    key: 'msds_no',
    width: 200,
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
    width: 90
  },
  {
    title: '관리',
    key: 'action',
    width: 190,
    align: 'center',
    render (row) {
      return [
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            tertiary: true,
            style: 'margin-right:6px;',
            onClick: () => openDetail(row)
          },
          {
            default: () => [
              h(
                NIcon,
                { style: { marginRight: '4px' } },
                { default: () => h(PencilOutline) }
              ),
              '상세 / 수정'
            ]
          }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            tertiary: true,
            onClick: () => confirmDelete(row)
          },
          {
            default: () => [
              h(
                NIcon,
                { style: { marginRight: '4px' } },
                { default: () => h(TrashOutline) }
              ),
              '삭제'
            ]
          }
        )
      ]
    }
  }
]

async function fetchDocs () {
  listLoading.value = true
  try {
    const resp = await axios.get(`${API_BASE_URL}/msds/documents`)
    docs.value = Array.isArray(resp.data) ? resp.data : []
  } catch (err) {
    console.error(err)
  } finally {
    listLoading.value = false
  }
}

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
  padding: 16px 0 32px;
  box-sizing: border-box;
  height: calc(100vh - 80px);
}

/* 메인 카드가 페이지 높이를 꽉 쓰도록 */
.list-card {
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  height: 100%;
}

/* 카드 내용부를 flex column으로 만들어서 하단 영역만 스크롤 */
.list-card :deep(.n-card__content) {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: 0;
}

/* 테이블이 들어가는 부분만 세로 스크롤 */
.table-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 카드 헤더 – shmsRegulApi랑 같은 느낌 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

/* 관리 버튼 영역 (상세 / 수정 + 삭제) */
.action-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}
</style>
