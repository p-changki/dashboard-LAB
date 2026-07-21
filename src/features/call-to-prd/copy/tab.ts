// Tab navigation labels.
export const tabCopy = {
  ko: {
    heroEyebrow: "Call → PRD",
    heroTitle: "회의, 고객 이슈, 운영 메모를 실행 문서로 바꾸는 워크플로",
    heroDescription:
      "녹음 파일이 없어도 바로 쓸 수 있습니다. 통화 전사본, 회의 메모, 고객 불만, 운영 이슈를 붙여넣거나 파일로 올리면 PRD와 후속 실행 문서 초안까지 한 번에 이어서 만듭니다.",
    cards: [
      {
        label: "입력",
        title: "녹음 파일 또는 텍스트 메모",
        description: "통화 전사, 회의 정리, 고객 이슈 설명을 그대로 넣고 프로젝트 맥락만 함께 고르면 됩니다.",
      },
      {
        label: "생성",
        title: "PRD와 실무 문서 초안",
        description: "문제 정의, change request, 공유 문서, 내부 정리 문서를 프리셋으로 한 번에 만들 수 있습니다.",
      },
      {
        label: "후속 액션",
        title: "PM, FE, BE, QA, CS 초안 연결",
        description: "생성된 PRD를 바탕으로 각 역할별 다음 액션 문서를 이어서 만들 수 있습니다.",
      },
    ],
    tabs: {
      intake: "새 문서",
      viewer: "결과 뷰어",
      history: "히스토리",
    },
    intakeModes: {
      quick: {
        label: "빠른 작성",
        description: "주제 한 줄로 PRD 1장",
      },
      pro: {
        label: "정밀 모드",
        description: "메타데이터와 문서 세트까지 설정",
      },
    },
    recentTemplatesEyebrow: "최근 템플릿",
    recentTemplatesTitle: "반복 작업은 템플릿으로 바로 이어갑니다",
    recentTemplatesDescription: "최근 저장한 템플릿 3개를 바로 불러와 Pro 모드 문서 구성을 복원합니다.",
    recentTemplateApply: "템플릿 열기",
    recentTemplateMenu: "템플릿 메뉴",
    recentTemplateUpdated: (value: string) => `최근 사용 ${value}`,
  },
  en: {
    heroEyebrow: "Call → PRD",
    heroTitle: "Turn calls, customer issues, and working notes into execution documents",
    heroDescription:
      "You can start without an audio file. Paste a transcript, meeting note, customer complaint, or ops issue, then generate a PRD and follow-up working docs in one flow.",
    cards: [
      {
        label: "Input",
        title: "Audio file or text notes",
        description: "Drop in a transcript, meeting recap, or customer issue and pair it with project context.",
      },
      {
        label: "Output",
        title: "PRD and working doc drafts",
        description: "Generate problem framing, change requests, share docs, and internal work docs from presets.",
      },
      {
        label: "Next action",
        title: "PM, FE, BE, QA, and CS follow-ups",
        description: "Continue from the generated PRD into role-specific next action drafts.",
      },
    ],
    tabs: {
      intake: "New Doc",
      viewer: "Viewer",
      history: "History",
    },
    intakeModes: {
      quick: {
        label: "Quick",
        description: "One-line topic to one PRD",
      },
      pro: {
        label: "Pro",
        description: "Configure metadata and doc sets",
      },
    },
    recentTemplatesEyebrow: "Recent templates",
    recentTemplatesTitle: "Resume repeated work from a saved template",
    recentTemplatesDescription: "Load the three most recent template sets and reopen the Pro-mode doc setup immediately.",
    recentTemplateApply: "Open template",
    recentTemplateMenu: "Template menu",
    recentTemplateUpdated: (value: string) => `Used ${value}`,
  },
};

