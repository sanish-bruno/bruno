import { useCallback, useRef } from 'react';

/**
 * Hook for interacting with CodeMirror editor instances
 * Provides methods to insert text, get selection, etc.
 */
export function useEditorGateway(editorRef) {
  const insertAtSelection = useCallback((code) => {
    if (!editorRef?.current?.editor) {
      console.warn('Editor not available for text insertion');
      return;
    }

    const editor = editorRef.current.editor;
    const selection = editor.getSelection();

    if (selection) {
      // Replace selected text
      editor.replaceSelection(code);
    } else {
      // Insert at cursor position
      const cursor = editor.getCursor();
      editor.replaceRange(code, cursor);
    }

    // Focus the editor
    editor.focus();
  }, [editorRef]);

  const getSelectionText = useCallback(() => {
    if (!editorRef?.current?.editor) {
      return '';
    }

    const editor = editorRef.current.editor;
    return editor.getSelection() || '';
  }, [editorRef]);

  const getCursorPosition = useCallback(() => {
    if (!editorRef?.current?.editor) {
      return null;
    }

    const editor = editorRef.current.editor;
    return editor.getCursor();
  }, [editorRef]);

  const insertAtCursor = useCallback((code) => {
    if (!editorRef?.current?.editor) {
      console.warn('Editor not available for text insertion');
      return;
    }

    const editor = editorRef.current.editor;
    const cursor = editor.getCursor();
    editor.replaceRange(code, cursor);
    editor.focus();
  }, [editorRef]);

  const replaceAll = useCallback((code) => {
    if (!editorRef?.current?.editor) {
      console.warn('Editor not available for text replacement');
      return;
    }

    const editor = editorRef.current.editor;
    editor.setValue(code);
    editor.focus();
  }, [editorRef]);

  return {
    insertAtSelection,
    getSelectionText,
    getCursorPosition,
    insertAtCursor,
    replaceAll
  };
}

export default useEditorGateway;
