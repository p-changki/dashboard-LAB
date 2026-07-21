// Guide-modal content.
export const presetGuide = {
  ko: {
    core: {
      summary: "기획 정리와 첫 미팅 후속정리용 기본 세트입니다.",
      useWhen: [
        "고객 미팅이나 내부 회의 직후 핵심 정리와 요구사항 정돈이 먼저 필요할 때",
        "아직 API나 데이터 구조까지 깊게 확정되지 않았을 때",
        "처음 생성해보고 이후 필요한 문서만 추가로 뽑고 싶을 때",
      ],
      avoidWhen: [
        "바로 개발 전달 문서가 필요한데 API 계약이나 스키마도 같이 정리해야 할 때",
        "AI 품질 검수 기준까지 같이 정리해야 할 때",
      ],
    },
    voc: {
      summary: "고객 불만, VOC, 내부 회의 이슈를 문제정의와 고객 공유 문서로 빠르게 정리할 때 적합합니다.",
      useWhen: [
        "고객 컴플레인을 제품 문제로 정리하고 대응 방향을 먼저 맞춰야 할 때",
        "회의에서 발견된 운영/기능 문제를 PRD와 고객 전달 문서까지 이어서 만들고 싶을 때",
        "문제 현상과 해결 방향을 내부/외부 문서로 동시에 관리해야 할 때",
      ],
      avoidWhen: [
        "이미 구현 범위가 확정돼 개발 태스크와 API 설계가 더 중요한 단계일 때",
      ],
    },
    customer: {
      summary: "고객에게 현재 이해한 범위와 개발 방향을 빠르게 공유할 때 적합한 세트입니다.",
      useWhen: [
        "통화나 미팅 직후 고객에게 정리본을 바로 보내고 싶을 때",
        "비개발자도 이해할 수 있는 표현으로 범위와 진행 방식을 설명해야 할 때",
        "개발 착수 전 고객과 방향을 한 번 더 맞추고 싶을 때",
      ],
      avoidWhen: [
        "바로 개발 팀이 구현을 시작해야 해서 API, 스키마, 태스크 분해까지 필요한 때",
      ],
    },
    handoff: {
      summary: "기획에서 개발 전달로 넘어가는 시점에 가장 적합한 세트입니다.",
      useWhen: [
        "프론트/백엔드가 바로 구현 범위를 잡아야 할 때",
        "업로드, 상태조회, 저장 구조 같은 계약을 같이 정리해야 할 때",
        "회의 후 개발 티켓 분해 전에 한 번에 넘길 자료가 필요할 때",
      ],
      avoidWhen: [
        "아직 요구사항 자체가 많이 흔들리는 초기 탐색 단계일 때",
      ],
    },
    change: {
      summary: "운영 중 추가 요청이 들어왔을 때 변경점과 구현 작업을 함께 정리하는 세트입니다.",
      useWhen: [
        "기존 기능 위에 고객 추가 요청이 들어와 무엇이 달라지는지 먼저 정리해야 할 때",
        "변경 범위와 구현 태스크를 한 번에 정리해 바로 작업 티켓으로 넘겨야 할 때",
        "현재 프로젝트 기준 정보 대비 영향 범위를 빠르게 확인해야 할 때",
      ],
      avoidWhen: [
        "완전히 신규 기능이라 기존 기준선과의 비교가 큰 의미가 없을 때",
      ],
    },
    "ai-review": {
      summary: "AI 생성 품질, 프롬프트, 평가 기준이 중요한 기능에 맞는 세트입니다.",
      useWhen: [
        "LLM 출력 품질을 반복 검증해야 하는 기능일 때",
        "Prompt Spec과 평가 기준 없이 실무 적용이 어려울 때",
        "샘플셋, 정답률, 회귀 검증 기준까지 같이 정의해야 할 때",
      ],
      avoidWhen: [
        "AI가 핵심이 아닌 단순 CRUD 기능일 때",
      ],
    },
    release: {
      summary: "이미 방향이 잡힌 기능을 실제 배포 직전 수준으로 점검할 때 적합합니다.",
      useWhen: [
        "QA 체크리스트와 배포 절차를 빠르게 붙이고 싶을 때",
        "운영 모니터링, 롤백 기준, 출시 전 확인 항목이 필요한 시점일 때",
      ],
      avoidWhen: [
        "아직 요구사항이 많이 바뀌는 초기 단계일 때",
        "기술 설계나 API 계약이 먼저 필요한 상황일 때",
      ],
    },
  },
  en: {
    core: {
      summary: "Best default set for initial planning and post-meeting follow-up.",
      useWhen: [
        "You need to align the core summary and requirements after a client or internal meeting.",
        "The API and data model are not fully fixed yet.",
        "You want to generate once, then add only the extra docs you need.",
      ],
      avoidWhen: [
        "You already need developer handoff docs with API contracts and schemas.",
        "You also need AI quality criteria and evaluation guidance right away.",
      ],
    },
    voc: {
      summary: "Useful when turning complaints, VOC, or internal issues into a clear problem statement and share doc.",
      useWhen: [
        "You need to frame a customer complaint as a product problem before agreeing on a response.",
        "You want to continue from an operational issue into a PRD and a client-facing summary.",
        "You need both internal and external docs for the same issue.",
      ],
      avoidWhen: [
        "Implementation scope is already fixed and dev task breakdown matters more than analysis.",
      ],
    },
    customer: {
      summary: "Best when you need to quickly share the current understanding and direction with a client.",
      useWhen: [
        "You want to send a summary right after a call or meeting.",
        "You need non-technical language to explain scope and delivery direction.",
        "You want to realign with the client before development starts.",
      ],
      avoidWhen: [
        "The dev team needs implementation docs, APIs, schemas, and task breakdown immediately.",
      ],
    },
    handoff: {
      summary: "Best set when moving from planning into direct implementation.",
      useWhen: [
        "Frontend and backend need to define execution scope right away.",
        "You need to align on contracts such as upload, status polling, and storage layout.",
        "You need a single handoff package before ticket breakdown.",
      ],
      avoidWhen: [
        "Requirements are still highly unstable and exploratory.",
      ],
    },
    change: {
      summary: "Best for incremental requests where the delta from the current baseline matters.",
      useWhen: [
        "An additional request landed on top of an existing feature and you need to map what changed.",
        "You need both scope diff and implementation tasks in one pass.",
        "You want to check impact against the current project baseline quickly.",
      ],
      avoidWhen: [
        "This is a brand-new feature and baseline comparison adds little value.",
      ],
    },
    "ai-review": {
      summary: "Best for features where AI quality, prompts, and evaluation criteria are critical.",
      useWhen: [
        "You need repeatable validation of LLM output quality.",
        "Prompt specs and evaluation criteria are required for real usage.",
        "You need sample sets, target accuracy, and regression checks.",
      ],
      avoidWhen: [
        "The feature is simple CRUD and AI is not central to the scope.",
      ],
    },
    release: {
      summary: "Best for release-stage work where direction is already fixed and readiness matters.",
      useWhen: [
        "You want to add a QA checklist and release procedure quickly.",
        "You need monitoring, rollback criteria, and pre-launch checks.",
      ],
      avoidWhen: [
        "Requirements are still changing frequently.",
        "You still need to settle technical design or API contracts first.",
      ],
    },
  },
} as const;

