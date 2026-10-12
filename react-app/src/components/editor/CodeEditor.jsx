import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createCodeEditor } from './editor.js';
import './editor.css';

export const CodeEditor = forwardRef(function CodeEditor(
  {
    value,
    language,
    onChange,
    onCursor,
    wrap = false,
    disabled = false,
    className = '',
  },
  ref
) {
  const hostRef = useRef(null);
  const editorRef = useRef(null);
  const cbRef = useRef({ onChange, onCursor });
  cbRef.current = { onChange, onCursor };

  useEffect(() => {
    if (!hostRef.current) return;
    const editor = createCodeEditor(hostRef.current, {
      language,
      indentUnit: 4,
      wrap,
      disabled,
      onChange: (v) => cbRef.current.onChange && cbRef.current.onChange(v),
      onCursor: (c) => cbRef.current.onCursor && cbRef.current.onCursor(c),
    });
    editorRef.current = editor;
    if (value != null) editor.setValue(value, true);
    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外部值变化（切换语言 / 查看答案 / 重置）时同步进编辑器（明确来自外部）
  const lastValueRef = useRef(value);
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      ed.setValue(value, true);
    }
  }, [value]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (ed.isWrapped() !== wrap) ed.setWrap(wrap);
  }, [wrap]);

  useEffect(() => {
    const ed = editorRef.current;
    if (ed) ed.setDisabled(disabled);
  }, [disabled]);

  useImperativeHandle(ref, () => ({
    get value() {
      return editorRef.current ? editorRef.current.getValue() : '';
    },
    setValue(v, silent) {
      lastValueRef.current = v;
        const ed = editorRef.current;
        if (ed) ed.setValue(v, silent);
      },
      toggleComment() {
        const ed = editorRef.current;
        if (ed) ed.toggleComment();
      },
      insertText(t) {
        const ed = editorRef.current;
        if (ed) ed.insertText(t);
      },
      isWrapped() {
        return editorRef.current ? editorRef.current.isWrapped() : wrap;
      },
      setWrap(on) {
        const ed = editorRef.current;
        if (ed) ed.setWrap(on);
      },
      setDisabled(on) {
        const ed = editorRef.current;
        if (ed) ed.setDisabled(on);
      },
      focus() {
        const ed = editorRef.current;
        if (ed) ed.focus();
      },
      setLanguage(l) {
        const ed = editorRef.current;
        if (ed) ed.setLanguage(l);
      },
    }));

  return <div ref={hostRef} className={`ced-host ${className || ''}`.trim()} />;
});