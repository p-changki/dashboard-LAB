# dashboard-LAB Migration Plan

## 현재 목표

기존 개인용 로컬 대시보드를 `dashboard-LAB` 보일러플레이트로 전환한다.

## 이번 1차 패치에서 반영한 것

- 앱 메타 추가
- 로컬스토리지 키/브라우저 이벤트 네임스페이스를 `dashboard-lab`으로 통합
- 앱 타이틀과 UI 브랜드명을 `dashboard-LAB`으로 변경
- 런타임 설정 스캐폴드 추가
- PRD 저장 경로를 runtime config로 이동
- CS 컨텍스트 루트와 프로젝트 스캔 루트를 runtime config 기반으로 변경
- Obsidian vault를 하드코딩 대신 런타임 후보 탐색 기반으로 변경
- 런처/로그/session 파일명을 `dashboard-LAB` 기준으로 변경
- `.gitignore`에 dev 산출물과 로컬 상태 제외 규칙 추가

## 남아 있는 주요 작업

### Phase 1. Settings Foundation

- 사용자 설정 저장 형식 결정
- 첫 실행 온보딩 API 설계
- 설정 편집 화면 추가

### Phase 2. Runtime Refactor

- Doc Hub parser의 스캔 루트 설정화
- File Manager 보호 경로/허용 루트 설정화
- System/Projects maintenance 계열의 workspace root 분리
- Call/CS/Skill history 저장 위치 분리

### Phase 3. Data Boundary

- 실제 사용자 상태를 레포 밖으로 이동
- 샘플 데이터와 실데이터 분리
- private artifact 기본 제외 정책 강화

### Phase 4. Onboarding Experience

- 자동 감지 결과 UI
- 승인/거절/재설정 UX
- 기능별 readiness 상태 표기

### Phase 5. Distribution

- README 재정리
- `.env.example` 또는 config template 추가
- private GitHub boilerplate 레포 출범

## 즉시 다음 작업 권장 순서

1. 온보딩용 runtime doctor 응답 스키마 만들기
2. 사용자 설정 저장소 만들기
3. Obsidian/Projects/CS 경로를 설정 화면에서 바꿀 수 있게 만들기
4. `data/state` 계열을 사용자 데이터 디렉터리로 분리하기

## 성공 기준

- 다른 사용자가 클론 후 앱을 실행할 수 있다
- 앱이 환경을 자동 감지한다
- 사용자가 연결할 경로를 승인할 수 있다
- 승인 이후 동일 기능군을 자기 환경에서 바로 사용할 수 있다
- 개인 실데이터 없이도 앱이 깨지지 않는다
