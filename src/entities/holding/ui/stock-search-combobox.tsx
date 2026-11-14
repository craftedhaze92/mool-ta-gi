'use client';

import { useId, useState } from 'react';
import { ChevronsUpDownIcon } from 'lucide-react';
import type { Stock } from '@/shared/api/stock-search-contract';
import { useStockSearch } from '@/shared/api/use-stock-search';
import { cn } from '@/shared/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

interface StockSearchComboboxProps {
  /** 현재 선택된 종목명. 비어 있으면 placeholder를 보여준다 */
  value: string;
  onSelect: (stock: Stock) => void;
  /** 트리거 버튼에 입힐 필드 스타일 */
  className?: string;
  'aria-labelledby'?: string;
}

/**
 * 종목명 검색 콤보박스.
 *
 * 키워드를 치면 /api/stocks로 검색해 목록을 띄우고, 고르면 종목명과 종목코드를 함께 넘긴다.
 * 종목명을 자유 입력으로 두지 않는 이유는 이름과 코드가 어긋나는 것을 막기 위해서다.
 * 코드가 시세 조회 키라 틀리면 다른 종목의 시세가 붙는다.
 *
 * 필터링은 서버가 한다. cmdk의 내장 필터(shouldFilter)를 끄지 않으면 서버가 순위를 매긴
 * 결과를 cmdk가 다시 걸러 순서가 바뀐다.
 */
export function StockSearchCombobox({
  value,
  onSelect,
  className,
  'aria-labelledby': labelledBy,
}: StockSearchComboboxProps) {
  const contentId = useId();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const { stocks, isSearching, isError, isIdle } = useStockSearch(keyword);

  /*
   * 하이라이트(Enter 대상)를 cmdk에 맡기지 않고 직접 정한다. 맡기면 검색어가 바뀐 뒤에도
   * 이전 결과의 하이라이트가 남아, 결과가 오기 전에 누른 Enter가 엉뚱한 종목을 고른다.
   * 검색 중에는 아무것도 하이라이트하지 않고, 결과가 준비되면 첫 항목으로 돌아온다.
   */
  const [activeCode, setActiveCode] = useState('');
  const highlighted = isSearching
    ? ''
    : stocks.some((stock) => stock.code === activeCode)
      ? activeCode
      : (stocks[0]?.code ?? '');

  const select = (stock: Stock) => {
    // disabled 항목은 cmdk가 선택 이벤트를 걸지 않지만, 검색 중 선택은 여기서 한 번 더 막는다
    if (isSearching) return;
    onSelect(stock);
    handleOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // 다시 열었을 때 지난 검색어가 남아 있지 않게 한다
    if (!next) setKeyword('');
  };

  return (
    /*
     * modal: 다이얼로그 안의 팝오버는 바깥 다이얼로그의 스크롤 잠금에 걸려 목록이 휠로
     * 스크롤되지 않는다. 팝오버를 모달로 두면 자기 영역의 스크롤을 따로 허용한다.
     */
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={contentId}
          aria-labelledby={labelledBy}
          className={cn(
            'flex w-full items-center justify-between gap-2 text-left outline-none',
            className,
          )}
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || '종목 검색'}
          </span>
          <ChevronsUpDownIcon aria-hidden className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent id={contentId} align="start" className="w-72 p-0">
        {/* cmdk는 입력창 이름을 aria-labelledby로 자기 label에 묶는다. 입력창의 aria-label은 덮인다 */}
        <Command
          shouldFilter={false}
          label="종목 검색어"
          value={highlighted}
          onValueChange={setActiveCode}
        >
          <CommandInput value={keyword} onValueChange={setKeyword} placeholder="종목명 또는 코드" />
          <CommandList label="종목 검색 결과" aria-busy={isSearching}>
            {isIdle ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                종목명이나 코드를 입력하세요.
              </p>
            ) : isError ? (
              <p role="alert" className="text-destructive py-6 text-center text-sm">
                종목을 검색하지 못했습니다.
              </p>
            ) : (
              <>
                {/* 검색 중에는 '결과 없음'을 띄우지 않는다. 디바운스 대기 중에 깜빡인다 */}
                {!isSearching && <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>}
                {/* 이전 결과를 남겨 두는 동안에는 지금 결과가 아님을 알린다 */}
                {isSearching && stocks.length > 0 && (
                  <p role="status" className="text-muted-foreground px-2 pt-2 pb-1 text-xs">
                    검색 중…
                  </p>
                )}
                {stocks.length > 0 && (
                  <CommandGroup className={cn(isSearching && 'opacity-60')}>
                    {stocks.map((stock) => (
                      <CommandItem
                        key={stock.code}
                        value={stock.code}
                        disabled={isSearching}
                        aria-label={`${stock.name} (${stock.code}, ${stock.market})`}
                        onSelect={() => select(stock)}
                      >
                        <span className="flex-1 truncate">{stock.name}</span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {stock.code} · {stock.market}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
