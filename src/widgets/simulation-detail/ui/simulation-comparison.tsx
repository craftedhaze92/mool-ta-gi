import type { Holding, SimulationResult } from '@/entities/holding';
import { formatPercent, formatQuantity, formatSignedWon, formatWon } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

/*
 * 결과 표 공통 스타일.
 *
 * Shadcn Table 기본값은 데이터 그리드용이라(행 hover, 넉넉한 높이, 아래쪽 캡션) 패널 안의
 * 작은 비교표에는 과하다. 캡션을 위로 올리고, 숫자 열은 오른쪽 정렬, hover는 끈다.
 * 모바일 폭에서 큰 금액이 넘치지 않도록 숫자 셀은 줄바꿈을 허용한다.
 */
const TABLE = 'caption-top text-xs';
const CAPTION = 'text-foreground mt-0 mb-3 text-left text-sm font-semibold';
const ROW = 'hover:bg-transparent';
const HEAD = 'text-muted-foreground h-auto px-0 pb-2 font-normal';
const LABEL_CELL = 'px-0 py-2 whitespace-normal';
const NUMBER_CELL = 'px-0 py-2 pl-2 text-right break-all whitespace-normal';

/**
 * 추가 매수 전후 비교 + 가정 가격별 손익.
 *
 * 결과 카드가 '얼마가 들고 평단이 어떻게 되는가'에 답한다면, 이 표들은 '그래서 사는 게
 * 나은가'를 판단할 재료다. 특히 손익 표는 같은 가격 변동에서 추가 매수가 손실을 키우는지
 * 줄이는지를 나란히 보여준다 — 물타기는 반등하면 이득이지만 더 빠지면 손실도 커진다.
 */
export function SimulationComparison({
  holding,
  result,
}: {
  holding: Holding;
  result: SimulationResult;
}) {
  const rows: [label: string, before: string, after: string][] = [
    ['보유 수량', formatQuantity(holding.quantity), formatQuantity(result.totalQuantity)],
    ['평단가', formatWon(holding.avgPrice), formatWon(result.newAvgPrice)],
    ['종목 투입금', formatWon(result.beforeCost), formatWon(result.afterCost)],
    ['전체 투입금', formatWon(result.portfolioCost), formatWon(result.portfolioAfterCost)],
    [
      '종목 비중',
      result.allocation ? formatPercent(result.allocation.before) : '계산 불가',
      result.allocation ? formatPercent(result.allocation.after) : '계산 불가',
    ],
  ];

  return (
    /*
     * 카드 폭이 672px을 넘으면(데스크톱 왼쪽 열, 태블릿 전폭) 두 표를 좌우로 놓는다.
     * 좁으면 위아래로 쌓는다. 각 표 아래 안내문은 자기 표와 한 덩어리로 움직인다.
     */
    <div className="@container min-w-0">
      <div className="grid gap-6 @2xl:grid-cols-2 @2xl:gap-8">
        <div className="flex min-w-0 flex-col gap-3">
          <Table className={TABLE}>
            <TableCaption className={CAPTION}>추가 매수 전후 비교</TableCaption>
            <TableHeader>
              <TableRow className={ROW}>
                <TableHead scope="col" className={HEAD}>
                  항목
                </TableHead>
                <TableHead scope="col" className={cn(HEAD, 'text-right')}>
                  매수 전
                </TableHead>
                <TableHead scope="col" className={cn(HEAD, 'text-right')}>
                  매수 후
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([label, before, after]) => (
                <TableRow key={label} className={ROW}>
                  <TableHead scope="row" className={cn(LABEL_CELL, 'font-normal')}>
                    {label}
                  </TableHead>
                  <TableCell className={NUMBER_CELL}>{before}</TableCell>
                  <TableCell className={cn(NUMBER_CELL, 'font-semibold')}>{after}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="text-muted-foreground text-xs leading-relaxed">
            {result.allocation
              ? '비중은 전후 모두 현재 시세로 평가합니다. 추가 매수 자금은 외부에서 투입하는 것으로 가정합니다.'
              : '일부 종목의 시세가 없어 전체 포트폴리오 기준 비중을 계산할 수 없습니다.'}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <Table className={TABLE}>
            <TableCaption className={CAPTION}>가정 가격별 종목 손익</TableCaption>
            <TableHeader>
              <TableRow className={ROW}>
                <TableHead scope="col" className={HEAD}>
                  가정 주가
                </TableHead>
                <TableHead scope="col" className={cn(HEAD, 'text-right')}>
                  매수 안 함
                </TableHead>
                <TableHead scope="col" className={cn(HEAD, 'text-right')}>
                  추가 매수
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.scenarios.map((scenario) => (
                <TableRow key={scenario.change} className={ROW}>
                  <TableHead scope="row" className={cn(LABEL_CELL, 'font-normal')}>
                    {formatWon(scenario.price)}
                    <span className="text-muted-foreground block text-[10px]">
                      매수가 대비 {formatPercent(scenario.change, { signed: true, digits: 0 })}
                    </span>
                  </TableHead>
                  <TableCell className={NUMBER_CELL}>
                    {formatSignedWon(scenario.beforeProfit)}
                  </TableCell>
                  <TableCell className={cn(NUMBER_CELL, 'font-semibold')}>
                    {formatSignedWon(scenario.afterProfit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="text-muted-foreground text-xs">
            손익은 반올림한 평단이 아닌 실제 투입금으로 계산합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