export const docGuideCopy = {
  ko: {
    prd: { useWhen: "항상 기본", value: "배경, 목표, 요구사항, 우선순위, 개발 계획의 기준 문서입니다." },
    "problem-statement": { useWhen: "고객 불만, 회의 이슈, 운영 문제를 먼저 정의해야 할 때", value: "현재 현상, 영향 범위, 원인 가설, 대응 방향을 분리해 문제를 선명하게 정의합니다." },
    "open-questions": { useWhen: "고객 재확인이 많이 필요한 초기/중간 단계", value: "확정되지 않은 내용과 후속 질문을 분리해 회의 혼선을 줄입니다." },
    "acceptance-criteria": { useWhen: "개발/QA 완료 기준을 맞춰야 할 때", value: "REQ별 완료 기준을 정리해 구현과 검수의 기준점을 맞춥니다." },
    "user-flow": { useWhen: "사용 흐름이나 운영 흐름이 중요한 기능일 때", value: "핵심 사용자 흐름과 예외 흐름을 단계별로 정리합니다." },
    "client-brief": { useWhen: "고객이나 비개발자에게 바로 공유할 정리본이 필요할 때", value: "요청 배경, 작업 범위, 진행 방식, 다음 단계를 쉬운 표현으로 정리합니다." },
    "task-breakdown": { useWhen: "문서 생성 직후 바로 개발 작업으로 분해해야 할 때", value: "프론트/백엔드/API/QA 태스크와 구현 순서를 정리합니다." },
    "change-request-diff": { useWhen: "운영 중 추가요청, 스코프 조정, 변경 영향 확인이 필요할 때", value: "현재 기준선 대비 추가/변경/보류 범위를 비교 중심으로 정리합니다." },
    "api-contract": { useWhen: "프론트/백엔드 동시 작업 전", value: "요청/응답/에러 계약을 정리해 구현 오해를 줄입니다." },
    "data-schema": { useWhen: "상태값, 저장 구조, 엔티티 정의가 중요한 기능일 때", value: "필드, 상태, 저장 규칙을 정리해 데이터 설계를 고정합니다." },
    "prompt-spec": { useWhen: "AI 생성 로직을 반복 개선해야 할 때", value: "입력 변수, 지시문 구조, 가드레일을 명문화합니다." },
    "evaluation-plan": { useWhen: "품질을 정량/정성으로 평가해야 할 때", value: "샘플셋, 점검 기준, 회귀 테스트 방식을 정리합니다." },
    "qa-checklist": { useWhen: "QA 또는 출시 직전 점검", value: "핵심 기능, 실패 케이스, 성능 점검 항목을 빠르게 확인합니다." },
    "release-runbook": { useWhen: "배포 직전 또는 운영 준비 단계", value: "배포 순서, 모니터링, 장애 대응, 롤백 절차를 정리합니다." },
  },
  en: {
    prd: { useWhen: "Always the default", value: "The base document for background, goals, requirements, priorities, and delivery plan." },
    "problem-statement": { useWhen: "When complaints or incidents need to be framed first", value: "Clarifies symptoms, impact, root-cause hypotheses, and response direction." },
    "open-questions": { useWhen: "Early or mid-stage work with many unresolved items", value: "Separates unknowns and follow-up questions to reduce meeting ambiguity." },
    "acceptance-criteria": { useWhen: "When dev and QA need aligned done criteria", value: "Defines done criteria per requirement for implementation and validation." },
    "user-flow": { useWhen: "When user or operational flow is important", value: "Organizes core flows and exception flows step by step." },
    "client-brief": { useWhen: "When you need a shareable client-facing summary", value: "Explains context, scope, approach, and next steps in simple language." },
    "task-breakdown": { useWhen: "When you need immediate execution tasks after doc generation", value: "Breaks the work into FE/BE/API/QA tasks and execution order." },
    "change-request-diff": { useWhen: "When you need to inspect additional scope or impact", value: "Compares add/change/hold items against the current baseline." },
    "api-contract": { useWhen: "Before parallel FE and BE work", value: "Locks request/response/error contracts to reduce implementation mismatch." },
    "data-schema": { useWhen: "When entities and storage rules matter", value: "Defines fields, states, and storage rules for the data model." },
    "prompt-spec": { useWhen: "When AI generation logic needs repeated iteration", value: "Documents inputs, instruction structure, and guardrails." },
    "evaluation-plan": { useWhen: "When quality needs quantitative or qualitative review", value: "Defines sample sets, scoring criteria, and regression checks." },
    "qa-checklist": { useWhen: "For QA or launch readiness", value: "Quickly checks core features, failure cases, and performance items." },
    "release-runbook": { useWhen: "Right before deployment or ops prep", value: "Documents deployment order, monitoring, incident handling, and rollback." },
  },
} as const;

