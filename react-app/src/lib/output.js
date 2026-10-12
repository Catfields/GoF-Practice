export function renderRunOutput(r) {
  const lines = [];
  if (r.error === 'unsupported-language' || r.error === 'runtime-missing') {
    lines.push({ text: r.stderr, cls: 'err' });
    return lines;
  }
  if (r.stdout) lines.push({ text: r.stdout.replace(/\n$/, ''), cls: 'ok' });
  if (r.stderr) lines.push({ text: r.stderr, cls: 'err' });
  if (r.timedOut) lines.push({ text: '[超时] 程序运行超过 8 秒被终止', cls: 'err' });
  if (!r.stdout && !r.stderr && r.exitCode === 0) lines.push({ text: '（无输出）', cls: '' });
  return lines;
}

export function renderSubmitOutput(r) {
  const lines = [];
  if (r.results.length === 0) {
    lines.push({ text: '本题暂无可评测的测试用例', cls: '' });
    return lines;
  }
  if (r.results.some((x) => x.runtimeError)) {
    const rr = r.results.find((x) => x.runtimeError);
    lines.push({ text: '运行错误：', cls: 'err' });
    lines.push({ text: rr.runtimeError, cls: 'err' });
    return lines;
  }
  if (r.results.some((x) => x.compileError)) {
    const rr = r.results.find((x) => x.compileError);
    lines.push({ text: '编译错误：', cls: 'err' });
    lines.push({ text: rr.message, cls: 'err' });
    return lines;
  }
  r.results.forEach((tc) => {
    const base = `用例 ${tc.index + 1}: ${tc.passed ? '通过 ✓' : '未通过 ✗'}`;
    const detail = tc.passed
      ? ''
      : `\n  输入: ${tc.input}\n  期望: ${tc.expected}\n  实际: ${(tc.actual && tc.actual.trim()) || '(空)'}`;
    lines.push({ text: base + detail, cls: tc.passed ? 'case-pass' : 'case-fail' });
  });
  lines.push({ text: '' });
  lines.push({
    text: `结果：${r.passedCount}/${r.total} 通过 ${r.solved ? '—— AC，已记录通过！' : '—— 未全部通过，继续加油'}`,
    cls: r.solved ? 'case-pass' : 'case-fail',
  });
  return lines;
}