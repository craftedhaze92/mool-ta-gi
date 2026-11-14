import { screen, waitFor, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useHoldingsStore, type Holding } from '@/entities/holding';
import { useSimulationInputsStore } from '@/features/simulate-averaging';
import { quotesErrorHandler, quotesHandler, quotesPendingHandler } from '@/shared/api/mocks/quotes';
import { server } from '@/shared/testing/msw-server';
import { QueryTestProvider, renderWithQuery } from '@/shared/testing/render-with-query';
import { DashboardPage } from '../index';

/**
 * 화면 검증용 고정 데이터.
 *
 * 프로덕션 seed(entities/holding의 mock)를 쓰지 않는다. seed는 데모에 보일 값이라
 * 갱신될 때마다 여기 박힌 금액 단언이 함께 깨지기 때문이다.
 * entities 내부 파일은 FSD 규칙상 views에서 import할 수 없어 지역 상수로 둔다.
 */
const FIXTURES: Holding[] = [
  {
    id: 'seed-005930',
    code: '005930',
    name: '삼성전자',
    sector: '전기·전자',
    quantity: 120,
    avgPrice: 78_400,
  },
  {
    id: 'seed-000660',
    code: '000660',
    name: 'SK하이닉스',
    sector: '전기·전자',
    quantity: 25,
    avgPrice: 168_000,
  },
  {
    id: 'seed-035420',
    code: '035420',
    name: 'NAVER',
    sector: 'IT 서비스',
    quantity: 30,
    avgPrice: 215_000,
  },
  {
    id: 'seed-005380',
    code: '005380',
    name: '현대차',
    sector: '운송장비·부품',
    quantity: 18,
    avgPrice: 242_000,
  },
];

/**
 * 시세 픽스처. Holding에서 떨어져 나오기 전의 현재가·전일종가를 그대로 옮겼다.
 * 덕분에 아래 금액 단언(₩23,653,500 등)이 예전 값 그대로 살아 있다.
 */
const PRICES = {
  '005930': { current: 71_200, prevClose: 72_300 },
  '000660': { current: 199_500, prevClose: 198_000 },
  '035420': { current: 182_300, prevClose: 185_000 },
  '005380': { current: 258_500, prevClose: 258_000 },
};

/**
 * 스토어는 싱글턴이고 persist가 localStorage를 물고 있어서
 * 테스트마다 저장소와 상태를 픽스처로 되돌린다.
 */
beforeEach(() => {
  localStorage.clear();
  server.use(quotesHandler(PRICES));
  useHoldingsStore.setState({
    holdings: FIXTURES.map((h) => ({ ...h })),
    selectedId: FIXTURES[0].id,
  });
  // 시뮬레이터 입력은 모듈 싱글턴 스토어라 테스트 사이에 남는다
  useSimulationInputsStore.getState().reset();
});

/**
 * 하이드레이션 게이트가 열린 뒤의 화면을 얻는다.
 *
 * '보유 종목'은 시세와 무관하게 나타난다. 시세를 기다리는 값까지 확인하려면
 * renderDashboardWithQuotes를 쓴다.
 */
async function renderDashboard() {
  renderWithQuery(<DashboardPage />);
  await screen.findByText('보유 종목');
}

/** 시세가 도착해 평가금액이 그려질 때까지 기다린다. */
async function renderDashboardWithQuotes() {
  await renderDashboard();
  await screen.findByText('₩23,653,500');
}

function rowOf(name: string) {
  const row = screen.getAllByRole('row').find((r) => within(r).queryByText(name));
  expect(row).toBeDefined();
  return row!;
}

/** 종목명 콤보박스를 열고 검색해 목록에서 고른다. 목록 항목 이름은 '종목명 (코드, 시장)'이다. */
async function pickStock(user: ReturnType<typeof userEvent.setup>, keyword: string, name: string) {
  await user.click(screen.getByRole('combobox', { name: '종목명' }));
  await user.type(screen.getByRole('combobox', { name: '종목 검색어' }), keyword);
  await user.click(await screen.findByRole('option', { name: new RegExp(`^${name} \\(`) }));
}

