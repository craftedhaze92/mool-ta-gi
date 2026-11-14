/**
 * 종목 마스터 갱신 스크립트. `pnpm stocks:update`로 실행한다.
 *
 * KIS OpenAPI에는 종목명 키워드 검색 API가 없다. 대신 KIS가 매일 공개 배포하는 종목 마스터
 * 파일(kospi_code.mst / kosdaq_code.mst)을 받아 src/shared/api/stock-master/stocks.json으로
 * 변환해 커밋한다. 검색은 BFF(/api/stocks)가 이 파일로 처리하므로 KIS 유량 제한과 무관하다.
 *
 * 신규 상장·상호 변경은 이 스크립트를 다시 돌려야 반영된다.
 *
 * 파일 형식(KIS 공식 샘플 kis_kospi_code_mst.py 기준):
 * - CP949 인코딩, 한 줄에 한 종목
 * - 앞부분: 단축코드(9) + 표준코드(12) + 한글명(가변)
 * - 뒷부분: 고정폭 속성 필드. KOSPI 228자, KOSDAQ 222자.
 *   그 맨 앞이 [공백 1][증권그룹 2][시가총액규모 1][업종 대분류 4][중분류 4][소분류 4]이다.
 *
 * 섹터는 KRX 업종(지수업종 분류)이다. 업종 코드 → 이름은 같은 곳에서 배포하는 idxcode.mst에
 * 있다(한 줄에 [시장 1][업종코드 4][이름]; 시장은 0=KOSPI, 1=KOSDAQ).
 * 중분류가 있으면 중분류(예: 전기·전자), 없으면 대분류(예: 금융)를 쓴다 — 대분류는 '제조'처럼
 * 너무 넓어 비중 차트에서 의미가 없다.
 *
 * 업종 코드가 비어 있는 종목도 있다. ETF는 'ETF'로, 나머지(KOSDAQ 일부·외국주권·DR 등)는
 * '기타'로 둔다. KOSDAQ 일부 종목은 마스터 파일에 업종 코드 자체가 없다(실측 2026-11).
 *
 * 압축 해제는 시스템 unzip을 쓴다(macOS·대부분의 Linux 기본 탑재). 의존성을 늘리지 않으려는 것이다.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MASTER_BASE_URL = 'https://new.real.download.dws.co.kr/common/master';

const MARKETS = [
  { market: 'KOSPI', file: 'kospi_code.mst', tailLength: 228, sectorPrefix: '0' },
  { market: 'KOSDAQ', file: 'kosdaq_code.mst', tailLength: 222, sectorPrefix: '1' },
];

const SECTOR_MASTER_FILE = 'idxcode.mst';

/** 업종을 알 수 없을 때. stock-search-contract.ts의 UNKNOWN_SECTOR와 같은 값이다 */
const UNKNOWN_SECTOR = '기타';

/** 업종 코드가 없는 증권그룹 중 따로 이름을 붙일 것 */
const SECTOR_BY_GROUP = { EF: 'ETF' };

const EMPTY_SECTOR_CODE = '0000';

/** 앱의 종목코드 규칙(holding-form-schema.ts)과 같다. 펀드(9자리)·영숫자 코드는 제외된다 */
const CODE_PATTERN = /^\d{6}$/;

const OUTPUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/shared/api/stock-master/stocks.json',
);

async function downloadMaster(file, workDir) {
  const response = await fetch(`${MASTER_BASE_URL}/${file}.zip`);
  if (!response.ok) throw new Error(`${file}.zip 다운로드 실패: HTTP ${response.status}`);

  const zipPath = path.join(workDir, `${file}.zip`);
  writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));

  // -p: 압축을 풀어 stdout으로. 마스터 파일이 1MB 안팎이라 버퍼 기본값을 넉넉히 늘린다
  return execFileSync('unzip', ['-p', zipPath, file], { maxBuffer: 16 * 1024 * 1024 });
}

function decodeLines(buffer) {
  return new TextDecoder('euc-kr').decode(buffer).split(/\r?\n/);
}

/** idxcode.mst → '시장+업종코드'(예: '00013') → 업종명(예: '전기·전자') */
function parseSectorMaster(buffer) {
  const names = new Map();
  for (const line of decodeLines(buffer)) {
    if (line.length < 6) continue;
    names.set(line.slice(0, 5), line.slice(5).trim());
  }
  return names;
}

function resolveSector(tail, { sectorPrefix }, sectorNames) {
  const group = tail.slice(1, 3);
  if (SECTOR_BY_GROUP[group]) return SECTOR_BY_GROUP[group];

  const major = tail.slice(4, 8);
  const middle = tail.slice(8, 12);
  const code = middle !== EMPTY_SECTOR_CODE ? middle : major;
  if (code === EMPTY_SECTOR_CODE) return UNKNOWN_SECTOR;

  return sectorNames.get(sectorPrefix + code) ?? UNKNOWN_SECTOR;
}

function parseMaster(buffer, spec, sectorNames) {
  const { market, tailLength } = spec;

  return decodeLines(buffer)
    .filter((line) => line.length > tailLength)
    .map((line) => {
      const head = line.slice(0, line.length - tailLength);
      const tail = line.slice(line.length - tailLength);

      return {
        code: head.slice(0, 9).trim(),
        name: head.slice(21).trim(),
        market,
        sector: resolveSector(tail, spec, sectorNames),
      };
    })
    .filter((stock) => CODE_PATTERN.test(stock.code) && stock.name !== '');
}

async function main() {
  const workDir = mkdtempSync(path.join(tmpdir(), 'stock-master-'));

  try {
    const sectorNames = parseSectorMaster(await downloadMaster(SECTOR_MASTER_FILE, workDir));

    const stocks = [];
    for (const spec of MARKETS) {
      const parsed = parseMaster(await downloadMaster(spec.file, workDir), spec, sectorNames);
      console.log(`${spec.market}: ${parsed.length}종목`);
      stocks.push(...parsed);
    }

    stocks.sort((a, b) => a.code.localeCompare(b.code));

    // 한 줄에 한 종목으로 쓴다. 갱신 diff에서 어떤 종목이 바뀌었는지 바로 보이게 하려는 것이다
    const rows = stocks.map(({ code, name, market, sector }) =>
      JSON.stringify([code, name, market, sector]),
    );
    const updatedAt = new Date().toISOString().slice(0, 10);
    writeFileSync(
      OUTPUT,
      `{\n"updatedAt": ${JSON.stringify(updatedAt)},\n"stocks": [\n${rows.join(',\n')}\n]\n}\n`,
    );

    console.log(`총 ${stocks.length}종목 → ${path.relative(process.cwd(), OUTPUT)}`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

await main();
