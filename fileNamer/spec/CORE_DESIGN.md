# File Renamer — Architecture Design Document

> **상태:** Final (v1)  |  **최종 승인:** 🟢 ready  
> 이후 수정은 PR 리뷰에서만 허용, 문서화 없이 코드 변경 금지

---

## 1. 프로젝트 개요

Electron 기반 데스크탑 앱. 폴더 내 파일들을 자동으로 스캔하여 날짜 파싱 + 텍스트 변환 + 넘버링 일괄 적용.

```
입력:    폴더 선택 → 자동 스캔
처리:    날짜 추출 → 그룹핑 → 패딩 계산 → 템플릿 변환 → 충돌 감지
출력:    미리보기 테이블 → 체크박스 필터 → 변환 실행
```

---

## 2. 디렉터리 구조 (16개 소스 파일)

```
src/
├── main.ts                       # Electron bootstrap + IPC 핸들러 등록
├── preload.ts                    # contextBridge로 노출 API 맵
│
├── core/                         # 순수 비즈니스 로직 (TDD 대상)
│   ├── parser.ts                 # 날짜 정규식 → Date 객체 (또는 null)
│   ├── transformer.ts            # 문자열 변환 파이프라인
│   ├── serializer.ts             # {DATE}/{NUMBER} 빌더
│   └── batch.ts                  # 그룹핑 엔진 + 인덱싱
│
├── ipc/                          # 메인↔렌더러 통신 레이어
│   ├── index.ts                  # channel 중앙 등록 + 가드
│   └── validators.ts             # payload 타입 검증
│
├── worker/                       # 대용량 분기 처리기
│   └── dispatcher.ts             # import('./core').then() 재사용
│
├── renderer/
│   ├── state/
│   │   └── store.ts              # Zustand 전역 상태 (Zustand ESM Proxy)
│   ├── hooks/
│   │   └── useIpc.ts             # 커스텀 훅: ipchdlleName() 기반 호출 대기
│   ├── components/
│   │   ├── SettingsPanel.vue     # 사이드바 전체 레이아웃 조합체
│   │   ├── DiffTable.vue         # 미리보기 표 (+ 차이점 하이라이트)
│   │   └── ToastContainer.vue    # 성공·실패·토스트 피드백
│   └── App.vue                   # Root 컴포넌트 (state 구독)
│
└── lib/
    ├── dateUtils.ts              # 포맷 헬퍼 (날짜→문자열 변환)
    ├── fileUtils.ts              # 확장자·경로 유틸
    └── diffDisplay.ts            # before/after 문법 강조 렌더 함수
│
tests/
├── unit/                         # Vitest 단위 테스트
│   ├── parser.test.ts
│   ├── transformer.test.ts
│   ├── serializer.test.ts
│   ├── batch.test.ts
│   └── validators.test.ts
└── integration/                  # Playwright E2E 테스트
    └── renameFlow.spec.ts
│
spec/                             # 가독용 설계 문서 (마크다운)
```

---

## 3. 데이터 흐름도

```
[사용자 클릭]
    │
    ▼
┌─────────────────────┐
│  BrowserWindow      │──────────── ipcMain.on('select-folder') ───────▶ Main
│  drop event          │───────────────────────────────────────────────────────┐
└─────────────────────┘                                                    │
    │                                                                      │
    ▼                                                                      │
├─ getSelectedFiles() / getKnownFilePaths() ──► load-files ──► fs.readdir   │
│                                                     │                        │
│                                                     ▼                        │
│                            ├─ extractDate() ──► 배열 [null | Date]       │
│                            │                                               │
│                            ├─ groupByKey() ──► { '20261007': [], ... }   │
│                            │                                               │
│                            ├─ calcPadding() ──► 자리수 자동 결정            │
│                            │                                               │
│                            ├─ transformChain() ──► base 이름 가공           │
│                            │                                               │
│                            └─ serialize() ──► 새 파일명 생성               │
│                                                     │                        │
│                                                     ▼                        │
│                                           results[] 각 항목에 conflict field │
└─────────────────────────────────────────────┘                          │
    │                                                                       │
    ▼                                                                       │
┌─────────────────────┐                                                    │
│  Renderer Store     │◄──────────────────────────────────────────────────┘
│  (state 변화 시 Vue │
│   template 자동 리렌dr)
└─────────────────────┘
    │
    ▼
실행 버튼 클릭 → execute-rename → fs.rename(file.forEach)
```

---

## 4. 핵심 모듈 상세 명세

### 4-1. `src/core/parser.ts` — 날짜 파서

