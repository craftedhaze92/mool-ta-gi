/**
 * 폼 입력칸 공통 스타일.
 *
 * 종목 추가/수정 폼(entities/holding)과 물타기 시뮬레이터(widgets/averaging-panel)가 같은
 * 시안 스펙을 쓴다. 두 곳은 서로 import할 수 없는 레이어라, 각자 문자열을 들고 있으면
 * 한쪽만 고쳐져 입력칸 모양이 갈라진다.
 *
 * Shadcn `Input`·`SelectTrigger`의 기본 스타일 위에 cn()으로 덮어쓴다.
 */

/** 시안의 입력 필드 스펙: 14px, radius 10px, 헤어라인 테두리, 포커스 시 브랜드 컬러 */
export const FORM_FIELD =
  'border-hairline focus-visible:border-brand h-auto rounded-[10px] border px-3 py-2.5 text-sm focus-visible:ring-0';

/** 라벨과 입력칸을 세로로 쌓는 래퍼. 라벨 글자는 작고 흐리게 둔다 */
export const FORM_LABEL = 'text-muted-foreground flex flex-col gap-1.5 text-xs font-semibold';
