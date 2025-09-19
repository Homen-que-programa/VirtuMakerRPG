import React, { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import './CreatePage.css';
import './MapEditor/MapEditor.css';
import HexWorldEditor from './MapEditor/HexWorldEditor.tsx';

type SceneType = 'mundo' | 'batalha' | 'cidade' | 'interior';

const MapCreatorPage: React.FC = () => {
  const [scene, setScene] = useState<SceneType>('mundo');

  return (
    <div className="create-layout">
      <Header />
      <main className="create-content">
        <h1>Criar Mapa</h1>

        <div className="scene-tabs" role="tablist" aria-label="Tipos de cena do mapa">
          {([
            { id: 'mundo', label: 'Mundo' },
            { id: 'batalha', label: 'Batalha' },
            { id: 'cidade', label: 'Cidade' },
            { id: 'interior', label: 'Interior' },
          ] as { id: SceneType; label: string }[]).map((opt) => (
            <button
              key={opt.id}
              role="tab"
              aria-selected={scene === opt.id}
              className={`scene-tab ${scene === opt.id ? 'active' : ''}`}
              onClick={() => setScene(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {scene === 'mundo' && <HexWorldEditor />}

        {scene !== 'mundo' && (
          <div className="placeholder-card" aria-live="polite">
            <h2>{scene.charAt(0).toUpperCase() + scene.slice(1)}</h2>
            <p>Editor para "{scene}" em breve.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MapCreatorPage;
