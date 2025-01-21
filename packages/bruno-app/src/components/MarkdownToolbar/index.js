import {
  IconBold,
  IconItalic,
  IconH1,
  IconH2,
  IconH3,
  IconH4,
  IconH5,
  IconH6,
  IconStrikethrough,
  IconCode,
  IconSourceCode,
  IconQuote,
  IconList,
  IconListNumbers,
  IconLink
} from '@tabler/icons-react';

const MarkdownToolbar = ({ editorRef }) => {
  const controlGroup = 'flex gap-x-2';
  const control = 'text-gray-400 hover:text-gray-200 cursor-pointer';

  const applyEditorAction = (action) => {
    if (!editorRef?.current) return;

    const editor = editorRef.current?.editor;
    const cursor = editor?.getCursor();
    const line = editor?.getLine(cursor.line);
    const selection = editor?.getSelection();

    // Store the current selection
    const selectionStart = editor?.getCursor('from');
    const selectionEnd = editor?.getCursor('to');

    action({ editor, cursor, line, selection, selectionStart, selectionEnd });
    editor?.focus();
  };

  const handleHeading = (level) => {
    const prefix = '#'.repeat(level) + ' ';
    applyEditorAction(({ editor, cursor, line, selection, selectionStart, selectionEnd }) => {
      const startLine = editor?.getLine(selectionStart.line);
      const prefixStart = startLine.slice(selectionStart.ch - level - 1, selectionStart.ch);
      const isPrefixAlsoSelected = startLine.startsWith(prefix);
      const hasPrefix = prefixStart === prefix || isPrefixAlsoSelected;

      if (selection) {
        if (hasPrefix) {
          editor?.replaceSelection(selection);
          if (isPrefixAlsoSelected) {
            editor?.replaceRange(
              '',
              { line: selectionStart.line, ch: 0 },
              { line: selectionStart.line, ch: level + 1 }
            );
            editor?.setSelection(
              { line: selectionStart.line, ch: selectionStart.ch - level - 1 },
              { line: selectionEnd.line, ch: selectionEnd.ch - level - 1 }
            );
          } else {
            editor?.replaceRange('', { line: selectionStart.line, ch: selectionStart.ch - level - 1 }, selectionStart);
            editor?.setSelection(
              { line: selectionStart.line, ch: selectionStart.ch - level - 1 },
              { line: selectionEnd.line, ch: selectionEnd.ch - level - 1 }
            );
          }
        } else {
          editor?.replaceSelection(`${prefix}${selection}`);
          editor?.setSelection(
            { line: selectionStart.line, ch: selectionStart.ch + level + 1 },
            { line: selectionEnd.line, ch: selectionEnd.ch + level + 1 }
          );
        }
        return;
      }

      if (line.startsWith(prefix)) {
        editor?.replaceRange(
          line.slice(prefix.length),
          { line: cursor.line, ch: 0 },
          { line: cursor.line, ch: line.length }
        );
        editor?.setCursor({ line: cursor.line, ch: cursor.ch - level - 1 });
      } else {
        editor?.replaceRange(`${prefix}${line}`, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
        editor?.setCursor({ line: cursor.line, ch: cursor.ch + level + 1 });
      }
    });
  };

  const applyFormatting = ({ selection, line, selectionStart, selectionEnd, editor, cursor, chars }) => {
    const isSelectedWithChars = selection.startsWith(chars) && selection.endsWith(chars);
    const isSelectionBoundedByChars =
      line.slice(selectionStart.ch - chars.length, selectionStart.ch) === chars &&
      line.slice(selectionEnd.ch, selectionEnd.ch + chars.length) === chars;
    const isFormatted = isSelectedWithChars || isSelectionBoundedByChars;

    let newText;
    if (isFormatted) {
      if (isSelectedWithChars) {
        newText = selection.slice(chars.length, -chars.length);
      } else if (isSelectionBoundedByChars) {
        newText = line.slice(selectionStart.ch, selectionEnd.ch);
      }
    } else {
      newText = `${chars}${selection}${chars}`;
    }

    if (isFormatted) {
      if (isSelectedWithChars) {
        editor?.replaceRange(
          newText,
          { line: selectionStart.line, ch: selectionStart.ch },
          { line: selectionEnd.line, ch: selectionEnd.ch }
        );
        editor?.setSelection(
          { line: selectionStart.line, ch: selectionStart.ch },
          { line: selectionEnd.line, ch: selectionEnd.ch - 2 * chars.length }
        );
      } else if (isSelectionBoundedByChars) {
        editor?.replaceRange(
          newText,
          { line: selectionStart.line, ch: selectionStart.ch - chars.length },
          { line: selectionEnd.line, ch: selectionEnd.ch + chars.length }
        );
        editor?.setSelection(
          { line: selectionStart.line, ch: selectionStart.ch - chars.length },
          { line: selectionEnd.line, ch: selectionEnd.ch - chars.length }
        );
      }
    } else {
      editor?.replaceSelection(newText);
      editor?.setCursor({
        line: selectionEnd.line,
        ch: selectionEnd.ch + (isFormatted ? -chars.length : chars.length)
      });
      editor?.setSelection(
        { line: selectionStart.line, ch: selectionStart.ch + chars.length },
        { line: selectionEnd.line, ch: selectionEnd.ch + chars.length }
      );
    }
  };

  const handleBold = () => {
    console.log('Bold');
    applyEditorAction((props) => {
      applyFormatting({
        ...props,
        chars: '**'
      });
    });
  };

  const handleItalic = () => {
    console.log('Italic');
    applyEditorAction((props) => {
      applyFormatting({
        ...props,
        chars: '*'
      });
    });
  };

  const handleStrikethrough = () => {
    console.log('Strikethrough');
    applyEditorAction((props) => {
      applyFormatting({ ...props, chars: '~~' });
    });
  };

  const handleCode = () => {
    console.log('Code');
    applyEditorAction((props) => {
      applyFormatting({ ...props, chars: `\`` });
    });
  };

  const handleQuote = () => {
    console.log('Quote');
    applyEditorAction(({ editor, cursor, line, selection }) => {
      const lines = selection.split('\n');
      const allQuoted = lines.every((line) => line.startsWith('> '));

      const newLines = allQuoted ? lines.map((line) => line.slice(2)) : lines.map((line) => `> ${line}`);

      const newSelection = newLines.join('\n');
      const start = editor.getCursor('from');
      const end = editor.getCursor('to');

      editor?.replaceSelection(newSelection);

      const adjustment = allQuoted ? 0 : 2;
      const newEndCh = end.ch + adjustment * lines.length;

      editor?.setSelection({ line: start.line, ch: start.ch }, { line: end.line, ch: newEndCh });
    });
  };

  const handleBulletList = () => {
    console.log('Bullet List');

    applyEditorAction(({ editor, cursor, selection }) => {
      const lines = selection.split('\n');
      const allListed = lines.every((line) => line.startsWith('- '));
      const newLines = allListed ? lines.map((line) => line.slice(2)) : lines.map((line) => `- ${line}`);

      const newSelection = newLines.join('\n');
      const from = editor.getCursor('from');
      const to = editor.getCursor('to');

      editor?.replaceSelection(newSelection);

      const adjustment = allListed ? 0 : 2;
      const newEndCh = to.ch + adjustment * lines.length;

      editor?.setSelection({ line: from.line, ch: from.ch }, { line: to.line, ch: newEndCh });
    });
  };

  const handleNumberedList = () => {
    console.log('Numbered List');

    applyEditorAction(({ editor, cursor, selection }) => {
      const lines = selection.split('\n');
      const allNumbered = lines.every((line) => /^\d+\.\s/.test(line));
      const newLines = allNumbered
        ? lines.map((line) => line.replace(/^\d+\.\s/, ''))
        : lines.map((line, index) => `${index + 1}. ${line}`);

      const newSelection = newLines.join('\n');
      const from = editor.getCursor('from');
      const to = editor.getCursor('to');

      editor?.replaceSelection(newSelection);

      const adjustment = allNumbered ? 0 : 3;
      const newEndCh = to.ch + adjustment * lines.length;

      editor?.setSelection({ line: from.line, ch: from.ch }, { line: to.line, ch: newEndCh });
    });
  };

  const handleLink = () => {
    console.log('Link');
    applyEditorAction(({ editor, cursor, line, selection }) => {
      if (selection) {
        editor?.replaceSelection(`[${selection}](url)`);
        editor?.setSelection(
          { line: cursor.line, ch: cursor.ch + selection.length + 3 },
          { line: cursor.line, ch: cursor.ch + selection.length + 6 }
        );
      } else {
        editor?.replaceSelection(`[](url)`);
        editor?.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
      }
    });
  };

  const formatActions = [
    { icon: IconH1, action: () => handleHeading(1) },
    { icon: IconH2, action: () => handleHeading(2) },
    { icon: IconH3, action: () => handleHeading(3) },
    // { icon: IconH4, action: () => handleHeading(4) },
    // { icon: IconH5, action: () => handleHeading(5) },
    // { icon: IconH6, action: () => handleHeading(6) },
    { icon: IconBold, action: handleBold },
    { icon: IconItalic, action: handleItalic },
    { icon: IconStrikethrough, action: handleStrikethrough },
    { icon: IconCode, action: handleCode },
    { icon: IconQuote, action: handleQuote },
    { icon: IconList, action: handleBulletList },
    { icon: IconListNumbers, action: handleNumberedList },
    { icon: IconLink, action: handleLink }
  ];

  return (
    <div className={`${controlGroup} mt-2 mr-2`}>
      {formatActions.map(({ icon: Icon, action }) => (
        <Icon key={Icon} className={control} onClick={action} />
      ))}
    </div>
  );
};

export default MarkdownToolbar;