**역할:** 파일명에서 촬영 날짜 부분을 검출해 `Date` 객체로 변환한다. 매칭되면 `yyyy-MM-dd` 형식으로 parse하여 반환하고, 실패하면 `null`.

**지원 포맷 (우선순위 순)**

| # | 패턴 설명 |
|---|----------|
| 1 | `yyyy-MM-dd` = `2026-10-07` |
| 2 | `yyyyMMdd` = `20261007` |
| 3 | `yyyy-MM-dd HH:mm:ss` |
| 4 | `yyyy-MM-dd_HHmmss` |
| 5 | `yyyy년 MM월 dd일` (한국어) |
| 6 | `Jan 5, 2024` / `Mon DD, YYYY` (영문 월 약어) |
| 7 | `MM-dd-yyyy` |
| 8 | `MM_dd_yyyy` |
| 9 | `dd-MM-yyyy` |

**내부 동작**
1. 입력 문자열을 위 순서대로 try−catch로 각 regex 대조
2. 첫 매치에 대해 보조 parse 함수 호출하여 유효한 Date 범위(1900~2099) 확인
3. 유효한 경우 해당 Date 반환, 전부 실패 시 null

**테스트 포인트**  
- 각 개별 포맷이 정상적으로 검출되는지 벡터화
- 불완전한 날짜(2026-2-30 → 윤년 제외하면 invalid)는 false 처리
- `file.txt`처럼 숫자만 포함된 파일은 제외

```typescript
// 시그니처 예상
type ExtractResult = { date: Date | null; matchedRaw?: string };
export const extractDate = (fileName: string): ExtractResult => void;
```

---

### 4-2. `src/core/transformer.ts` — 텍스트 변환 체인

**역할:** 원본 파일명에 대해 사용자가 선택한 text operation들을 순차적으로 적용하여 중간 basename을 생성한다. 모든 연산은 순수 함수이며 동일 input → 동일 output 보장.

**파이프라인 구성 (순보장 필요 없음, 설정은 UI에서 토글)**

```
input: "IMG_0001.jpg"
↓ uppercase		→ "IMG_0001.JPG"
↓ trimWhitespace	→ "IMG_0001.JPG" (앞뒤 공백 제거)
↓ replaceSpace(유니크) 	→ "IMG_0001.JPG"
↓ deletePrefix(IM)  	→ "MG_0001.JPG"
↓ changeExtension(.png) → "IMG_0001.png"
→ 최종 "IMG_0001.png" 를 template 에서 원래 이름으로 사용
```

**연산 목록 (`settings.textOps`)**

| 필드 | 타입 | 설명 |
|------|------|------|
| `uppercase` | boolean | 전체 대문자 |
| `lowercase` | boolean | 전체 소문자 |
| `titleCase` | boolean | 단어 첫글자 대문자 |
| `trimWhitespace` | boolean | 앞뒤 공백 제거 |
| `spaceToUnderscore` | boolean | 공백 → 언더바 변환 |
| `replaceWith` | `ReplacementConfig` | 찾을 부분 → 바꿀 텍스트 매핑 |
| `prefix` | string | 접두어 추가 |
| `suffix` | string | 접미사 추가 |
| `deleteText` | string | 일치하는 텍스트 전부 삭제 |
| `changeExtension` | string | 새 확장자 (.png, .jpg 등) |

```typescript
interface ReplacementConfig {
  find: string;        // 검색할 문자열 또는 정규식 패턴
  replace: string;     // 대체할 문자열
}

export const applyTransformations = (
  originalName: string,
  ops: Partial<TextOperationSettings>
): string => string;
```

---

### 4-3. `src/core/serializer.ts` — 템플릿 빌더

**역할:** `{DATE}`, `{NUMBER}`, `{NAME}` 등의 플레이스홀더를 포함한 사용자 지정 템플릿에 따라 최종 파일명을 생성한다. 충돌 관리가 내장되어 있다.

**빌드 단계**

