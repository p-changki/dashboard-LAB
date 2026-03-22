# Meeting Hub + GitHub Execution Layer PRD

## 1. Summary

`Meeting Hub` is a new top-level workspace in Dashboard LAB that turns meeting notes or recordings into structured team memory, action items, and execution links.

The product goal is not to replace Slack, Notion, or GitHub. The goal is to make a local-first workflow where a small team can:

- capture meeting notes or recordings
- generate structured meeting docs with AI
- extract action items and decisions
- save those artifacts locally as Markdown + JSON
- optionally create or link GitHub Issues
- track linked Issues and PRs from the same screen

This extends the existing strengths of Dashboard LAB:

- local AI workspace
- document generation
- Call to PRD pipeline
- project context
- GitHub-oriented developer workflow

## 2. Product Positioning

### Core positioning

`A local-first AI workspace for meetings, docs, and execution.`

### Supporting line

`Turn recordings and notes into decisions, action items, PRDs, and GitHub issues.`

### What makes this different

The market already has AI meeting tools, including cloud-first tools and some local or local-first tools. The gap Dashboard LAB can target is narrower and more defensible:

- local-first storage for meeting artifacts
- direct reuse of project context already inside the app
- meeting -> PRD flow
- meeting -> action items -> GitHub issue flow
- one workspace for docs, project context, AI drafting, and execution tracking

### Non-goals

- Slack replacement
- Notion replacement
- full GitHub UI replacement
- real-time multi-user collaboration
- permissions, mentions, comments, or chat

## 3. User Problem

Small teams, founders, agencies, and product/dev teams often have the same gap:

- meetings happen in Zoom, Meet, Slack Huddles, or in-person
- notes live in scattered docs
- action items are lost
- decisions are not tracked
- GitHub issues and PRs are detached from meeting context

Dashboard LAB can solve this by making meetings first-class operating memory instead of one-off notes.

## 4. Target Users

### Primary

- founder-led product teams
- small startup teams
- agencies working with clients
- PM + engineer + designer teams
- privacy-sensitive teams that prefer local storage

### Secondary

- solo operators who still run structured project reviews
- consultants who need client meeting records and follow-up docs

## 5. Jobs To Be Done

1. After a meeting, I want a clean summary, decisions, and action items without manually rewriting notes.
2. I want meeting outputs stored locally in files I control.
3. I want meeting action items to connect to the project and GitHub work that follows.
4. I want to search prior meetings and recall why a decision was made.
5. I want to turn a requirements or customer meeting into a PRD or GitHub issue draft quickly.

## 6. Information Architecture

Add one new top-level sidebar tab:

- `Meeting Hub`

Inside `Meeting Hub`, use sub-sections instead of adding more top-level sidebar tabs:

- `Overview`
- `Teams`
- `Meetings`
- `Actions`
- `GitHub`

### Why this structure

- keeps the main sidebar from growing further
- keeps team and GitHub context tied to meetings
- makes the value legible: meetings produce execution artifacts

## 7. Scope by Phase

## Phase 1 — MVP

### Goal

Ship a usable local meeting system with structured output and local persistence.

### Included

- team CRUD
- meeting CRUD
- 5 meeting templates
- typed note input
- pasted transcript input
- optional audio upload path that reuses Call to PRD transcription pipeline
- AI-generated meeting summary
- decisions extraction
- action item extraction
- Markdown + JSON + raw text local save
- recent meetings timeline
- open action items list

### Not included

- GitHub Projects board
- issue editing UI
- PR review UI
- calendar sync
- Slack integration

## Phase 1.5 — GitHub execution bridge

### Goal

Connect action items to GitHub without rebuilding GitHub itself.

### Included

- GitHub connection setup
- linked repository selection per team
- create GitHub issue from action item
- read issue list for linked repos
- read PR list for linked repos
- show linked issue / PR status on action items
- simple read-only execution board grouped by status

### Not included

