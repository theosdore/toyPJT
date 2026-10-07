# 커밋 규칙 (Commit Convention)

> **대상**: `fileNamer` 모든 개발자  |  **위반 시**: PR 머지 거부 가능

---

## 1. 기본 형식

```
<type>(<scope>): <subject>

<body>
```

예시:

```
feat(core): add auto padding calculator for batch numbering

- count entries per group and determine optimal digit count
- threshold: 1->1digit, 10->2digits, 1000->4digits
- affects date-grouping and skip-date-mode equally
```

---

## 2. Type (prefix) 목록

| Prefix | 용도 |
|--------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 리팩토링 (동작 변경 없음) |
| `test` | 테스트 코드 추가/수정 |
| `docs` | 문서 업데이트 |
| `style` | 포맷팅, 린트 수정 (코드 동작 변화 없음) |
| `ci` | CI 설정 |
| `chore` | 빌드 시스템, 패키지 매니저, 덤프 등 |

---

## 3. Scope 제한

이 프로젝트는 단순하여 scope 는 생략을 권장한다.

권장:
```
feat(): implement date parser with 10 format patterns
```

선택적 (여러 모듈에 걸친 작업일 때만):
```
feat(core): add calcPadding()
fix(renderer): fix checkbox sync on DiffTable
```

---

## 4. Subject 규칙

- **영문 필수** — 한글 절대 금지
- 명령형 동사로 끝맺음 (`do not` 사용 금지)
- 50자 이내 (한 줄이어야 함)
- 첫 글자 대문자X (소문자로 시작)
- no trailing punctuation

좋음:
```
implement date extraction from filename
fix duplicate name collision handling
add drag-and-drop folder support
```

나쁨:
```
구현: 날짜 파서
날짜 파서 구현 완료!
@@@버그수정@@@ 중복파일 충돌 처리 수정
```

---

## 5. Body 규칙

1. 보통 첫 번째 줄은 요약으로 subject 와 겹친다.
2. 각 항목 앞에 `- ` 를 붙인다.
3. 구체적 행위와 결과를 포함해 맥락을 설명한다.
4. "이 PR을 한 줄 요약하면..." 느낌이 아니라 "이 결정의 근거 + 영향 범위" 위주로 쓴다.

---

## 6. Commit 단위 원칙

### 한 커밋에 넣을 내용을 판단하는 질문

- 이 변경을 특정 다른 의존성 없이 독립적으로 되돌릴 수 있는가?
- diff 가 200줄을 초과하는가? → 넘으면 분할 고려
- 커버하는 영역이 2개 이상의 unrelated feature인가? → 별도 커밋

### 예시: 잘못된 하나의 커밋 vs 올바른 여러 커밋

잘못됨 (커밋 한 번)
```
feat(add): add new project

- create 20 files
- write unit tests
- update readme
```

올바름 (3 커밋)
```
git commit -m "core/parser.ts + test"
git commit -m "core/transformer.ts + test"
git commit -m "spec/README.md updates"
git commit -m "src/main.js entry point setup"
```

---

## 7. Branch 관리

```
main ──배포용 안정 버전───
dev ──최신 개발 통합──┐
                     ├── feat/my-cool-feature ← 여기서 작업 시작
                     │    (/make small commits)
                     └─────► merge request → review → main
a ──임시 보관(__unused__)──┐
                            └── 핫픽스 전용 (필요시 운영팀이 분리 생성)
```

### 브랜치 네이밍 컨벤션

| 상황 | 패턴 | 예시 |
|------|------|------|
| 새 기능 (위임받은 것만) | `feat/<short-topic>` | `feat/date-parser` |
| 긴급 패치 (운영 중 발생) | `hotfix/<ISSUE-KEY>` | `hotfix/EUS-42-rename-failure` |
| 실험/태스크분리(실험적 아이디어) | `ideas/<experimental-name>` | `ideas/exif-mode` |

---

## 8. Pull Request 절차

```
[개발]                [리뷰어]              [CI]                    [메인]
y   create branch      assign reviewer        pass lint             review approved
  push                 ask @theosdore          pass typecheck         squash merge
  commit × N                      respond within           unit pass (<8s)
                                  1hr                        e2e pass (CI=true 일 때만)
                                                 ↓
                          PR create  →  cla:oversight label
                                  ↓
                          approve + react ✅
                                  ↓
                          merge to main
```

**강제 규칙**

| 단계 | 조건 | 판정 |
|------|------|------|
| 라벨링 | `cla:oversight` 미부착 시 리뷰 불발 | 자동 경고 |
| 리뷰 대기 | 담당자에게 할당 후 48h 내 응답 없으면 CC 민들릭 탭화 | nudge ;
| CI 통과 | All checks green 상태에서만 진행 | 차단 |
| Merge 방법 | Squash & Merge (또는 Rebase). Interactive rebase는 유지용으로만 사용 | 강제 |
| 스크립트 실행 | `./scripts/sanity-check` 브랜치 점검 수행 (선택) | 참고 |

---

## 9. 코드 품질 요구사항 (리뷰 체크리스트)

아래 항목은 리뷰어가 반드시 확인해야 한다.

- [ ] 한 파일에 여러 책임이 있는가? → Split 하거나 class 분리한다.
- [ ] `src/core/` 파일은 순수 함수인가? → side effect (console.log, setTimeout 등)가 없다.
- [ ] import 순서가 표준 → 외부 -> 내부 인가? → ESLint rule 으로 강제한다.
- [ ] 바이낸스닝(unpaired JSDoc)이 없는가?
- [ ] 불필요한 `// TODO:` 또는 `// FIXME:` 가 남아 있는가?
- [ ] 에러 메시지가 이해 가능한 영어인가?
- [ ] 선택된 파일 변형 로직에 트랜잭션 동일한 경로가 존재하지 않는가? (동일 출력 보장?)

---

## 10. 실수 했을 때 대응

**초기 커밋 실수 (이미 push)**

```bash
git reset HEAD~     # un-push 된 prev commit 까지 돌아감
git push origin --force-with-lease  # 서버도 밀기
```

**너무 큰 커밋 (merge conflict 유발)**

```bash
git rebase -i HEAD~N  # 최근 N 개 재개방 → pick / squash 재조합
git push --force-with-lease
```

---

## 부록: 자주 쓰는 명령어

```bash
# 이 코드의 convention 설명 보기
cat spec/CORE_DESIGN.md
cat ./COMMIT_RULES.md

# 커밋 메시지 워딩 예시 모음 (사용자가 참고)
echo "$ git commit ... examples below:
  feat(): add auto padding calculator
  fix(core): correct index overflow in batch grouping
  test(serializer): cover skip mode collision case
"

# preview of this repo's file tree
find . -name '*.ts' -o -name '*.vue' -o -name '*.js' -o -name '*.json' | sort
```
