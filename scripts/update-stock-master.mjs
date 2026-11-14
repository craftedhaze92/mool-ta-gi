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
 * - 뒷부분: 고정폭 속성 필드. KOSPI 228자, KOSDAQ 222자
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
  { market: 'KOSPI', file: 'kospi_code.mst', tailLength: 228 },
  { market: 'KOSDAQ', file: 'kosdaq_code.mst', tailLength: 222 },
];

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

function parseMaster(buffer, { market, tailLength }) {
  const text = new TextDecoder('euc-kr').decode(buffer);

  return text
    .split(/\r?\n/)
    .filter((line) => line.length > tailLength)
    .map((line) => {
      const head = line.slice(0, line.length - tailLength);
      return { code: head.slice(0, 9).trim(), name: head.slice(21).trim(), market };
    })
    .filter((stock) => CODE_PATTERN.test(stock.code) && stock.name !== '');
}

async function main() {
  const workDir = mkdtempSync(path.join(tmpdir(), 'stock-master-'));

  try {
    const stocks = [];
    for (const spec of MARKETS) {
      const parsed = parseMaster(await downloadMaster(spec.file, workDir), spec);
      console.log(`${spec.market}: ${parsed.length}종목`);
      stocks.push(...parsed);
    }

    stocks.sort((a, b) => a.code.localeCompare(b.code));

    // 한 줄에 한 종목으로 쓴다. 갱신 diff에서 어떤 종목이 바뀌었는지 바로 보이게 하려는 것이다
    const rows = stocks.map(({ code, name, market }) => JSON.stringify([code, name, market]));
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
