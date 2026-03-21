"use client";

import { Pagination } from "@/components/common/Pagination";

interface InfoHubPaginationProps {
  page: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function InfoHubPagination(props: InfoHubPaginationProps) {
  return <Pagination {...props} />;
}
