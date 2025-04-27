import { createReadStream } from 'fs';
import { createInterface } from 'readline';

/** @param {string} path */
export async function* readDump(path) {
  const inputStream = createReadStream(path);

  const inputRL = createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  let count = 0;
  for await (const line of inputRL) {
    count++;
    if (count <= 2) {
      continue; // skip header
    }
    const columns = (line.match(/[^|]+/g) || []).map((cell) => cell.trim());
    if (columns.length !== 3) {
      continue; // ignore footer
    }

    const [name, related, data] = columns;
    yield { name, related, data };
  }
}