- drag-and-drop board editing
- editing GitHub Projects fields
- inline code review comments

## Phase 2 — Differentiation

- decision log / ADR generation
- meeting search
- weekly summary
- meeting -> PRD shortcut
- stalled action detection
- linked issue risk summary

## Phase 3 — Expansion

- async standup
- incident postmortem mode
- blocker tracker
- calendar import/export
- Slack or webhook notifications

## 8. Phase 1 MVP Detail

### 8.1 Team Management

Each team has:

- `id`
- `name`
- `description`
- `members[]`
- `connectedProjectIds[]`
- `defaultRepository?`
- `createdAt`
- `updatedAt`

Each member has:

- `id`
- `name`
- `role`
- `email?`
- `githubLogin?`

### 8.2 Meeting Types

Provide built-in templates for:

- standup
- planning
- review
- retrospective
- client meeting

Template differences:

- prompt framing
- expected sections
- action extraction emphasis
- tone of final output

### 8.3 Meeting Inputs

Input modes:

- typed notes
- pasted transcript
- audio file upload

For MVP, typed notes and pasted transcript are the core path.
Audio upload should reuse the existing Call to PRD upload and transcription pipeline where practical.

### 8.4 AI Outputs

Each processed meeting should generate:

- summary
- key discussion points
- decisions
- action items
- risks
- follow-up questions
- next-meeting preparation notes

### 8.5 Local Save Formats

Each meeting saves:

- final Markdown note
- raw text or transcript
- structured JSON

## 9. Phase 1.5 GitHub Detail

### Principle

GitHub remains source of truth.

Dashboard LAB only:

- reads issues and PRs
- creates issues from extracted action items
- visualizes execution status

### Supported GitHub flows

- create issue from action item
- link existing issue to action item
- show linked PRs for a repo
- show open vs closed issue counts
- show lightweight kanban columns derived from issue or PR state

### Explicitly out of scope

- recreating GitHub Projects UI
- full issue editor
- PR review experience
- write access beyond issue creation

## 10. Data Model

## 10.1 File Storage

```text
data/meeting-hub/
  teams/
    {teamId}/
      team.json
      meetings/
        2026-03-22-weekly-planning.md
        2026-03-22-weekly-planning.raw.txt
        2026-03-22-weekly-planning.json
      actions/
        open-items.json
      decisions/
        decision-log.md
```

### 10.2 Suggested JSON Shapes

#### team.json

```json
{
  "id": "product-team",
  "name": "Product Team",
  "description": "Core product planning and review team",
  "members": [
    {
      "id": "changki",
      "name": "Changki",
      "role": "PM / Founder",
      "githubLogin": "p-changki"
    }
  ],
  "connectedProjectIds": ["dashboard-lab"],
  "defaultRepository": "p-changki/dashboard-LAB",
  "createdAt": "2026-03-22T00:00:00.000Z",
  "updatedAt": "2026-03-22T00:00:00.000Z"
}
```

#### meeting.json

```json
{
  "id": "2026-03-22-weekly-planning",
  "teamId": "product-team",
  "title": "Weekly Planning",
  "type": "planning",
  "date": "2026-03-22",
  "participants": ["Changki", "Alex"],
  "linkedProjectIds": ["dashboard-lab"],
  "linkedRepository": "p-changki/dashboard-LAB",
  "source": {
    "kind": "text",
    "rawPath": "meetings/2026-03-22-weekly-planning.raw.txt"
  },
  "summary": "...",
  "discussion": ["..."],
  "decisions": ["..."],
  "actionItems": [
    {
      "id": "ai-1",
      "title": "Create Meeting Hub MVP PRD",
      "owner": "Changki",
      "dueDate": "2026-03-25",
      "status": "open",
      "repository": "p-changki/dashboard-LAB",
      "issueNumber": 12
    }
  ],
  "risks": ["..."],
  "followUp": ["..."],
  "createdAt": "2026-03-22T00:00:00.000Z",
  "updatedAt": "2026-03-22T00:00:00.000Z"
}
```

