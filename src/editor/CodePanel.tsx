import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";

export function CodePanel({ value, language, onChange }: { value: string; language: string; onChange: (value: string) => void }) {
  const host = useRef<HTMLDivElement>(null), view = useRef<EditorView | null>(null), changed = useRef(onChange);
  changed.current = onChange;
  useEffect(() => {
    const editor = new EditorView({ parent: host.current!, doc: value, extensions: [basicSetup, language === "css" ? css() : language === "js" ? javascript() : html(), EditorView.lineWrapping, EditorView.updateListener.of(update => { if (update.docChanged) changed.current(update.state.doc.toString()); }), EditorView.theme({ "&": { height: "100%", fontSize: "12px" }, ".cm-scroller": { overflow: "auto", fontFamily: "Consolas, monospace" }, ".cm-content": { paddingBottom: "40px" } })] });
    view.current = editor; return () => { editor.destroy(); view.current = null; };
  }, [language]);
  useEffect(() => { const editor = view.current; if (editor && editor.state.doc.toString() !== value) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } }); }, [value]);
  return <div className="ve-code-editor" ref={host} />;
}
