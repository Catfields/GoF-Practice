const creational = require('./creational');
const structural = require('./structural');
const behavioral = require('./behavioral');

const all = [...creational, ...structural, ...behavioral];

function buildTemplates(p) {
  const header = (langComment) =>
    `${langComment} ${p.pattern}（${p.patternEn}）—— ${p.title}\n${langComment} 输入输出说明：${p.ioSchema.replace(/\n/g, ' ')}`.trim() +
    '\n' +
    `${langComment} 请在下方实现你的设计模式代码，并保留主程序读取输入的逻辑。\n`;

  const python = `${header('#')}
import sys

# ===== 在这里实现你的设计模式类 =====


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        op = parts[0]
        # TODO: 根据 op 与 parts[1:] 调用你的设计模式实现，并用 print 输出结果


if __name__ == '__main__':
    main()
`;

  const java = `${header('//')}
import java.io.*;
import java.util.*;

public class Main {
    // ===== 在这里实现你的设计模式类 =====

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length == 0) continue;
            String op = parts[0];
            // TODO: 根据 op 与 parts[1:] 调用你的设计模式实现，用 System.out.println 输出结果
        }
    }
}
`;

  const go = `${header('//')}
package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

// ===== 在这里实现你的设计模式结构类型 =====

func main() {
    reader := bufio.NewReader(os.Stdin)
    line, _ := reader.ReadString('\\n')
    line = strings.TrimSpace(line)
    var t int
    fmt.Sscanf(line, "%d", &t)
    for i := 0; i < t; i++ {
        line, _ = reader.ReadString('\\n')
        line = strings.TrimSpace(line)
        parts := strings.Fields(line)
        if len(parts) == 0 {
            continue
        }
        op := parts[0]
        _ = op
        // TODO: 根据 op 与 parts[1:] 调用你的设计模式实现，用 fmt.Println 输出结果
    }
}
`;

  const javascript = `${header('//')}
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });

// ===== 在这里实现你的设计模式类 =====

const lines = [];
rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
    const t = parseInt(lines[0] || '0', 10);
    for (let i = 1; i <= t; i++) {
        const parts = (lines[i] || '').trim().split(/ +/);
        if (parts.length === 0 || parts[0] === '') continue;
        const op = parts[0];
        // TODO: 根据 op 与 parts[1:] 调用你的设计模式实现，用 console.log 输出结果
    }
});
`;

  return { python, java, go, javascript };
}

const patterns = all.map((p) => {
  p.concept = (p.concept || '').trim();
  p.structure = (p.structure || '').trim();
  p.scenario = (p.scenario || '').trim();
  p.ioSchema = (p.ioSchema || '').trim();
  p.summary = (p.summary || '').trim();
  p.templates = buildTemplates(p);
  return p;
});

module.exports = patterns;