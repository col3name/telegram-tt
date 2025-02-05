import React, {useState, useRef } from '../../lib/teact/teact';
import type { FC } from '../../lib/teact/teact';
import {ApiFormattedText, ApiMessageEntity, ApiMessageEntityTypes} from '../../api/types';
// import React, { useState, useRef } from 'react';

export const RichTextEditor = () => {
  const [formattedText, setFormattedText] = useState({
    text: '',
    entities: [],
  });
  const inputRef = useRef(null);

  // Function to handle formatting buttons
  const handleFormat = (type) => {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);
    const offset = range.startOffset;
    const length = selectedText.length;

    if (selectedText) {
      const newEntity = {
        type,
        offset,
        length,
      };

      setFormattedText((prev) => ({
        text: prev.text,
        entities: [...prev.entities, newEntity],
      }));

      // Apply the formatting in the contenteditable div
      const span = document.createElement('span');
      span.className = type;
      span.textContent = selectedText;
      range.deleteContents();
      range.insertNode(span);
    }
  };

  // Function to handle content changes
  const handleChange = (event) => {
    const target = event.target;
    if (inputRef.current) {
      setFormattedText((prev) => ({
        text: target,
        entities: prev.entities,
      }));
    }
  };

  return (
    <div>
      <div>
        <button onClick={() => handleFormat(ApiMessageEntityTypes.Bold)}>Bold</button>
        <button onClick={() => handleFormat(ApiMessageEntityTypes.Strike)}>Strike</button>
        <button onClick={() => handleFormat(ApiMessageEntityTypes.Spoiler)}>Spoiler</button>
        <button onClick={() => handleFormat(ApiMessageEntityTypes.TextUrl)}>Link</button>
        <button onClick={() => handleFormat(ApiMessageEntityTypes.Blockquote)}>Quote</button>
        <button onClick={() => handleFormat(ApiMessageEntityTypes.Code)}>Monospace</button>
      </div>
      <input
        contentEditable
        ref={inputRef}
        onChange={handleChange}
        style={{
          border: '1px solid #ccc',
          minHeight: '100px',
          padding: '10px',
          marginTop: '10px',
        }}
      ></input>
      <pre>{JSON.stringify(formattedText, null, 2)}</pre>
    </div>
  );
};
