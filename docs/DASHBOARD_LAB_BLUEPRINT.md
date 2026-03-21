# dashboard-LAB Blueprint

## 목적

`dashboard-LAB`은 개인용 로컬 대시보드를 그대로 복사하는 프로젝트가 아니라, 어떤 사용자든 클론 후 자기 환경에 연결해서 사용할 수 있는 **설정 기반 로컬 워크스페이스 보일러플레이트**를 목표로 한다.

핵심 방향은 다음과 같다.

- 코드베이스는 공용
- 데이터와 경로는 사용자별
- 기능은 동일한 엔진 위에서 동작
- 자동 연결은 `자동 감지 + 사용자 승인` 방식으로 설계

## 제품 모드

### 1. Local Mode

1차 제품 모드. 각 사용자가 자기 컴퓨터에서 실행한다.

- 로컬 CLI 감지
- 로컬 폴더 연결
- 로컬 파일 스캔
- 로컬 저장
- localhost 전용 실행

### 2. Hosted Mode

2차 확장 모드. 여러 사용자가 한 서버에서 쓴다.

- 로그인
- 사용자별 워크스페이스 격리
- 오브젝트 스토리지
- 작업 큐
- 별도 보안 설계

현재 코드베이스는 Local Mode를 기준으로 확장하는 것이 맞다.

## 설계 원칙

### 1. 경로 하드코딩 금지

개인 절대 경로를 코드에 박지 않는다.

- `projectsRoot`
- `obsidianVault`
- `prdSaveDir`
- `csContextsDir`
- `allowedRoots`

### 2. 자동 연결 대신 자동 제안

앱이 할 일:

- OS 확인
- CLI 존재 여부 감지
- 기본 후보 경로 찾기
- 연결 가능한 항목 제안

사용자가 결정할 일:

- 어떤 폴더를 연결할지
- 어떤 CLI를 기본 런너로 쓸지
- 어떤 기능을 켤지

### 3. 데이터는 레포 밖 또는 사용자 설정 루트에 보관

레포에는 코드와 샘플만 두고, 실제 상태와 생성 산출물은 사용자 런타임 경로에 저장한다.

### 4. 위험 기능은 허용 루트 안에서만 동작

- Terminal
- File Manager
- Projects maintenance
- CS context write

## 아키텍처

### Core

도메인 규칙과 기능 흐름.

- Call to PRD
- AI Skills
- CS Helper
- Projects summary
- Doc/Obsidian indexing

### Runtime Config

사용자 환경에서 결정되는 값.

- 앱 이름/슬러그
- 저장 경로
- 스캔 루트
- 선택된 vault
- 허용 루트

### Providers

실제 로컬 환경과 연결되는 어댑터 층.

- filesystem provider
- cli runner provider
- project scanner provider
- vault provider

### UI

- 온보딩
- 설정
- 대시보드
- 기능 탭

## 1차 설정 모델

현재 스캐폴드 기준 환경 변수:

- `DASHBOARD_LAB_PROJECTS_ROOT`
- `DASHBOARD_LAB_OBSIDIAN_VAULT`
- `DASHBOARD_LAB_PRD_SAVE_DIR`
- `DASHBOARD_LAB_CS_CONTEXTS_DIR`

런타임 기본값:

- `projectsRoot`: `~/Desktop` 우선, 없으면 현재 workspace
- `obsidianVault`: iCloud/일반 Obsidian 후보를 자동 탐색
- `prdSaveDir`: `<workspace>/data/prd`
- `csContextsDir`: `<workspace>/cs-contexts`

## 온보딩 플로우

### Step 1. Runtime Doctor

- OS
- Node / pnpm
- ffmpeg
- whisper
- claude / codex / gemini

### Step 2. Source Discovery

- 프로젝트 루트 후보
- Obsidian vault 후보
- Claude/Codex/Gemini 설정 경로
- 저장 루트 후보

### Step 3. User Approval

- 연결할 폴더 선택
- 사용할 AI 러너 선택
- 위험 기능 허용 범위 설정

### Step 4. Persist Config

- 사용자 config 파일 또는 SQLite에 저장
- 이후 실행부터는 설정 재사용

## 보안 경계

- 로컬 모드에서는 `localhost` 요청만 허용
- 파일 조작은 허용 루트 제한
- 민감한 숨김 폴더는 기본 차단
- 전체 디스크 무단 스캔 금지
- 자동 로그인/자동 키 입력 금지

## 모듈별 전환 우선순위

### 바로 전환

- 앱 이름/키 네임스페이스
- PRD 저장 경로
- CS 컨텍스트 루트
- 프로젝트 스캔 루트
- Obsidian vault 탐색

### 다음 단계

- 설정 저장소
- 온보딩 UI
- 설정 편집 화면
- Doc Hub/File Manager/System 계열의 runtime config 연결

### 이후 단계

- 레포 밖 사용자 데이터 저장
- SQLite 메타데이터
- 샘플 데이터 패키징
- Hosted Mode 분기
