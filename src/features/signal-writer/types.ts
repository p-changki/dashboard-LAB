// Signal Writer view types shared between the tab component and its helpers.
export type SignalWriterMixSummary = {
  manualCount: number;
  autoCount: number;
};

export type SignalWriterPerformanceForm = {
  postUrl: string;
  postedAt: string;
  views: string;
  likes: string;
  replies: string;
  reposts: string;
  saves: string;
  notes: string;
};

export type TrendBoardReviewState = {
  included: boolean;
  reviewed: boolean;
  note: string;
};