export const scenarioGuideCopy = {
  ko: [
    { title: "첫 고객 미팅 직후 핵심 정리", description: "요구사항은 잡혔지만 기술 설계는 아직 열려 있는 상태", preset: "core" },
    { title: "고객 컴플레인이나 VOC를 문제 문서로 전환", description: "불만 원문을 바로 문제정의, PRD, 고객 공유 문서까지 연결해야 하는 상태", preset: "voc" },
    { title: "개발 착수 전에 FE/BE 전달", description: "구현 범위와 API/데이터 계약을 같이 넘겨야 하는 상태", preset: "handoff" },
    { title: "고객에게 방향성과 범위를 빠르게 공유", description: "비개발자도 이해할 수 있는 정리본으로 범위와 진행 방식을 먼저 맞춰야 하는 상태", preset: "customer" },
    { title: "운영 중 고객 추가 기능 요청 대응", description: "기존 기준선 대비 변경점과 구현 태스크를 같이 정리해야 하는 상태", preset: "change" },
    { title: "AI 생성 품질 검수 체계 만들기", description: "프롬프트와 평가 기준이 없으면 기능 품질을 관리하기 어려운 상태", preset: "ai-review" },
    { title: "출시 직전 QA와 운영 준비", description: "배포 순서, 체크리스트, 롤백 기준까지 필요한 상태", preset: "release" },
    { title: "개발 핸드오프 + AI 검수 기준 둘 다 필요", description: "AI 기능이 핵심이라 계약과 평가 기준을 동시에 잡아야 하는 상태", preset: "handoff", extras: ["prompt-spec", "evaluation-plan"] },
  ],
  en: [
    { title: "Capture the essentials after a first client meeting", description: "Requirements are visible, but technical design is still open.", preset: "core" },
    { title: "Turn complaints or VOC into a problem document", description: "You need to continue from the raw complaint into a problem statement, PRD, and client share doc.", preset: "voc" },
    { title: "Hand off to FE/BE before implementation starts", description: "You need to pass scope and API/data contracts together.", preset: "handoff" },
    { title: "Share direction and scope quickly with a client", description: "You need a non-technical summary to align on scope and delivery approach.", preset: "customer" },
    { title: "Respond to an added feature request in production", description: "You need to organize both the diff from baseline and the implementation tasks.", preset: "change" },
    { title: "Create an AI quality review framework", description: "Prompt and evaluation criteria are required to manage output quality.", preset: "ai-review" },
    { title: "Prepare QA and operations right before launch", description: "You need deployment steps, a checklist, and rollback criteria.", preset: "release" },
    { title: "Need both dev handoff and AI quality criteria", description: "The feature is AI-heavy, so contracts and evaluation criteria must be defined together.", preset: "handoff", extras: ["prompt-spec", "evaluation-plan"] },
  ],
} as const;