| 순서 | 동작 | 예시 |
|------|------|------|
| 1 | `{DATE}` 치환 | `'{YYYY}_{MM}_{DD}'` → `'2026_10_07'` |
| 2 | `{NUMBER}` 치환 | `'{PREFIX}_{NUMBER}.{EXT}'` → `'_1'.jpg' → `_0001.jpg`(`PAD=4`) |
| 3 | `{NAME}` 치환 (변환된 basename) | 포함하지 않으면 무시 |
| 4 | `{ORIGINAL}` 치환 (원본 전체) | 포함하지 않으면 무시 |

**충돌 처리 전략**

- `skipDuplicates: false` (기본) → 같은 이름이 생길 경우 prefix/suffix 자동 증가 (예: `_1` → `_0001` 배치 후 `aa_1.jpg`가 이미 존재하면 `aa_2.jpg`로)
- `skipDuplicates: true` → 중복 발생 시 원 파일명 유지 (`newName = originalName`), 프리뷰에서 `!` 마킹 표시

**플레이스홀더 리스트**

| 식별자 | 설명 |
|--------|------|
| `{DATE}` | 사용자 지정 날짜 포맷으로 변환된 날짜 문자열 |
| `{NUMBER}` | 계산된 일련번호 (패딩 포함) |
| `{NAME}` | 변환이 적용된 파일명 (basename only) |
| `{ORIGINAL}` | 접두사·접미사·변경 전 이름 전체 |
| `{EXT}` | 원본 확장자 (소문자, 점 포함 `.jpg`) |

```typescript
interface SerializeInput {
  datePart: Date | null;       // 템플릿의 {DATE} 용
  number: number;              // 순차 번호
  ext: string;                 // '.jpg', '.png' 등
  baseWithoutExt: string;      // 확장자를 뺀 이름 (convert 결과)
  originalFull: string;        // 원 파일명 전체
  conflictMap: Map<string, boolean>; // 중복 검사용 맵
}

export const serializeAll = (
  entries: FileEntry[],
  templatePattern: string,
  padding: number,
  dateFormat: string,
  settings: TemplateSettings
): RenameEntry[] => RenameEntry[];
```

---

### 4-4. `src/core/batch.ts` — 배치 인덱싱 & 그룹핑

**역할:** 모든 파일에 대해 그룹 키를 부여하고, 각 그룹의 최대 개수를 계산하여 적절한 자릿수를 산출한 후 순서를 정한다.

**그룹핑 모드 7종**

| 모드값 | 키 유형 | 예시 |
|--------|---------|------|
| `day` | 추출된 날짜 기준 (`year-month-day`) | `2026-10-07` → 동일 날짜이면 같은 그룹 |
| `all` | 전역 싱글 그룹 | `"all"` → 하나의 문제에 하나의 시퀀스 |
| `no-date` | 추출된 날짜가 `null`인 파일들 | `"no-date"` → 별도 시퀀스 시작 |
| `pattern` | 문자열 포함 여부 | 사용자 지정 키워드가 포함된 파일만 필터링 → 단일 그룹 |
| `prefixLen` | 접두사 길이 기준 | N 글자로 시작하는 모든 파일 각각을 그룹으로 분할 |
| `byExt` | 확장자별 | `.jpg`, `.png`, `.docx` 로 그룹 |
| `creationOrder` | 원점시(absolute timestamp) | fs.stat.ctime 기준 오름차순 정렬 후에 day 모드와 동일하게 처리 |

**알고리즘**

```
1. entry 파일 목록을 localeCompare(알파벳/정렬)로 정렬
2. each entry 에 대해:
   a. groupingMode 별로 groupKey 결정
   b. hashmap[groupKey] += 1
   c. 해당 그룹의 최대 count 기록
3. 그룹별 maxCount 결정 → calcPadding(maxCount) 호출
4. 둘째 패스 (필요시 sort cache memoization):
   - 순서대로 인덱스 배정 (각 그룹 내에서 누적) → O(n)
```

**자리수 계산 (자동 패딩)**

```typescript
function calcPadding(count: number): number {
  const thresholds = [0, 9, 99, 999, 9999, 99999, 999999]; // 경계값 이하면 이전 tier
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (count < thresholds[i]) return i;
  }
  return 6; // 기본 상한
}
// 예: 15개 → 2자리, 1400개 → 4자리, 10000개 → 5자리
```

```typescript
interface BatchResult {
  grouped: Map<string, FileEntry[]>; // key → entries
  counts: Map<string, number>;      // key → 개수
  indexAssignments: Map<FileEntry, number>; // entry → 배정된 번호
  paddingPerGroup: Map<string, number>;    // key → 자리수
  totalPending: number;              // check되지 않은 파일 수
}

