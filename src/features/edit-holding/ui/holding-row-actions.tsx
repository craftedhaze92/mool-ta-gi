'use client';

import { useState } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { HoldingFormDialog, type Holding } from '@/entities/holding';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { DeleteHoldingDialog } from './delete-holding-dialog';

/**
 * 테이블 행 우측의 케밥 메뉴 — 종목 수정 / 종목 삭제.
 *
 * 행 전체가 '시뮬레이터에 연동' 클릭 영역이라, 케밥과 메뉴에서 발생하는 클릭·키 입력은
 * 전부 전파를 막아 행 선택이 함께 일어나지 않게 한다.
 */
export function HoldingRowActions({ holding }: { holding: Holding }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <span onClick={stop} onKeyDown={stop}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`${holding.name} 더보기`}
          /* 모바일은 터치 타깃을 40px까지 키운다 (데스크톱은 시안대로 32px) */
          className="border-hairline text-muted-strong flex size-10 items-center justify-center rounded-lg border bg-white transition-colors hover:border-[#8b95a1] hover:text-[#191f28] aria-expanded:bg-[#f2f4f6] md:size-8"
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[132px] rounded-[10px] p-1.5">
          <DropdownMenuItem
            onSelect={() => setEditOpen(true)}
            className="gap-2.5 rounded-[7px] px-2.5 py-2.5 text-[13px] focus:bg-[#f2f4f6]"
          >
            <Pencil className="size-3.5" />
            종목 수정
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive gap-2.5 rounded-[7px] px-2.5 py-2.5 text-[13px] focus:bg-[#fdf2f3]"
          >
            <Trash2 className="size-3.5" />
            종목 삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 열릴 때마다 새로 마운트해야 폼 기본값이 현재 종목으로 잡힌다 */}
      {editOpen && <HoldingFormDialog open onOpenChange={setEditOpen} editing={holding} />}
      {deleteOpen && <DeleteHoldingDialog open onOpenChange={setDeleteOpen} holding={holding} />}
    </span>
  );
}
