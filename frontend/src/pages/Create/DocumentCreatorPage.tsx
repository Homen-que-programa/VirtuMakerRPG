import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import './CreatePage.css';
import './DocumentCreatorPage.css';

type DocumentSection = {
  id: string;
  heading: string;
  content: string;
};

const initialSections: DocumentSection[] = [
  { id: 'context', heading: 'Contexto', content: '' },
  { id: 'objetivos', heading: 'Objetivos principais', content: '' },
  { id: 'ganchos', heading: 'Ganchos narrativos', content: '' },
];
const defaultDocumentInfo = {
  title: '',
  audience: '',
  tone: 'Heroico',
  summary: '',
};
const createSections = () => initialSections.map((section) => ({ ...section }));

const DocumentCreatorPage: React.FC = () => {
  const [documentInfo, setDocumentInfo] = useState(() => ({ ...defaultDocumentInfo }));

  const [sections, setSections] = useState<DocumentSection[]>(createSections);

  const handleInfoChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setDocumentInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSectionChange = (event: React.ChangeEvent<HTMLTextAreaElement>, id: string) => {
    const { value } = event.target;
    setSections((prev) => prev.map((section) => (
      section.id === id
        ? { ...section, content: value }
        : section
    )));
  };

  return (
    <div className="create-layout">
      <Header />
      <main className="create-content">
        <section className="create-hero">
          <div className="create-hero-copy">
            <span className="create-kicker">Documentos de campanha</span>
            <h1>Estruture briefings, cartas e relatórios com clareza narrativa</h1>
            <p>
              Construa documentos com foco na sua mesa. Defina público e tom, escreva seções guiadas e acompanhe o
              preview com estilos pensados para leitura rápida por jogadores e mestres.
            </p>
            <div className="create-hero-actions">
              <a className="create-cta create-cta--primary" href="#documento-editor">
                Iniciar documento
              </a>
              <a className="create-cta create-cta--secondary" href="#documento-preview">
                Revisar visual
              </a>
            </div>
          </div>
          <div className="create-hero-panel" aria-hidden="true">
            <span className="create-panel-label">Dicas rápidas</span>
            <ul className="create-panel-list">
              <li>Escolha um público-alvo para ajustar o tom.</li>
              <li>Separe ganchos e contatos em seções curtas.</li>
              <li>Finalize com instruções claras sobre próximos passos.</li>
            </ul>
          </div>
        </section>

        <section id="documento-editor" className="document-layout" aria-label="Editor de documento">
          <form
            className="document-panel"
            onSubmit={(event) => event.preventDefault()}
            onReset={() => {
              setDocumentInfo({ ...defaultDocumentInfo });
              setSections(createSections());
            }}
          >
            <header className="document-panel__header">
              <div>
                <span className="document-panel__eyebrow">Configuração</span>
                <h2>Estrutura básica</h2>
              </div>
            </header>

            <div className="document-field-grid">
              <label className="document-field">
                <span>Título</span>
                <input
                  type="text"
                  name="title"
                  value={documentInfo.title}
                  placeholder="Ex.: Dossiê da Aliança da Aurora"
                  onChange={handleInfoChange}
                />
              </label>
              <label className="document-field">
                <span>Público / Destinatário</span>
                <input
                  type="text"
                  name="audience"
                  value={documentInfo.audience}
                  placeholder="Ex.: Conselho de Capitães"
                  onChange={handleInfoChange}
                />
              </label>
              <label className="document-field">
                <span>Tom desejado</span>
                <input
                  type="text"
                  name="tone"
                  value={documentInfo.tone}
                  placeholder="Ex.: Urgente e inspirador"
                  onChange={handleInfoChange}
                />
              </label>
              <label className="document-field document-field--full">
                <span>Resumo introdutório</span>
                <textarea
                  name="summary"
                  rows={3}
                  value={documentInfo.summary}
                  placeholder="Resume o objetivo do documento em um parágrafo envolvente."
                  onChange={handleInfoChange}
                />
              </label>
            </div>

            <div className="document-sections" aria-label="Seções do documento">
              {sections.map((section) => (
                <label key={section.id} className="document-section">
                  <span>{section.heading}</span>
                  <textarea
                    rows={4}
                    value={section.content}
                    placeholder={section.heading === 'Contexto'
                      ? 'Descreva o cenário, a situação atual e as forças envolvidas.'
                      : section.heading === 'Objetivos principais'
                        ? 'Liste objetivos, prazos e métricas de sucesso.'
                        : 'Inclua ganchos narrativos, recompensas ou segredos.'
                    }
                    onChange={(event) => handleSectionChange(event, section.id)}
                  />
                </label>
              ))}
            </div>

            <div className="document-actions">
              <button type="button" className="create-cta create-cta--secondary">
                Exportar como Markdown (em breve)
              </button>
              <button type="reset" className="create-cta create-cta--ghost">
                Limpar texto
              </button>
            </div>
          </form>

          <aside id="documento-preview" className="document-panel document-panel--preview" aria-live="polite">
            <header className="document-panel__header">
              <div>
                <span className="document-panel__eyebrow">Pré-visualização</span>
                <h2>Documento formatado</h2>
              </div>
            </header>

            <article className="document-preview">
              <h1>{documentInfo.title || 'Documento sem título'}</h1>
              <dl className="document-preview__meta">
                <div>
                  <dt>Destinatário</dt>
                  <dd>{documentInfo.audience || 'Defina o público para contextualizar o tom.'}</dd>
                </div>
                <div>
                  <dt>Tom</dt>
                  <dd>{documentInfo.tone || 'Informe o tom para orientar a escrita.'}</dd>
                </div>
              </dl>
              {documentInfo.summary && (
                <p className="document-preview__summary">{documentInfo.summary}</p>
              )}
              <div className="document-preview__body">
                {sections.map((section) => (
                  <section key={section.id}>
                    <h2>{section.heading}</h2>
                    <p>{section.content || 'Esta seção permanece vazia até que você adicione conteúdo.'}</p>
                  </section>
                ))}
              </div>
            </article>
          </aside>
        </section>

        <section className="create-updates" aria-label="Boas práticas">
          <div className="create-updates-grid">
            <div className="create-updates-card">
              <span className="create-updates-kicker">Organização</span>
              <h2>Documentos claros economizam tempo de mesa</h2>
              <ul>
                <li>Mantenha parágrafos curtos de até três frases.</li>
                <li>Use seções para separar spoilers e informações públicas.</li>
                <li>Registre contatos e recursos disponíveis sempre com forma de acesso.</li>
              </ul>
            </div>
            <div className="create-updates-card create-updates-card--outline">
              <span className="create-updates-kicker">Linha do tempo</span>
              <h2>Automação de versões está em andamento</h2>
              <p>
                Estamos preparando salvamento na nuvem, controle de versões e exportação direta para PDF e HTML
                responsivo.
              </p>
              <Link className="create-cta create-cta--ghost" to="/criar">
                Voltar para a galeria
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default DocumentCreatorPage;