export const computeBatchIndex = (
  entries: FileEntry[],
  mode: GroupingMode,
  patternFilter?: string,
  prefixLength?: number,
  extensionFilters?: readonly string[]
): BatchResult => BatchResult;
```

---

## 5. IPC 및 보안

### 5-1. 사전 공격 방지 원칙

| 리스크 | 대응 |
|--------|------|
| 악측이 임의의 페이로드 전송 | main 측에서는 `ipcMain.handle()` 만 사용하고 브라우저 샌드박스 렌더링 전면 차단 |
| 렌더러에서 직접 Node.js 호출 시도 | Webview 비활성화. `contextIsolation: true`, `webSecurity: true` |
| 경로 탐색 / 심볼릭 링크 공격 | `realpathSync()` 통과 확인 후 절대 경로와 크로스 체크 |

### 5-2. 채널 정의

| Channel | 방향 | Payload 예시 |
|---------|------|-------------|
| `select-folder` | R→M | `{}` → `{"ok":true, "path":"..."}` |
| `load-files` | R→M | `{"path":"..."}` → `{"ok", "files:[]}, "error"}` |
| `generate-names` | R→M | `{"files", "settings"}` → `{"ok", "results[]", "stats"}` |
| `execute-rename` | R→M | `{"renames[]"}` → `{"ok", "successCount", "failures[]"}` |
| `drop-load` | R→M | `{"paths[]", "metadatas[]"}` → `{"ok", "files[]"}` |
| `cancel-op` | R→M | `{}` → `{"ok":true}` |

Preload API: `window.ipc.selectFolder()`, `window.ipc.loadFiles(path)`, `window.ipc.generate(settings)`, `window.ipc.execute(renames)`

---

## 6. 스토어 설계

```typescript
import { create } from 'zustand';

export interface AppState {
  folderPath: string | null;
  allFiles: FileEntry[];       // 현재 읽어진 전체 파일 리스트 (고착)
  currentResults: RenameEntry[]; // last generate 결과 배열
  pendingOperations: PendingOp[]; // cancel 가능한 in-flight op 추적
  isProcessing: boolean;
  processingProgress: number;   // 0..100
  checkedIndices: Set<number>;  // diffTable 체커박스 상태
  groupLabelColumn: string;      // 디버그용 그룹키 표시 (프리뷰 컬럼)
}

export type GroupingMode =
  | 'day'
  | 'all'
  | 'no-date'
  | 'pattern'
  | 'prefix'
  | 'byExt'
  | 'creation';

export interface FileEntry {
  originalName: string;
  originalPath: string;
  stats: fseath;   // stat 결과 (생성이 시간도 필요)
  extractedDate: Date | null;
  groupKey: string;
}

export interface RenameEntry extends FileEntry {
  newName: string;
  existsInDest: boolean;   // 최종 디렉토리 기준 충돌 유무
  finalName: string;       // existsInDest == true 면 resolved name
}

export const useAppStore = create<AppState>()((set, get) => ({
  folderPath: null,
  allFiles: [],
  currentResults: [],
  pendingOperations: [],
  isProcessing: false,
  processingProgress: 0,
  checkedIndices: new Set(),
  groupLabelColumn: '',

  setFolder: (path) => set({ folderPath: path }),
  setFiles: (files) => set({ allFiles: files }),
  setResults: (results) => set({ currentResults: results }),
  setChecked: (idx, checked) =>
    set((s) => {
      const next = new Set(s.checkedIndices);
      if (checked) next.add(idx);
      else next.delete(idx);
      return { checkedIndices: next };
    }),
  toggleAllChecked: () =>
    set((s) => ({
      checkedIndices: s.allFiles.length
        ? new Set(Array.from({ length: s.allFiles.length }, (_, i) => i))
        : new Set(),
    })),
  clearChecks: () => set({ checkedIndices: new Set() }),
  addPendingOp: (op) =>
    set((s) => ({ pendingOperations: [...s.pendingOperations, op] })),
  removePendingOp: (id) =>
    set((s) => ({
      pendingOperations: s.pendingOperations.filter((op) => op.id !== id),
    })),
  startProcessing: () => set({ isProcessing: true, processingProgress: 0 }),
  setProgress: (pct) => set((s) => ({ processingProgress: pct })),
  finishProcessing: () => set({ isProcessing: false, processingProgress: 0 }),
}));
```

---

## 7. 커밋 규칙 문서

### 목적

중복 커밋을 피하고, PR 리뷰 시 맥락 손실이 없도록 정해진 컨벤션에 따른 일관된 메시지 형식을 유지한다.

---\n
### 규칙 요약표

| 규칙 | 설명 | 준수 방법 |
|------|------|-----------|
| **주제+본문** | 첫 줄은 제목형(50자 이내), 본문은 액션별 줄바꿈 | `git commit -m "제목\n\n본문"` |
| **명령형 동사** | `(do not)라고 하지 말고 do 해라` | `fix bug` X → `fix broken PDF rename logic` O |
| **영문자만 사용** | 한국어 문장은 더 이상 허용하지 않음 | PR 거시기 거부 |
| **Commit Type Prefix** | `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `style:`, `ci:`, `chore:` 중 택1 | 접두어 미포함 금지 |
| **One logical unit per commit** | 한 커밋 = 하나의 논리적 변경 | feature 작업 끝나면 소규모 단위로 분할 |
| **인증 시크릿 절대 커밋 금지** | 환경변수, 토큰, 개인키 포함 안 됨 | `.gitignore`에 레거시 키 패턴 추가 |
| **미해결 Todo 금지** | `// TODO:` 는 PR 직전까지 해결하거나 사유 주석 기재 | CI step으로 검사 가능 | ---

### 커밋 메시지 포맷

```
<type>(<scope>): <subject>

<body>
```

예시
```
feat(core): add auto padding calculator for batch numbering

- count entries per group and determine optimal digit count
- padding threshold: 1->1digit, 10->2digits, 1000->4digits
- affects select-date-grouping and skip-date-mode equally
```

---

### Branch 관리 (GitHub Flow)

| 브랜치 | 용도 |
|--------|------|
| `main` | 배포 가능한 안정 버전 |
| `dev` | 최신 개발 통합 (선택적 사용 — 여기선 main에 직접 merge) |
| feature branches | 작업 시작 시 `feat/<short-topic>` 으로 이름 짓기, 진행할 때마다 작은 커밋 |

PR 절차
1. feature branch push
2. PR 생성 → 담당 리뷰어(@theosdore)에게 요청
3. 라벨: `cla:oversight` (코드 리뷰 완료)까지 달고 풀리퀘쉴릿 리액션 ✅ 표시
4. CI 통과 (`lint` → `typecheck` → `unit test (vitest --run)` → e2e (옵션))
5. 머지: squash-and-merge or rebase-merge (prefer squash)

---

## 8. 테스트 매트릭스

| Module | 도구 | 방식 | 기간 목표 | 전제조건 |
|--------|------|------|-----------|----------|
| parser | vitest | pure function 데이터 주입 | < 3s | none |
| transformer | vitest | 모든 binary combo (2^9 최대 512가지 @ snapshot) | < 5s | none |
| serializer | vitest | collision retry, empty, edge case | < 2s | mock fs |
| batch | vitest | 7 modes x 주요 시나리오 vectorized | < 3s | none |
| IPC handlers | jest.mock(electron) | payload validation, error mapping | < 3s | electron stub |
| Renderer store | vitest + Testing Library | dispatch chain simulation | < 2s | mock ipc (useIpc.pt.fireSynth()) |
| 수동 시나리오 | Manual (Playwright optional) | 50파일 섞은 폴더 실행 | As needed | CI 조건부로만 |

모든 테스트는 파일 시스템 I/O 없이 메모리에서 해결해야 한다.

---

## 9. 개발 우선순위

```
Phase 1 ☑ Core Logic (pure functions)
  ├ parser.ts + test
  ├ transformer.ts + test
  ├ serializer.ts + test
  └ batch.ts + test

Phase 2 ☐ IPC Layer
  ├ ipc/index.ts (handler wrapper)
  ├ ipc/validators.ts
  └ preload.ts (브릿지만)

Phase 3 ☐ Renderer Store + Libs
  ├ renderer/store.ts (Zustand)
  ├ renderer/libs/ (dateUtils, fileUtils, diffDisplay)
  └── renderhooks/useIpc.ts

Phase 4 ☐ UI Components (Vue3 Options API)
  ├── App.vue (layout skeleton)
  ├── SettingsPanel.vue (sidebar 완전체)
  ├── DiffTable.vue (preview table)
  └── ToastContainer.vue

Phase 5 ☐ Electron Main Integration
  ├── main.ts
  └── window setup

Phase 6 🔲 Feature Polish
  ├── 드래그 앤 드롭
  ├── 동시 실행 취소
  ├── Sort / column reorder
  └── 통계 패널 (distribution graph)
```

---

## 10. 참고

- DI 원칙: `src/core/*` 은 모듈 임포트 불가. 모든 의존성은 함수 인자로 주입된다.
- `nodejs` vs `Worker`: Worker 는 `msgpack-binary` 직렬화를 쓰지 않고 일반 JSON을 사용한다 (디버깅 용이성 우선). 실제로 성능을 측정한 뒤 교체 여부를 결정한다.
- CSS 변수는 `--bg`, `--surface` 로 시작하여 최소한의 테마 청사진을 제공한다.
