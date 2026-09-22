import { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Markdown } from '@tiptap/markdown';

const MediaContext = createContext({});
function Photo({ node, selected }) {
  const media = useContext(MediaContext);
  const path = node.attrs.src?.startsWith('/news-media/') ? node.attrs.src.slice(12) : null;
  return <NodeViewWrapper className={selected ? 'ring-2 ring-primary rounded' : ''}>
    {path && media[path] ? <img src={media[path]} alt={node.attrs.alt || ''} draggable="false" />
      : <span className="text-ink-muted">Photo unavailable. Upload it again if needed.</span>}
  </NodeViewWrapper>;
}
const PrivateImage = Image.extend({ addNodeView() { return ReactNodeViewRenderer(Photo); } });

// Markdown remains the storage format so existing articles need no conversion.
// Administrators interact only with the visual document.
const EventBodyEditor = forwardRef(function EventBodyEditor({ value, onChange, media, disabled }, ref) {
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const photoSelection = useRef(null);
  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, underline: false, strike: false,
      link: { openOnClick: false } }), PrivateImage, Markdown],
    content: value,
    contentType: 'markdown',
    editorProps: { attributes: { role: 'textbox', 'aria-label': 'Article body', 'aria-multiline': 'true',
      class: 'news-body min-h-[360px] p-4 outline-none break-words' } },
    onUpdate: ({ editor: current }) => changeRef.current(current.getMarkdown()),
  });
  useEffect(() => {
    if (editor && editor.getMarkdown() !== value) editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
  }, [editor, value]);
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  useImperativeHandle(ref, () => ({
    rememberPhotoPosition() { photoSelection.current = editor ? { from: editor.state.selection.from, to: editor.state.selection.to } : null; },
    insertPhoto(path, alt) {
      if (!editor) return;
      const chain = editor.chain().focus();
      if (photoSelection.current) chain.setTextSelection(photoSelection.current);
      chain.setImage({ src: `/news-media/${path}`, alt }).run();
      photoSelection.current = null;
    },
  }), [editor]);
  if (!editor) return <p>Loading editor…</p>;
  const actions = [
    ['Bold', 'bold', () => editor.chain().focus().toggleBold().run()],
    ['Italic', 'italic', () => editor.chain().focus().toggleItalic().run()],
    ['Heading', 'heading', () => editor.chain().focus().toggleHeading({ level: 2 }).run()],
    ['Quote', 'blockquote', () => editor.chain().focus().toggleBlockquote().run()],
    ['List', 'bulletList', () => editor.chain().focus().toggleBulletList().run()],
  ];
  return <MediaContext.Provider value={media}>
    <div className="border border-outline-variant rounded overflow-hidden bg-white">
      <div role="toolbar" aria-label="Article formatting" className="flex flex-wrap gap-1 bg-surface-low p-2">
        {actions.map(([label, mark, action]) => <button key={label} type="button" disabled={disabled}
          className={`sc-btn-ghost ${editor.isActive(mark) ? '!bg-primary !text-white' : ''}`}
          aria-pressed={editor.isActive(mark)} onMouseDown={(event) => event.preventDefault()} onClick={action}>{label}</button>)}
        <button type="button" className="sc-btn-ghost" disabled={disabled || !editor.can().undo()}
          onMouseDown={(event) => event.preventDefault()} onClick={() => editor.chain().focus().undo().run()}>Undo</button>
        <button type="button" className="sc-btn-ghost" disabled={disabled || !editor.can().redo()}
          onMouseDown={(event) => event.preventDefault()} onClick={() => editor.chain().focus().redo().run()}>Redo</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  </MediaContext.Provider>;
});
export default EventBodyEditor;
