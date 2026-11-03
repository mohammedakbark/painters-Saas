import { createInterface } from 'node:readline';

const ENTER = new Set(['\r', '\n']);
const CTRL_C = '\u0003';
const BACKSPACE = new Set(['\u007f', '\b']);

/**
 * Reads one line without echoing it, for passwords. On a terminal the input is
 * hidden. When stdin is not a terminal (piped input, or a console Node cannot
 * put into raw mode) the first line is read as-is and a warning is printed.
 */
export function readHiddenLine(prompt: string): Promise<string> {
  const { stdin, stdout, stderr } = process;
  if (!stdin.isTTY) {
    stderr.write(
      'Standard input is not a terminal: reading the password from it as-is.\n',
    );
    return readFirstLine();
  }

  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.setEncoding('utf8');
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (): void => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    const onData = (chunk: string): void => {
      for (const char of chunk) {
        if (ENTER.has(char)) {
          finish();
          resolve(value);
          return;
        }
        if (char === CTRL_C) {
          finish();
          reject(new Error('Cancelled.'));
          return;
        }
        value = BACKSPACE.has(char) ? value.slice(0, -1) : value + char;
      }
    };
    stdin.on('data', onData);
  });
}

function readFirstLine(): Promise<string> {
  return new Promise((resolve) => {
    const lines = createInterface({ input: process.stdin });
    let answered = false;
    lines.once('line', (line) => {
      answered = true;
      lines.close();
      resolve(line);
    });
    lines.once('close', () => {
      if (!answered) {
        resolve('');
      }
    });
  });
}
