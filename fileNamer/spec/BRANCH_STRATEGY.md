# 브랜치 계획 (Branch Strategy)

> **목적**: PR 리뷰 요청 전에 어떤 브랜치 흐름인지 공유 + 충돌 방지.

---

## 1. 현재 상태

```
├── main  (원본: master → 변환 완료)
│          ├(아직 커밋 없음)└────────┐
└── ...                             │
                                  ▼
                  [커밋 쌓일 브랜치들]
```

`main` 브랜치는 **원격에 존재하지 않음** (`origin/main` 없음).
최초 푸시 시 `origin/main` 이 생성된다.

---

## 2. 작업 순서

### Step 1 — 뼈대 커밋 (현재 위치 → 원격 동기화)

```bash
git add -A && git commit -m "initial: project skeleton with design docs"
git remote add origin https://github.com/theosdore/toyPJT.git
git branch --set-upstream-to=origin/main
git push -u origin main
```

이후 모든 feature 는 이 `main` 을 base 로 한다.

---

### Step 2 — 각 기능 브랜치 생성 패턴

| 순서 | 브랜치명 | 범위 |
|------|----------|------|
| Phase 1a | `feat/core-parser` | parser.ts + test |
| Phase 1b | `feat/core-transformer` | transformer.ts + test |
| Phase 1c | `feat/core-serializer` | serializer.ts + test |
| Phase 1d | `feat/core-batch` | batch.ts + test |
| Phase 2 | `feat/ipc-layer` | preload.ts + handlers |
| Phase 3 | `feat/renderer-store` | store.ts + lib utils |
| Phase 4 | `feat/ui-components` | App.vue + SettingsPanel + DiffTable |
| Phase 5 | `feat/electron-main` | main.ts + window setup |

모든 브랜치는 `main` 에서 분기 → 작업 완료 후 PR.

---

### Step 3 — 실행 중 분기 예시 (제네레이터 필요 시)

```
main              ideas/exif-mode    ← 실험 태스크 분리
     ↑           (바로 merge 예정)
     |
feat/date-group  ← 실제 작업 중 (커밋 누적 가능)
```
- `ideas/*` 브랜치는 즉시 merge 또는 폐기 (개발 리소스 절약).
- 무거운 계산이 필요한 코드만 별도로 분리.

---

## 3. Merge 전략 요약

```
Phase 각각 하나의 PR → squash merge into main
feature 브랜치를 새로 꼬지 않고 main 기준 연속으로 머지
```

예시:
```
● Phase 1a: Parser feat, no conflict, squash-merge
      ● Phase 1b: Transformer feat, small change, fast-forward possible
            ● Phase 1c: Serializer feat, extends existing code, rebase quick
                  ● Phase 1d: Batch feat, changes nothing before, no issue
                        ...
```

충돌 발생 시 Rebase 대신 Squash & Merge 를 선택하여 단순히 병합할 내용만 추린다.
리베이스 이력 관리가 필요하면 가상으로 rewind 할 뿐이다.

---

## 4. 유용한 명령어

```bash
# 새로운 브랜치 만들기
 git checkout -b feat/<short-topic>

# main 으로 돌아가기
 git checkout main

# 원격까지 미리 fetch (필요시)
 git pull --rebase origin main

# 현재 상태 확인
 git log --oneline --graph --all
```

---

## 5. 점검 사항 (PR 올리기 전 자가 진단)

- [ ] Git status clean? (`git status` → "nothing to commit" 제시)
- [ ] 로그에 불필요한 WIP 커밋 없이 깔끔한가?
- [ ] **최종 버전과 main 의 차이만 포함되는가?** (중간용 임시 커밋 없는지)
- [ ] 커밋 메시지가 spec/COMMIT_CONVENTIONS.md 와 일치하는가?

---

> 이 문서는 처음에 작성되었으나 계속 업데이트되면서 진화한다.
> 분기를 깨지 않고 단순하게 가져가자.
