import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import './CreatePage.css';

type CreationOption = {
  id: string;
  to: string;
  icon: string;
  tag: string;
  title: string;
  description: string;
  status: 'Disponível' | 'Em breve';
  highlights: string[];
};

const creationOptions: CreationOption[] = [
  {
    id: 'interior',
    to: '/criar/interior',
    icon: '🏠',
    tag: 'Ambientes',
    title: 'Interiores',
    description: 'Desenhe plantas completas com paredes, portas e texturas personalizadas.',
    status: 'Disponível',
    highlights: [
      'Seleção livre com feedback visual',
      'Aplicação de textura diretamente na seleção',
      'Histórico de desfazer/refazer dedicado',
    ],
  },
  {
    id: 'global-map',
    to: '/criar/mapa-global',
    icon: '🌍',
    tag: 'Exploração',
    title: 'Mapa global',
    description: 'Planeje continentes, rotas marítimas e pontos de interesse em escala mundial.',
    status: 'Em breve',
    highlights: [
      'Hexágonos dinâmicos com camadas de bioma',
      'Ferramentas de rascunho para fronteiras e rotas',
      'Exportação de regiões em alta resolução',
    ],
  },
  {
    id: 'character',
    to: '/criar/personagem',
    icon: '🧙‍♂️',
    tag: 'Narrativa',
    title: 'Personagem',
    description: 'Estruture fichas básicas e prepare o visual dos seus NPCs e heróis.',
    status: 'Em breve',
    highlights: [
      'Modelos de ficha planejados',
      'Campos para atributos essenciais',
      'Exportação rápida para mesas híbridas',
    ],
  },
  {
    id: 'sheet',
    to: '/criar/ficha',
    icon: '📄',
    tag: 'Fichas',
    title: 'Criador de ficha',
    description: 'Monte fichas personalizadas com atributos, perícias e inventário organizado.',
    status: 'Disponível',
    highlights: [
      'Modelos iniciais para classes típicas de fantasia',
      'Campos editáveis para perícias, magias e anotações',
      'Exportação em PDF estilizado pensada para mesa virtual',
    ],
  },
  {
    id: 'item',
    to: '/criar/item',
    icon: '🗡️',
    tag: 'Coleção',
    title: 'Item',
    description: 'Organize armas, poções e artefatos com um fluxo de catalogação simples.',
    status: 'Em breve',
    highlights: [
      'Categorias configuráveis planejadas',
      'Biblioteca com busca por palavras-chave',
      'Ficha resumida para jogadores',
    ],
  },
  {
    id: 'document',
    to: '/criar/documento',
    icon: '🗒️',
    tag: 'Campanha',
    title: 'Criador de documento',
    description: 'Planeje cartas, briefings e compêndios de campanha com formatação guiada.',
    status: 'Disponível',
    highlights: [
      'Seções configuráveis com estilos prontos',
      'Snippets reaproveitáveis para NPCs e locais',
      'Histórico de versões para acompanhar mudanças',
    ],
  },
  {
    id: 'city-map',
    to: '/criar/mapa-cidade',
    icon: '🏙️',
    tag: 'Arquitetura',
    title: 'Mapa de cidade',
    description: 'Modele bairros, mercados e pontos-chave com controle granular de quadras.',
    status: 'Em breve',
    highlights: [
      'Biblioteca planejada de distritos temáticos',
      'Ferramentas para rotas de patrulha e fluxo',
      'Sistema de camadas para anotações rápidas',
    ],
  },
];

const updates: string[] = [
  'Seleção livre redesenhada para o editor de interiores.',
  'Upload de texturas direto na área selecionada.',
  'Ambientação com fundos animados sutis nas páginas principais.',
  'Novos módulos de ficha e documentos disponíveis na área Criar.',
  'Pré-produção iniciada para mapas globais e urbanos.',
];

const CreatePage: React.FC = () => {
  return (
    <div className="create-layout">
      <Header />
      <main className="create-content">
        <section className="create-hero">
          <div className="create-hero-copy">
            <span className="create-kicker">Laboratório criativo</span>
            <h1>Escolha o fluxo ideal para dar vida ao seu mundo</h1>
            <p>
              Expanda sua campanha com módulos pensados para narrativas de RPG. Combine ambientes,
              personagens e itens mantendo uma identidade visual consistente.
            </p>
            <div className="create-hero-actions">
              <Link to="/criar/interior" className="create-cta create-cta--primary">
                Iniciar um novo interior
              </Link>
              <Link to="/" className="create-cta create-cta--secondary">
                Voltar ao painel
              </Link>
            </div>
          </div>
          <div className="create-hero-panel" aria-hidden="true">
            <span className="create-panel-label">Destaques do editor</span>
            <ul className="create-panel-list">
              <li>Grade inteligente com encaixe livre ou fracionado.</li>
              <li>Texturas personalizadas aplicadas em grupo.</li>
              <li>Histórico com desfazer e refazer instantâneo.</li>
            </ul>
          </div>
        </section>

        <section className="create-grid" aria-label="Selecione um editor">
          {creationOptions.map((option) => (
            <Link
              key={option.id}
              className={`create-card${option.status === 'Disponível' ? '' : ' is-disabled'}`}
              to={option.status === 'Disponível' ? option.to : '#'}
              aria-disabled={option.status !== 'Disponível'}
              tabIndex={option.status === 'Disponível' ? 0 : -1}
              onClick={option.status === 'Disponível' ? undefined : (event) => event.preventDefault()}
            >
              <div className="create-card-header">
                <span className="create-card-icon" aria-hidden="true">{option.icon}</span>
                <span className={`create-card-status ${option.status === 'Disponível' ? 'available' : 'upcoming'}`}>
                  {option.status}
                </span>
              </div>
              <span className="create-card-tag">{option.tag}</span>
              <h2>{option.title}</h2>
              <p>{option.description}</p>
              <ul className="create-card-highlights">
                {option.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
              <span className="create-card-cta">
                {option.status === 'Disponível' ? 'Abrir módulo' : 'Em desenvolvimento'}
              </span>
            </Link>
          ))}
        </section>

        <section className="create-updates" aria-label="Novidades e próximos passos">
          <div className="create-updates-grid">
            <div className="create-updates-card">
              <span className="create-updates-kicker">Novidades recentes</span>
              <h2>Aprimoramentos para fluxos existentes</h2>
              <ul>
                {updates.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="create-updates-card create-updates-card--outline">
              <span className="create-updates-kicker">Em evolução</span>
              <h2>Personagens e itens estão em preparação</h2>
              <p>
                Entre com sua conta para receber um aviso quando disponibilizarmos os módulos narrativos e de
                inventário.
              </p>
              <Link to="/login" className="create-cta create-cta--ghost">
                Acompanhar novidades
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CreatePage;
