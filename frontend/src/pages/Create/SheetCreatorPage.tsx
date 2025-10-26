import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import './CreatePage.css';
import './SheetCreatorPage.css';

const abilityFields = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma'];
const defaultCoreData = {
  name: '',
  ancestry: '',
  role: '',
  level: '1',
  background: '',
  alignment: '',
};
const createAbilityState = () => abilityFields.reduce((acc, key) => {
  acc[key] = '10';
  return acc;
}, {} as Record<string, string>);

const SheetCreatorPage: React.FC = () => {
  const [coreData, setCoreData] = useState(() => ({ ...defaultCoreData }));

  const [abilities, setAbilities] = useState<Record<string, string>>(createAbilityState);

  const [notes, setNotes] = useState('');

  const resetSheet = () => {
    setCoreData({ ...defaultCoreData });
    setAbilities(createAbilityState());
    setNotes('');
  };

  const handleCoreChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCoreData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAbilityChange = (event: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const { value } = event.target;
    if (!/^\d{0,2}$/.test(value)) {
      return;
    }
    setAbilities((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const levelLabel = useMemo(() => {
    const parsed = Number(coreData.level) || 0;
    return parsed <= 0 ? 'Nível 1' : `Nível ${parsed}`;
  }, [coreData.level]);

  return (
    <div className="create-layout">
      <Header />
      <main className="create-content">
        <section className="create-hero">
          <div className="create-hero-copy">
            <span className="create-kicker">Fichas de personagem</span>
            <h1>Crie fichas limpas, prontas para mesa presencial ou virtual</h1>
            <p>
              Preencha os campos essenciais, ajuste atributos rapidamente e acompanhe um preview responsivo que
              reflete suas alterações em tempo real. Exporte a ficha quando estiver satisfeito.
            </p>
            <div className="create-hero-actions">
              <a className="create-cta create-cta--primary" href="#ficha-rapida">
                Montar ficha rápida
              </a>
              <a className="create-cta create-cta--secondary" href="#ficha-preview">
                Visualizar preview
              </a>
            </div>
          </div>
          <div className="create-hero-panel" aria-hidden="true">
            <span className="create-panel-label">Fluxo sugerido</span>
            <ul className="create-panel-list">
              <li>Comece pelos dados básicos de personagem.</li>
              <li>Defina os atributos principais com atalhos numéricos.</li>
              <li>Registre notas e ganchos narrativos para consulta rápida.</li>
            </ul>
          </div>
        </section>

        <section id="ficha-rapida" className="sheet-layout" aria-label="Construtor de ficha">
          <form
            className="sheet-panel"
            onSubmit={(event) => event.preventDefault()}
            onReset={resetSheet}
            aria-labelledby="sheet-builder-title"
          >
            <header className="sheet-panel__header">
              <div>
                <span className="sheet-panel__eyebrow">Entrada de dados</span>
                <h2 id="sheet-builder-title">Montagem rápida</h2>
              </div>
              <span className="sheet-panel__level">{levelLabel}</span>
            </header>

            <div className="sheet-field-grid">
              <label className="sheet-field">
                <span>Nome</span>
                <input
                  type="text"
                  name="name"
                  value={coreData.name}
                  placeholder="Ex.: Lyra Starwind"
                  onChange={handleCoreChange}
                />
              </label>
              <label className="sheet-field">
                <span>Ascendência</span>
                <input
                  type="text"
                  name="ancestry"
                  value={coreData.ancestry}
                  placeholder="Ex.: Meio-elfa"
                  onChange={handleCoreChange}
                />
              </label>
              <label className="sheet-field">
                <span>Classe / Função</span>
                <input
                  type="text"
                  name="role"
                  value={coreData.role}
                  placeholder="Ex.: Barda (Colégio dos Sussurros)"
                  onChange={handleCoreChange}
                />
              </label>
              <label className="sheet-field">
                <span>Nível</span>
                <input
                  type="number"
                  name="level"
                  min="1"
                  max="20"
                  value={coreData.level}
                  onChange={handleCoreChange}
                />
              </label>
              <label className="sheet-field">
                <span>Antecedente</span>
                <input
                  type="text"
                  name="background"
                  value={coreData.background}
                  placeholder="Ex.: Emissário do Conclave"
                  onChange={handleCoreChange}
                />
              </label>
              <label className="sheet-field">
                <span>Alinhamento</span>
                <input
                  type="text"
                  name="alignment"
                  value={coreData.alignment}
                  placeholder="Ex.: Caótica Boa"
                  onChange={handleCoreChange}
                />
              </label>
            </div>

            <div className="sheet-ability-grid" aria-label="Atributos de personagem">
              {abilityFields.map((field) => (
                <label key={field} className="sheet-ability">
                  <span>{field}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={abilities[field]}
                    onChange={(event) => handleAbilityChange(event, field)}
                  />
                </label>
              ))}
            </div>

            <label className="sheet-field sheet-field--full">
              <span>Notas rápidas</span>
              <textarea
                rows={4}
                value={notes}
                placeholder="Coloque características marcantes, ganchos ou objetivos pessoais."
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            <div className="sheet-actions">
              <button type="button" className="create-cta create-cta--secondary">
                Exportar como PDF (em breve)
              </button>
              <button type="reset" className="create-cta create-cta--ghost">
                Limpar campos
              </button>
            </div>
          </form>

          <aside id="ficha-preview" className="sheet-panel sheet-panel--preview" aria-live="polite">
            <header className="sheet-panel__header">
              <div>
                <span className="sheet-panel__eyebrow">Pré-visualização</span>
                <h2>Ficha sintetizada</h2>
              </div>
              <span className="sheet-panel__level">{levelLabel}</span>
            </header>

            <div className="sheet-preview__block">
              <span className="sheet-preview__title">{coreData.name || 'Personagem sem nome'}</span>
              <span className="sheet-preview__subtitle">
                {[coreData.role, coreData.ancestry].filter(Boolean).join(' • ') || 'Defina classe e ascendência'}
              </span>
            </div>

            <div className="sheet-preview__tags">
              {coreData.background && <span>{coreData.background}</span>}
              {coreData.alignment && <span>{coreData.alignment}</span>}
            </div>

            <div className="sheet-preview__abilities">
              {abilityFields.map((field) => (
                <div key={field} className="sheet-preview__ability">
                  <span>{field.slice(0, 3).toUpperCase()}</span>
                  <strong>{abilities[field] || '—'}</strong>
                </div>
              ))}
            </div>

            <div className="sheet-preview__notes">
              <span>Notas</span>
              <p>{notes || 'Quando adicionar notas aqui, elas aparecerão neste painel para consulta rápida.'}</p>
            </div>
          </aside>
        </section>

        <section className="create-updates" aria-label="Sugestões de uso">
          <div className="create-updates-grid">
            <div className="create-updates-card">
              <span className="create-updates-kicker">Boas práticas</span>
              <h2>Crie uma ficha por etapa</h2>
              <ul>
                <li>Finalize atributos antes de registrar perícias e proficiências.</li>
                <li>Use o campo de notas para registrar conexões com o mundo.</li>
                <li>Armazene fichas exportadas em uma pasta por campanha para agilizar buscas.</li>
              </ul>
            </div>
            <div className="create-updates-card create-updates-card--outline">
              <span className="create-updates-kicker">Próximas evoluções</span>
              <h2>Templates e colaboração chegam em breve</h2>
              <p>
                Nossa próxima iteração adicionará presets para classes populares, compartilhamento rápido de fichas e
                exportação automática para VTTs compatíveis.
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

export default SheetCreatorPage;