#### open-items.json

```json
{
  "items": [
    {
      "id": "ai-1",
      "meetingId": "2026-03-22-weekly-planning",
      "teamId": "product-team",
      "title": "Create Meeting Hub MVP PRD",
      "owner": "Changki",
      "dueDate": "2026-03-25",
      "status": "open",
      "repository": "p-changki/dashboard-LAB",
      "issueNumber": 12,
      "prNumbers": [],
      "syncedAt": "2026-03-22T00:00:00.000Z"
    }
  ]
}
```

## 11. Markdown Output Template

```md
# Weekly Planning

- Date: 2026-03-22
- Team: Product Team
- Type: planning
- Participants: Changki, Alex
- Linked Project: dashboard-lab
- Linked Repository: p-changki/dashboard-LAB

## Summary
- Concise summary of the meeting

## Discussion
- Discussion point 1
- Discussion point 2

## Decisions
- Decision 1
- Decision 2

## Action Items
- [ ] Changki — Create Meeting Hub MVP PRD — Due 2026-03-25
- [ ] Alex — Review team storage schema — Due 2026-03-26

## Risks
- Risk 1

## Follow-up
- Prepare example meeting templates for next review
```

## 12. UX Structure

## 12.1 Overview

Show:

- recent meetings
- open action items
- recent decisions
- linked GitHub issue/PR snapshot

This should be the default sub-view.

## 12.2 Teams

Show:

- team list
- members
- linked local projects
- linked GitHub repository

Actions:

- create team
- edit team
- archive team

## 12.3 Meetings

Show:

- meeting timeline
- filters by team / type / date
- create meeting modal or panel
- processing status

Create meeting form fields:

- team
- title
- type
- date
- participants
- linked project
- linked repository
- input source
- notes or transcript
- optional file upload

## 12.4 Actions

Show:

- all open action items
- owner filter
- due date filter
- linked issue state
- quick create issue action

## 12.5 GitHub

Show only a lightweight operational view:

- linked repositories
- recent open issues
- recent open PRs
- read-only status board

Do not make this a full GitHub replacement.

## 13. Technical Reuse Map

### Existing systems to reuse

- `Call to PRD` transcription and document generation pipeline
- `Doc Hub` file reading and search pattern
- `Projects` project linking and local repo context
- `CS Helper` prompt composition patterns
- `Global Search` result integration

### Concrete reuse opportunities

- transcription path from `src/app/api/call-to-prd/upload/route.ts`
- saved bundle and markdown generation patterns from `src/lib/call-to-prd/*`
- GitHub issue draft concept from `src/lib/call-to-prd/next-actions.ts`
- GitHub fetch patterns from `src/lib/info-hub/ai-skills-fetcher.ts`

## 14. Suggested App Structure

### Feature

```text
src/features/meeting-hub/
  MeetingHubTab.tsx
  components/
    MeetingHubOverview.tsx
    TeamsPanel.tsx
    MeetingsPanel.tsx
    ActionsPanel.tsx
    GithubPanel.tsx
    MeetingEditor.tsx
    ActionItemsTable.tsx
    DecisionList.tsx
```

### Library

```text
src/lib/meeting-hub/
  storage.ts
  schemas.ts
  templates.ts
  formatter.ts
  prompt-builder.ts
  processors.ts
  github-sync.ts
```

### API

```text
src/app/api/meeting-hub/
  teams/route.ts
  teams/[teamId]/route.ts
  meetings/route.ts
  meetings/[meetingId]/route.ts
  meetings/process/route.ts
  actions/route.ts
  actions/[actionId]/route.ts
  github/issues/route.ts
  github/issues/create/route.ts
  github/pulls/route.ts
  github/board/route.ts
```

## 15. GitHub Integration Design

## 15.1 Authentication

Prefer a pragmatic local-first approach:

