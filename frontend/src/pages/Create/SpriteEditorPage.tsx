
import React from 'react';
import Header from '../../components/Header';
import SpriteEditor from '../../sprite/SpriteEditor';

const SpriteEditorPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div
        style={{
          width: '100vw',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          padding: 0,
          margin: 0,
          boxSizing: 'border-box',
        }}
      >
        <SpriteEditor />
      </div>
    </div>
  );
};

export default SpriteEditorPage;
