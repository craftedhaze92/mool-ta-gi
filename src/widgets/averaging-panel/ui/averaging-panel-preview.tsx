import { AddHoldingButton } from '@/features/add-holding';
import { AVERAGING_PANEL_ID } from '@/shared/config/anchors';
import { cn } from '@/shared/lib/utils';
import { FORM_FIELD, FORM_LABEL } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group';
import { PANEL, PANEL_RIGHT_COLUMN, PANEL_SPLIT } from '../lib/panel';
import { ResultRow, StatCell } from './panel-rows';

const EMPTY = '—';

/** 미리보기용 입력칸. 비활성이라 라벨을 입력과 연결하지 않는다 */
function PreviewField({ label, placeholder }: { label: string; placeholder?: string }) {
  return (
    <div className={FORM_LABEL}>
      <span className="text-xs font-semibold">{label}</span>
      <Input disabled placeholder={placeholder} className={FORM_FIELD} />
    </div>
  );
}

/**
 * 보유 종목이 없을 때의 시뮬레이터.
 *
 * 스켈레톤은 '곧 채워진다'는 신호라 쓰지 않는다. 대신 실제 패널과 같은 배치(PANEL_SPLIT)로
 * 빈 값과 비활성 입력을 보여줘 무엇을 할 수 있는지 미리 알린다. 미리보기 영역은 inert라
 * 포커스·클릭·스크린리더에서 모두 빠진다. 배치는 averaging-panel.tsx를 따르므로 그쪽을
 * 바꾸면 여기도 함께 바꾼다.
 *
 * 목표 평단 역산과 갭 게이지는 뺐다. 빈 상태의 왼쪽 열은 짧아서, 패널 전체를 다 그리면
 * 이번엔 패널이 300px 넘게 길어져 반대쪽이 빈다. 입력 → 결과라는 핵심 흐름만 보여준다.
 */
export function AveragingPanelPreview() {
  return (
    <aside id={AVERAGING_PANEL_ID} className={cn(PANEL, 'gap-[18px]')}>
      <h2 className="text-base font-bold">물타기 시뮬레이터</h2>

      <div className="bg-subtle flex flex-col items-start gap-3 rounded-xl px-4 py-3.5">
        <p className="text-muted-strong text-[13px] leading-relaxed">
          종목을 추가하면 추가 매수 수량·예산으로 새 평단가와 손익분기 주가를 계산해 드려요.
        </p>
        {/* 보유 종목 카드에 이미 큰 CTA가 있어 여기서는 작은 버튼을 쓴다 */}
        <AddHoldingButton />
      </div>

      <div
        inert
        aria-hidden
        data-testid="averaging-panel-preview"
        className="flex flex-col gap-[18px] opacity-60 select-none"
      >
        <div className={PANEL_SPLIT}>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <div className="bg-subtle grid grid-cols-3 gap-2 rounded-xl px-4 py-3.5 text-xs">
              <StatCell label="현재가" value={EMPTY} />
              <StatCell label="평단가" value={EMPTY} />
              <StatCell label="평단 대비" value={EMPTY} />
            </div>

            <PreviewField label="매수가 (원)" placeholder="가정 매수가 (원)" />

            <div className={FORM_LABEL}>
              <span>계산 기준</span>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
                value="quantity"
                disabled
                className="w-full"
              >
                <ToggleGroupItem
                  value="quantity"
                  className="data-[state=on]:bg-brand h-9 flex-1 data-[state=on]:text-white"
                >
                  수량
                </ToggleGroupItem>
                <ToggleGroupItem value="budget" className="h-9 flex-1">
                  예산
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <PreviewField label="추가 매수 수량 (주)" placeholder="30" />
          </div>

          <div className={cn(PANEL_RIGHT_COLUMN, 'min-w-0')}>
            <div className="flex flex-col gap-2.5 text-[13.5px]">
              <ResultRow label="추가 매수 수량">{EMPTY}</ResultRow>
              <ResultRow label="필요 금액">{EMPTY}</ResultRow>
              <ResultRow label="새 평단가">{EMPTY}</ResultRow>
              <ResultRow label="손익분기 주가">{EMPTY}</ResultRow>
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        수수료·세금 제외 · 시뮬레이션은 실제 보유 내역에 반영되지 않습니다.
      </p>
    </aside>
  );
}
