import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TabletopPage.css';

const scenePresets = [
  { id: 'tavern', label: 'Taverna animada', description: 'Planta base com iluminação quente e áreas reservadas.' },
  { id: 'forest', label: 'Clareira na floresta', description: 'Bosque denso pensado para emboscadas e encontros furtivos.' },
  { id: 'dungeon', label: 'Entrada de masmorra', description: 'Layout modular pronto para revelar salas aos poucos.' },
];

const roadmap = [
  'Upload de mapas com ajuste automático da escala.',
  'Tokens com indicadores de condição e barras de vida.',
  'Camadas compartilhadas para visão do mestre e dos jogadores.',
  'Integração com o criador de fichas para rolagens rápidas.',
];

const TabletopPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="tabletop-layout">
      <main className="tabletop-app" role="main">
        <header className="tabletop-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="back-button"
              onClick={() => navigate(-1)}
            >
              ← Voltar
            </button>
            <div className="topbar-heading">
              <span className="topbar-title">VirtuMaker Tabletop</span>
              <span className="topbar-subtitle">Arena tática compartilhada • primeira prévia</span>
            </div>
          </div>
          <div className="topbar-right">
            <span className="status-dot" aria-hidden="true" />
            <span className="topbar-status">Protótipo</span>
            <button type="button" className="edit-metadata" disabled>
              Configurações
            </button>
          </div>
        </header>

        <div className="tabletop-body">
          <aside className="tabletop-panel">
            <div className="panel-header">
              <strong>Biblioteca rápida</strong>
              <span>Escolha um preset para começar</span>
            </div>
            <ul className="panel-list" role="list">
              {scenePresets.map((preset) => (
                <li key={preset.id}>
                  <button type="button" className="preset-card" disabled>
                    <span className="preset-card__title">{preset.label}</span>
                    <span className="preset-card__desc">{preset.description}</span>
                    <span className="preset-card__badge">Em breve</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="panel-section">
              <h3>Importar recursos</h3>
              <p>Em breve você poderá enviar mapas em PNG/SVG, pacotes ZIP e tokens animados.</p>
              <div className="panel-actions">
                <button type="button" className="app-button" disabled>Importar mapa</button>
                <button type="button" className="app-button" disabled>Adicionar tokens</button>
              </div>
            </div>
          </aside>

          <section className="tabletop-workspace" aria-label="Mesa de jogo">
            <div className="workspace-header">
              <div>
                <strong>Área de jogo</strong>
                <span>Arraste e solte recursos quando a funcionalidade estiver ativa.</span>
              </div>
              <div className="workspace-actions">
                <button type="button" disabled>Mostrar grade</button>
                <button type="button" disabled>Modo névoa</button>
                <button type="button" disabled>Streaming</button>
              </div>
            </div>

            <div className="tabletop-board">
              <div className="board-overlay">
                <span className="board-title">Pré-visualização da mesa</span>
                <p>O carregamento de mapas, tokens e trilhas sonoras será habilitado nas próximas versões.</p>
                <div className="board-hints">
                  <div>
                    <span className="board-hint-label">Importar mapa</span>
                    <span className="board-hint-desc">Arraste um arquivo aqui ou use o botão dedicado.</span>
                  </div>
                  <div>
                    <span className="board-hint-label">Tokens</span>
                    <span className="board-hint-desc">Crie coleções a partir da sua biblioteca ou use presets.</span>
                  </div>
                  <div>
                    <span className="board-hint-label">Camadas</span>
                    <span className="board-hint-desc">Controle o que cada jogador vê com camadas privadas.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="tabletop-sidebar">
            <div className="sidebar-card">
              <span className="sidebar-eyebrow">Roadmap</span>
              <h3>Próximas entregas</h3>
              <ul>
                {roadmap.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="sidebar-card">
              <span className="sidebar-eyebrow">Integrações</span>
              <h3>Conecte outros criadores</h3>
              <p>
                Vincule cenários aos mapas criados no módulo de interiores, use fichas de personagem para rolagens
                rápidas e sincronize itens especiais com o catálogo.
              </p>
              <button type="button" className="app-button app-button--accent" disabled>
                Conectar módulos
              </button>
            </div>
          </aside>
        </div>

        <footer className="tabletop-footer" aria-label="Atalhos do tabletop">
          <div className="footer-left">
            <button type="button" disabled>Zoom -</button>
            <span>100%</span>
            <button type="button" disabled>Zoom +</button>
          </div>
          <div className="footer-right">
            <button type="button" disabled>Salvar cenário</button>
            <button type="button" className="primary" disabled>Compartilhar sessão</button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default TabletopPage;