describe('DashboardPage', () => {
  /*
   * 스켈레톤은 SSR HTML 그 자체다. persist가 skipHydration이라 서버는 항상 게이트가 닫힌
   * 상태로 렌더하고, JS 하이드레이션이 끝날 때까지 사용자는 이 화면만 본다.
   * 느린 회선에서 몇 초씩 이어지므로 '로딩 중'으로 읽혀야 한다.
   *
   * jsdom에서는 render() 시점에 effect가 곧바로 flush되어 게이트가 열려버리므로,
   * 클라이언트 렌더가 아니라 서버 렌더 결과를 직접 확인한다.
   */
  it('서버 렌더 결과는 로딩 스켈레톤이다', () => {
    // DashboardPage가 시세를 구독하므로 QueryClient가 필요하다.
    const html = renderToStaticMarkup(
      <QueryTestProvider>
        <DashboardPage />
      </QueryTestProvider>,
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('불러오는 중');
    expect(html).toContain('data-slot="skeleton"');

    // 실데이터는 물론, 실제 문구도 새어나가면 안 된다.
    // 스켈레톤이 '보유 종목'을 흉내내면 하이드레이션 판정 신호가 흐려진다.
    expect(html).not.toContain('삼성전자');
    expect(html).not.toContain('보유 종목');
  });

  it('복원이 끝나면 스켈레톤이 사라진다', async () => {
    await renderDashboard();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('요약 카드에 보유 종목과 시세를 조합한 수치를 표시한다', async () => {
    await renderDashboardWithQuotes();

    expect(screen.getByText('₩23,653,500')).toBeInTheDocument(); // 총 평가금액
    expect(screen.getByText('총 매입금액').parentElement).toHaveTextContent('₩24,414,000'); // 요약 카드
  });

  it('보유 종목 4건을 모두 렌더한다', async () => {
    await renderDashboard();

    for (const name of ['삼성전자', 'SK하이닉스', 'NAVER', '현대차']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it('행을 클릭하면 시뮬레이터가 해당 종목으로 바뀐다', async () => {
    const user = userEvent.setup();
    // 시뮬레이터는 현재가에서 출발하므로 시세가 와야 본 화면이 그려진다.
    await renderDashboardWithQuotes();

    const panel = screen.getByRole('complementary');
    expect(within(panel).getByText('삼성전자')).toBeInTheDocument();

    await user.click(rowOf('SK하이닉스'));

    expect(within(screen.getByRole('complementary')).getByText('SK하이닉스')).toBeInTheDocument();
  });

  it('종목을 추가하면 테이블과 시뮬레이터에 반영된다', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.click(screen.getByRole('button', { name: '＋ 종목 추가' }));

    await pickStock(user, '카카오', '카카오');
    // 종목을 고르면 종목코드와 섹터(KRX 업종)가 따라 채워진다
    expect(screen.getByLabelText('종목코드')).toHaveValue('035720');
    expect(screen.getByLabelText('섹터')).toHaveValue('IT 서비스');

    await user.type(screen.getByPlaceholderText('주'), '90');
    await user.type(screen.getByPlaceholderText('원'), '58200');

    await user.click(screen.getByRole('button', { name: '저장' }));

    // 테이블에 행이 생기고, 추가한 종목이 곧바로 시뮬레이터에 물린다
    expect(within(rowOf('카카오')).getByText('90주')).toBeInTheDocument();
    expect(within(screen.getByRole('complementary')).getByText('카카오')).toBeInTheDocument();
  });

  it('필수값이 비면 폼 하단에 에러를 보여주고 저장하지 않는다', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.click(screen.getByRole('button', { name: '＋ 종목 추가' }));
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('종목을 검색해 선택해주세요.');
    expect(useHoldingsStore.getState().holdings).toHaveLength(4);
  });

  it('이미 보유한 종목코드로 추가하면 합산 미리보기를 거쳐 기존 행을 갱신한다', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.click(screen.getByRole('button', { name: '＋ 종목 추가' }));

    await pickStock(user, '삼성', '삼성전자');
    await user.type(screen.getByPlaceholderText('주'), '30');
    await user.type(screen.getByPlaceholderText('원'), '71200');

    await user.click(screen.getByRole('button', { name: '저장' }));

    // (120×78,400 + 30×71,200) / 150 = 76,960
    expect(await screen.findByText(/새 평단가 ₩76,960/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '합산하기' }));

    const holdings = useHoldingsStore.getState().holdings;
    expect(holdings).toHaveLength(4); // 행이 늘지 않는다
    expect(holdings[0]).toMatchObject({ quantity: 150, avgPrice: 76_960 });
  });

  it('수정 다이얼로그에서 다른 종목을 고르면 종목명·코드·섹터가 함께 바뀌고 저장 후 반영된다', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.click(screen.getByRole('button', { name: 'NAVER 더보기' }));
    await user.click(await screen.findByRole('menuitem', { name: '종목 수정' }));

    // 수정 폼은 기존 종목으로 채워져 열린다
    expect(screen.getByRole('combobox', { name: '종목명' })).toHaveTextContent('NAVER');
    expect(screen.getByLabelText('종목코드')).toHaveValue('035420');
    expect(screen.getByLabelText('섹터')).toHaveValue('IT 서비스');

    // 업종이 다른 종목으로 바꿔 섹터도 따라 바뀌는지 본다
    await pickStock(user, '카카오', '카카오뱅크');

    expect(screen.getByRole('combobox', { name: '종목명' })).toHaveTextContent('카카오뱅크');
    expect(screen.getByLabelText('종목코드')).toHaveValue('323410');
    expect(screen.getByLabelText('섹터')).toHaveValue('금융');

    await user.click(screen.getByRole('button', { name: '저장' }));

    // 같은 행(id)이 바뀐다. 수량·평단가는 그대로다
    const holdings = useHoldingsStore.getState().holdings;
    expect(holdings).toHaveLength(4);
    expect(holdings.find((h) => h.id === 'seed-035420')).toMatchObject({
      name: '카카오뱅크',
      code: '323410',
      sector: '금융',
      quantity: 30,
      avgPrice: 215_000,
    });

    expect(within(rowOf('카카오뱅크')).getByText('30주')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'NAVER 더보기' })).not.toBeInTheDocument();
  });

  /*
   * 섹터를 직접 고르던 시절에 저장된 값('반도체' 같은 테마 분류)은 화면이 뜬 뒤
   * 종목 마스터의 KRX 업종으로 맞춰진다.
   */
  it('저장된 옛 섹터를 종목 마스터의 업종으로 맞춘다', async () => {
    useHoldingsStore.setState({
      holdings: FIXTURES.map((h) => ({ ...h, sector: h.code === '005930' ? '반도체' : h.sector })),
    });

    await renderDashboard();

    await waitFor(() => expect(useHoldingsStore.getState().holdings[0].sector).toBe('전기·전자'));
  });

  it('시뮬레이터에 넣은 수량이 추가 매수 상세 표에 반영된다', async () => {
    const user = userEvent.setup();
    await renderDashboardWithQuotes();

    const quantity = screen.getByLabelText('추가 매수 수량 (주)');
    await user.clear(quantity);
    await user.type(quantity, '80');

    // 삼성전자 120주 + 80주
    const table = screen.getByRole('table', { name: '추가 매수 전후 비교' });
    expect(within(table).getByText('200주')).toBeInTheDocument();
  });

  it('종목을 삭제하면 목록에서 사라진다', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.click(screen.getByRole('button', { name: 'NAVER 더보기' }));
    await user.click(await screen.findByRole('menuitem', { name: '종목 삭제' }));
    await user.click(await screen.findByRole('button', { name: '삭제' }));

    expect(useHoldingsStore.getState().holdings.map((h) => h.name)).toEqual([
      '삼성전자',
      'SK하이닉스',
      '현대차',
    ]);
  });

  /*
   * 요구의 핵심: 보유 정보(종목명·수량·평단가)는 localStorage에 있으니 시세를 기다리는
   * 동안에도 즉시 보여야 한다. 시세에 기대는 칸만 가린다.
   */
  it('시세를 기다리는 동안에도 보유 정보는 바로 보여준다', async () => {
    server.use(quotesPendingHandler());
    await renderDashboard();

    expect(screen.getAllByText('삼성전자').length).toBeGreaterThan(0);
    expect(within(rowOf('삼성전자')).getByText('120주')).toBeInTheDocument();
    // 매입금액은 시세가 없어도 계산된다
    expect(screen.getByText('₩24,414,000')).toBeInTheDocument();
    // 평가금액은 아직 없다 — 0원으로 지어내면 안 된다
    expect(screen.queryByText('₩23,653,500')).not.toBeInTheDocument();
  });

  /*
   * 목데이터로 폴백하지 않는다. 잘못된 시세는 없는 시세보다 나쁘다 —
   * 사용자가 그 숫자를 믿고 실제로 매매할 수 있기 때문이다.
   */
  it('시세를 통째로 못 받으면 실패를 알리고 재시도를 제공한다', async () => {
    server.use(quotesErrorHandler());
    await renderDashboard();

    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert).toHaveTextContent('시세를 불러오지 못했습니다');
    expect(within(alert).getByRole('button', { name: '다시 시도' })).toBeInTheDocument();

    // 보유 정보는 그대로 남아 있다
    expect(screen.getAllByText('삼성전자').length).toBeGreaterThan(0);
    expect(screen.getByText('₩24,414,000')).toBeInTheDocument();
  });

  it('일부 종목만 시세를 못 받으면 그 행만 시세 없음으로 표시한다', async () => {
    server.use(quotesHandler(PRICES, { failed: ['035420'] }));
    await renderDashboard();

    const naverRow = await screen.findByText('NAVER');
    expect(within(naverRow.closest('[role="row"]')!).getByText('시세 없음')).toBeInTheDocument();

    // 나머지 종목은 정상적으로 그려진다
    expect(within(rowOf('삼성전자')).getByText('₩71,200')).toBeInTheDocument();
    // 제외된 종목이 있다는 사실을 숨기지 않는다
    expect(await screen.findByText(/1개 종목은 평가금액에서 제외/)).toBeInTheDocument();
  });

  it('종목이 하나도 없으면 빈 상태를 보여준다', async () => {
    useHoldingsStore.setState({ holdings: [], selectedId: null });
    await renderDashboard();

    expect(screen.getByText('아직 보유 종목이 없어요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '첫 종목 추가하기' })).toBeInTheDocument();
    expect(screen.getAllByText('종목을 추가하면 비중이 표시됩니다')).toHaveLength(2);
    expect(screen.getByText(/왼쪽에서 종목을 추가하면/)).toBeInTheDocument();
  });
});