- primary: `gh` CLI if installed and authenticated
- fallback: GitHub personal access token stored in local runtime settings

Why:

- fits current product philosophy
- avoids immediate OAuth complexity
- matches existing CLI-first model support

## 15.2 Supported Reads

- issues by repository
- pull requests by repository
- optional project board snapshot if `gh` and scopes are available

## 15.3 Supported Writes

Only for MVP:

- create issue from action item

Later:

- link action item to existing issue
- optionally create draft issue body from AI

## 15.4 Board Strategy

Do not depend on GitHub Projects v2 in the first release.

Instead:

- compute a simple board from issue and PR state
- group into `Inbox`, `Planned`, `In Progress`, `Review`, `Done`
- infer from labels, issue state, linked PRs, or configured rules

This avoids GraphQL complexity and keeps the first integration light.

## 16. AI Processing Strategy

### Phase 1 prompt outputs

The AI processor should always return structured sections:

- summary
- discussion
- decisions
- action_items
- risks
- follow_up

### Output contract

Prefer JSON output first, then render Markdown from structured data.

Why:

- easier local save
- easier filtering and search
- easier GitHub issue generation
- easier future i18n

## 17. Search and Cross-Feature Integration

### Doc Hub

- open meeting Markdown files
- filter by team and meeting type

### Projects

- show linked meetings for a project
- show meeting-created action items for a project

### Call to PRD

- one-click `Generate PRD from meeting`
- especially useful for client and requirement meetings

### Global Search

Include:

- team names
- meeting titles
- action items
- decisions
- linked repository names

## 18. Internationalization

This feature should launch with the current app direction in mind:

- internal storage stays language-agnostic where possible
- JSON field names remain English
- UI copy uses the app locale layer
- prompt templates should support Korean and English output modes

This matters because the product is moving toward a Korean/English toggle.

## 19. Security and Privacy

### Local-first guarantees

- raw notes, transcripts, Markdown, and JSON are stored locally
- GitHub data is fetched directly from GitHub when connected
- AI processing depends on the selected model path

### Important messaging constraint

Do not claim `all data stays on your machine` unless the chosen AI path is fully local.

Safer language:

- `Meeting artifacts are stored locally.`
- `Cloud AI usage depends on your configured model provider.`

## 20. Risks

### Product risks

- scope creep into generic collaboration tool
- GitHub UI duplication
- too many sub-features in v1

### Technical risks

- audio pipeline reuse may pull too much Call to PRD complexity into MVP
- GitHub Projects v2 API complexity
- action-item normalization quality from AI output

### Mitigations

- make typed notes the default MVP path
- keep GitHub integration read-first
- treat issue creation as the only write action
- postpone project-board editing

## 21. Success Metrics

### MVP success

- users can create teams and meetings without setup confusion
- users can save structured meeting notes locally
- users can extract at least one useful action item per meeting
- users can create linked GitHub issues from action items

### Differentiation success

- users reuse past meetings to generate PRDs or weekly summaries
- users keep the app open for both note capture and execution tracking

## 22. Implementation Plan

## Step 1

Build Phase 1 local data model and storage:

- schemas
- storage
- team CRUD
- meeting CRUD

## Step 2

Build Meeting Hub tab UI shell:

- Overview
- Teams
- Meetings
- Actions

## Step 3

Add meeting processing pipeline:

- typed notes path
- transcript path
- structured AI output
- Markdown rendering

## Step 4

Add GitHub bridge:

- repo configuration
- issues read
- PRs read
- create issue from action item

## Step 5

Add cross-feature hooks:

- Doc Hub
- Projects
- Call to PRD
- Global Search

## 23. Go / No-Go Recommendation

### Recommendation

Go.

### Why

- high reuse of existing systems
- strong fit with current product positioning
- good privacy and local-first story
- practical differentiation without building a full collaboration suite

### Strict scope rule

`Meeting Hub` should ship first as a local meeting memory and execution bridge, not as a full team platform.
