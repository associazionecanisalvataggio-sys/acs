import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, LogOut, Plus, Edit2, Trash2, Home, Settings, DogIcon, Users, Eye, EyeOff, Download, Upload, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';

// ============================================================
// CONFIGURAZIONE API
// ============================================================
const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzPC82p8AE36an6It88wglgskoxgXJ-53V18eJca4CKtDlknVk8gK92ctCEKV9RwfIewA/exec';

// ============================================================
// ERROR BOUNDARY
// ============================================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
          <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
          <h1 className="text-2xl font-bold text-red-800 mb-2">Errore nell'applicazione</h1>
          <p className="text-red-600 mb-4">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Ricarica pagina
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// COMPONENTE PRINCIPALE
// ============================================================
export default function App() {
  // STATE GLOBALE
  const [currentView, setCurrentView] = useState('iscrizione'); // 'iscrizione' | 'area-select' | 'cliente' | 'istruttore'
  const [userRole, setUserRole] = useState(null); // null | 'cliente' | 'istruttore'
  const [isIstruttore, setIsIstruttore] = useState(false);
  const [istruittoreUsername, setIstruittoreUsername] = useState('');
  const [istruttoreToken, setIstruttoreToken] = useState('');

  // DATI PUBBLICI
  const [disponibilita, setDisponibilita] = useState([]);
  const [carnet, setCarnet] = useState([]);
  const [corsi, setCorsi] = useState([]);
  const [partecipianti, setPartecipianti] = useState([]);
  const [impostazioni, setImpostazioni] = useState({});

  // DATI ISTRUTTORE (auth required)
  const [anagrafica, setAnagrafica] = useState([]);
  const [prenotazioni, setPrenotazioni] = useState([]);
  const [acquisti, setAcquisti] = useState([]);
  const [iscrizioni, setIscrizioni] = useState([]);
  const [storico, setStorico] = useState([]);
  const [log, setLog] = useState([]);
  const [utenti, setUtenti] = useState([]);

  // UI STATE
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPWABanner, setShowPWABanner] = useState(false);

  // ============================================================
  // API CALLS
  // ============================================================
  const fetchAPI = useCallback(async (action, body = null, isPost = false) => {
    try {
      const url = isPost
        ? API_ENDPOINT
        : `${API_ENDPOINT}?action=${action}${body ? '&' + new URLSearchParams(body).toString() : ''}`;

      const options = {
        method: isPost ? 'POST' : 'GET',
        headers: { 'Content-Type': 'text/plain' },
      };

      if (isPost && body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      return data.data || data;
    } catch (err) {
      console.error(`Errore API (${action}):`, err);
      throw err;
    }
  }, []);

  // Carica dati pubblici
  const loadPublicData = useCallback(async () => {
    try {
      setIsLoading(true);
      const pubData = await fetchAPI('getDatiPubblici');

      setDisponibilita(normalizeRows_(pubData.disponibilita || []));
      setCarnet(normalizeRows_(pubData.carnet || []));
      setCorsi(normalizeRows_(pubData.corsi || []));
      setPartecipianti(normalizeRows_(pubData.partecipianti || []));
      setImpostazioni(pubData.impostazioni || {});

      setIsLoading(false);
      setShowLoadingSpinner(false);
    } catch (err) {
      setErrorMsg('Errore nel caricamento dei dati pubblici');
      setShowLoadingSpinner(false);
    }
  }, [fetchAPI]);

  // Carica dati istruttore
  const loadIstruittoreData = async () => {
    try {
      setIsLoading(true);
      const auth = { username: istruittoreUsername, token: istruttoreToken };

      const dati = await fetchAPI('getDatiIniziali', auth);

      setAnagrafica(normalizeRows_(dati.anagrafica || []));
      setPrenotazioni(normalizeRows_(dati.prenotazioni || []));
      setAcquisti(normalizeRows_(dati.acquisti || []));
      setDisponibilita(normalizeRows_(dati.disponibilita || []));
      setCarnet(normalizeRows_(dati.carnet || []));
      setCorsi(normalizeRows_(dati.corsi || []));
      setIscrizioni(normalizeRows_(dati.iscrizioni || []));
      setPartecipianti(normalizeRows_(dati.partecipianti || []));

      setIsLoading(false);
    } catch (err) {
      setErrorMsg('Errore nel caricamento dati istruttore');
      setIsLoading(false);
    }
  };

  // LOGIN istruttore
  const handleLoginIstruttore = async (username, password) => {
    try {
      const response = await fetchAPI('login', { username, password }, true);
      if (response.error) throw new Error(response.error);

      setIstruittoreUsername(response.username);
      setIstruttoreToken(response.token);
      setIsIstruttore(true);
      setCurrentView('istruttore');
      setUserRole('istruttore');

      sessionStorage.setItem('istruttoreUsername', response.username);
      sessionStorage.setItem('istruttoreToken', response.token);

      await loadIstruittoreData();
      setSuccessMsg('Accesso istruttore riuscito');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // LOGOUT
  const handleLogout = () => {
    setIsIstruttore(false);
    setUserRole(null);
    setIstruittoreUsername('');
    setIstruttoreToken('');
    setCurrentView('area-select');
    sessionStorage.removeItem('istruttoreUsername');
    sessionStorage.removeItem('istruttoreToken');
    setSuccessMsg('Logout eseguito');
  };

  // CREA ISCRIZIONE
  const handleCreaIscrizione = async (formData) => {
    try {
      const ricevutaBase64 = formData.ricevuta ? await fileToBase64(formData.ricevuta) : '';

      const payload = {
        action: 'creaIscrizione',
        nome: formData.nome,
        cognome: formData.cognome,
        email: formData.email,
        telefono: formData.telefono,
        data_nascita: formData.data_nascita,
        citta: formData.citta,
        cane_nome: formData.cane_nome,
        cane_razza: formData.cane_razza,
        data_nascita_cane: formData.data_nascita_cane,
        microchip: formData.microchip,
        sesso_cane: formData.sesso_cane,
        corso_selezionato: formData.corso_selezionato,
        ricevuta_base64: ricevutaBase64,
        ricevuta_nome_file: formData.ricevuta?.name || 'ricevuta.jpg'
      };

      const response = await fetchAPI('creaIscrizione', payload, true);
      if (response.error) throw new Error(response.error);

      setSuccessMsg('Iscrizione completata! In attesa di approvazione.');
      setTimeout(() => {
        setCurrentView('area-select');
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Initialize
  useEffect(() => {
    const savedUsername = sessionStorage.getItem('istruttoreUsername');
    const savedToken = sessionStorage.getItem('istruttoreToken');

    if (savedUsername && savedToken) {
      setIstruittoreUsername(savedUsername);
      setIstruttoreToken(savedToken);
      setIsIstruttore(true);
      setCurrentView('istruttore');
      setUserRole('istruttore');
      loadIstruittoreData();
    } else {
      loadPublicData();
      checkPWAInstallation();
    }
  }, []);

  // PWA Banner
  const checkPWAInstallation = () => {
    if ('BeforeInstallPromptEvent' in window || window.matchMedia('(display-mode: standalone)').matches) {
      setShowPWABanner(true);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (showLoadingSpinner) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 pt-safe">
        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-amber-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <DogIcon className="w-6 h-6 text-amber-700" />
              <h1 className="text-xl font-bold text-amber-900">ACS - Cani Salvataggio</h1>
            </div>
            {isIstruttore && (
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>
        </header>

        {/* MESSAGES */}
        {errorMsg && (
          <div className="mx-auto max-w-7xl px-4 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Errore</p>
                <p className="text-red-700 text-sm">{errorMsg}</p>
              </div>
              <button onClick={() => setErrorMsg('')} className="ml-auto text-red-600 hover:text-red-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mx-auto max-w-7xl px-4 mt-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-800 font-medium">{successMsg}</p>
              <button onClick={() => setSuccessMsg('')} className="ml-auto text-green-600 hover:text-green-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <main className="max-w-7xl mx-auto px-4 py-6 pb-safe">
          {currentView === 'iscrizione' && (
            <PanelIscrizione
              corsi={corsi}
              onSubmit={handleCreaIscrizione}
              onSkip={() => {
                setCurrentView('area-select');
                loadPublicData();
              }}
            />
          )}

          {currentView === 'area-select' && !isIstruttore && (
            <PanelAreaSelect
              onClienteClick={() => setCurrentView('cliente')}
              onIstruttoreClick={() => setCurrentView('login')}
            />
          )}

          {currentView === 'login' && (
            <PanelLoginIstruttore onLogin={handleLoginIstruttore} />
          )}

          {currentView === 'cliente' && (
            <PanelCliente
              disponibilita={disponibilita}
              partecipianti={partecipianti}
              onBack={() => setCurrentView('area-select')}
            />
          )}

          {currentView === 'istruttore' && isIstruttore && (
            <PanelIstruttore
              anagrafica={anagrafica}
              prenotazioni={prenotazioni}
              acquisti={acquisti}
              disponibilita={disponibilita}
              carnet={carnet}
              corsi={corsi}
              iscrizioni={iscrizioni}
              fetchAPI={fetchAPI}
              istruittoreUsername={istruittoreUsername}
              istruttoreToken={istruttoreToken}
              onDataChange={() => loadIstruittoreData()}
            />
          )}
        </main>

        {/* PWA BANNER */}
        {showPWABanner && (
          <div className="fixed bottom-4 left-4 right-4 bg-amber-50 border border-amber-300 rounded-lg p-4 shadow-lg">
            <p className="text-amber-900 mb-2">Installa ACS come app sul tuo dispositivo</p>
            <button onClick={() => setShowPWABanner(false)} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm">
              Installa
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

// ============================================================
// PANEL: ISCRIZIONE
// ============================================================
function PanelIscrizione({ corsi, onSubmit, onSkip }) {
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    data_nascita: '',
    citta: '',
    cane_nome: '',
    cane_razza: '',
    data_nascita_cane: '',
    microchip: '',
    sesso_cane: '',
    corso_selezionato: '',
    ricevuta: null,
    accettaRegolamento: false
  });

  const [step, setStep] = useState(1); // 1: dati personali, 2: dati cane, 3: corso + ricevuta
  const [prezzoSelezionato, setPrezzoSelezionato] = useState(0);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value
    }));
  };

  const handleCorsoChange = (e) => {
    const corsoId = e.target.value;
    setFormData(prev => ({ ...prev, corso_selezionato: corsoId }));

    const corsoSelezionato = corsi.find(c => c.id === corsoId);
    setPrezzoSelezionato(corsoSelezionato ? parseFloat(corsoSelezionato.prezzo) : 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.accettaRegolamento) {
      alert('Devi accettare il regolamento');
      return;
    }

    if (!formData.ricevuta) {
      alert('Devi caricare la ricevuta');
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-blue-50 flex items-center justify-center py-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-6 text-center">
            <DogIcon className="w-12 h-12 mx-auto mb-2" />
            <h1 className="text-3xl font-bold">Benvenuto!</h1>
            <p className="text-amber-100 mt-2">Step {step} di 3</p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {step === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <h2 className="text-xl font-bold text-amber-900 mb-4">Dati Personali</h2>

                <input
                  type="text"
                  name="nome"
                  placeholder="Nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />

                <input
                  type="text"
                  name="cognome"
                  placeholder="Cognome"
                  value={formData.cognome}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />

                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />

                <input
                  type="tel"
                  name="telefono"
                  placeholder="Telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />

                <input
                  type="date"
                  name="data_nascita"
                  value={formData.data_nascita}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />

                <input
                  type="text"
                  name="citta"
                  placeholder="Città"
                  value={formData.citta}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />

                <div className="pt-4 flex gap-2">
                  <button type="button" onClick={onSkip} className="flex-1 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50">
                    Salta
                  </button>
                  <button type="button" onClick={() => setStep(2)} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                    Continua
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <h2 className="text-xl font-bold text-amber-900 mb-4">Dati Cane</h2>

                <input
                  type="text"
                  name="cane_nome"
                  placeholder="Nome cane"
                  value={formData.cane_nome}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />

                <input
                  type="text"
                  name="cane_razza"
                  placeholder="Razza"
                  value={formData.cane_razza}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />

                <input
                  type="date"
                  name="data_nascita_cane"
                  value={formData.data_nascita_cane}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />

                <input
                  type="text"
                  name="microchip"
                  placeholder="Microchip (opzionale)"
                  value={formData.microchip}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />

                <select
                  name="sesso_cane"
                  value={formData.sesso_cane}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  <option value="">Seleziona sesso</option>
                  <option value="M">Maschio</option>
                  <option value="F">Femmina</option>
                </select>

                <div className="pt-4 flex gap-2">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50">
                    Indietro
                  </button>
                  <button type="button" onClick={() => setStep(3)} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                    Continua
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <h2 className="text-xl font-bold text-amber-900 mb-4">Corso e Ricevuta</h2>

                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-2">Seleziona Corso</label>
                  <select
                    name="corso_selezionato"
                    value={formData.corso_selezionato}
                    onChange={handleCorsoChange}
                    required
                    className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  >
                    <option value="">-- Scegli un corso --</option>
                    {corsi.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {prezzoSelezionato > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-center">
                    <p className="text-sm text-amber-700">Costo del corso</p>
                    <p className="text-2xl font-bold text-amber-900">€ {prezzoSelezionato.toFixed(2)}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-2">Ricevuta Bonifico (Obbligatorio)</label>
                  <input
                    type="file"
                    name="ricevuta"
                    accept="image/*,.pdf"
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                  {formData.ricevuta && (
                    <p className="text-sm text-green-600 mt-2">✓ {formData.ricevuta.name}</p>
                  )}
                </div>

                <label className="flex items-start gap-2 p-3 border border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50">
                  <input
                    type="checkbox"
                    name="accettaRegolamento"
                    checked={formData.accettaRegolamento}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4"
                  />
                  <span className="text-sm text-amber-900">
                    Accetto il regolamento e l'informativa sulla privacy
                  </span>
                </label>

                <div className="pt-4 flex gap-2">
                  <button type="button" onClick={() => setStep(2)} className="flex-1 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50">
                    Indietro
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                    Iscriviti
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PANEL: AREA SELECT
// ============================================================
function PanelAreaSelect({ onClienteClick, onIstruttoreClick }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto my-12">
      <button
        onClick={onClienteClick}
        className="p-8 bg-white border-2 border-amber-300 rounded-lg shadow-lg hover:shadow-xl transition hover:border-amber-500 text-center"
      >
        <DogIcon className="w-16 h-16 text-amber-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-900">Cliente</h2>
        <p className="text-amber-700 mt-2">Visualizza lezioni e prenotazioni</p>
      </button>

      <button
        onClick={onIstruttoreClick}
        className="p-8 bg-white border-2 border-blue-300 rounded-lg shadow-lg hover:shadow-xl transition hover:border-blue-500 text-center"
      >
        <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-blue-900">Istruttore</h2>
        <p className="text-blue-700 mt-2">Gestisci lezioni e anagrafica</p>
      </button>
    </div>
  );
}

// ============================================================
// PANEL: LOGIN ISTRUTTORE
// ============================================================
function PanelLoginIstruttore({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onLogin(username, password);
    setIsLoading(false);
  };

  return (
    <div className="max-w-md mx-auto my-12">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-blue-900 text-center mb-6">Login Istruttore</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// PANEL: CLIENTE
// ============================================================
function PanelCliente({ disponibilita, partecipianti, onBack }) {
  const [selezionataLezione, setSelezionataLezione] = useState(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-amber-700 hover:text-amber-900 mb-4"
      >
        ← Torna indietro
      </button>

      <h2 className="text-3xl font-bold text-amber-900">Lezioni Disponibili</h2>

      <div className="grid gap-4">
        {disponibilita && disponibilita.length > 0 ? (
          disponibilita.map(slot => (
            <div key={slot.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-lg font-bold text-amber-900">{slot.tipo_lezione || 'Lezione'}</p>
                  <p className="text-gray-600">{slot.data} - {slot.ora}</p>
                  <p className="text-gray-500">{slot.luogo}</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {(slot.posti_totali - slot.posti_occupati) || 0} posti liberi
                </span>
              </div>

              <button
                onClick={() => {
                  setSelezionataLezione(slot);
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Prenota
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">Nessuna lezione disponibile</p>
        )}
      </div>

      {showForm && selezionataLezione && (
        <FormPrenotazione
          slot={selezionataLezione}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// PANEL: ISTRUTTORE
// ============================================================
function PanelIstruttore({
  anagrafica,
  prenotazioni,
  acquisti,
  disponibilita,
  carnet,
  corsi,
  iscrizioni,
  fetchAPI,
  istruittoreUsername,
  istruttoreToken,
  onDataChange
}) {
  const [tab, setTab] = useState('anagrafica');

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-blue-900">Area Istruttore</h2>

      {/* TABS */}
      <div className="flex gap-2 border-b border-blue-200 overflow-x-auto">
        {[
          { id: 'anagrafica', label: 'Anagrafica', icon: DogIcon },
          { id: 'lezioni', label: 'Lezioni', icon: Home },
          { id: 'iscrizioni', label: 'Iscrizioni', icon: Users },
          { id: 'setup', label: 'Setup', icon: Settings }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-blue-600'
            }`}
          >
            <t.icon size={20} />
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {tab === 'anagrafica' && <TabAnagrafica data={anagrafica} fetchAPI={fetchAPI} auth={{ username: istruittoreUsername, token: istruttoreToken }} onDataChange={onDataChange} />}
      {tab === 'lezioni' && <TabLezioni data={disponibilita} prenotazioni={prenotazioni} fetchAPI={fetchAPI} auth={{ username: istruittoreUsername, token: istruttoreToken }} onDataChange={onDataChange} />}
      {tab === 'iscrizioni' && <TabIscrizioni data={iscrizioni} corsi={corsi} fetchAPI={fetchAPI} auth={{ username: istruittoreUsername, token: istruttoreToken }} onDataChange={onDataChange} />}
      {tab === 'setup' && <TabSetup carnet={carnet} corsi={corsi} fetchAPI={fetchAPI} auth={{ username: istruittoreUsername, token: istruttoreToken }} onDataChange={onDataChange} />}
    </div>
  );
}

// ============================================================
// TAB: ANAGRAFICA
// ============================================================
function TabAnagrafica({ data, fetchAPI, auth, onDataChange }) {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-xl font-bold text-blue-900">Gestione Cani</h3>
      <div className="grid gap-4">
        {data && data.length > 0 ? (
          data.map(cane => (
            <div key={cane.cane_nome} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-blue-900">{cane.cane_nome}</p>
                  <p className="text-sm text-gray-600">{cane.proprietario_nome} - {cane.proprietario_telefono}</p>
                  <p className="text-sm text-gray-500">{cane.razza} • {cane.sesso || 'N/D'}</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                    <Edit2 size={18} />
                  </button>
                  <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">Nessun cane registrato</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB: LEZIONI
// ============================================================
function TabLezioni({ data, prenotazioni, fetchAPI, auth, onDataChange }) {
  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-xl font-bold text-blue-900">Gestione Lezioni</h3>
      <div className="grid gap-4">
        {data && data.length > 0 ? (
          data.map(slot => (
            <div key={slot.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-blue-900">{slot.tipo_lezione || 'Lezione'}</p>
                  <p className="text-sm text-gray-600">{slot.data} - {slot.ora}</p>
                  <p className="text-sm text-gray-500">{slot.luogo} • {slot.posti_occupati}/{slot.posti_totali} posti</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                  {slot.stato || 'aperta'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">Nessuna lezione</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB: ISCRIZIONI
// ============================================================
function TabIscrizioni({ data, corsi, fetchAPI, auth, onDataChange }) {
  const [showDetails, setShowDetails] = useState(null);

  const handleApprova = async (id) => {
    try {
      const payload = { action: 'approvaIscrizione', iscrizione_id: id, ...auth };
      await fetchAPI('approvaIscrizione', payload, true);
      onDataChange();
      setShowDetails(null);
    } catch (err) {
      console.error('Errore approvazione:', err);
    }
  };

  const handleRifiuta = async (id, motivo) => {
    try {
      const payload = { action: 'rifiutaIscrizione', iscrizione_id: id, motivo, ...auth };
      await fetchAPI('rifiutaIscrizione', payload, true);
      onDataChange();
      setShowDetails(null);
    } catch (err) {
      console.error('Errore rifiuto:', err);
    }
  };

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-xl font-bold text-blue-900">Iscrizioni Corsi</h3>
      <div className="grid gap-4">
        {data && data.length > 0 ? (
          data.map(iscr => (
            <div key={iscr.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-blue-900">{iscr.nome} {iscr.cognome}</p>
                  <p className="text-sm text-gray-600">{iscr.email} • {iscr.telefono}</p>
                  <p className="text-sm text-gray-500">Cane: {iscr.cane_nome} • Corso: {iscr.corso_selezionato}</p>
                  <p className="text-sm mt-2 font-medium">
                    <span className={`px-2 py-1 rounded text-white ${
                      iscr.stato === 'approvato' ? 'bg-green-600' :
                      iscr.stato === 'rifiutato' ? 'bg-red-600' :
                      'bg-yellow-600'
                    }`}>
                      {iscr.stato}
                    </span>
                  </p>
                </div>
                <button onClick={() => setShowDetails(showDetails === iscr.id ? null : iscr.id)} className="text-blue-600 hover:bg-blue-50 p-2 rounded">
                  <ChevronDown size={20} />
                </button>
              </div>

              {showDetails === iscr.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <a href={iscr.ricevuta_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                    <Download size={16} /> Scarica ricevuta
                  </a>
                  {iscr.stato === 'in attesa di approvazione' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprova(iscr.id)} className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                        Approva
                      </button>
                      <button onClick={() => handleRifiuta(iscr.id, 'Non idoneo')} className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                        Rifiuta
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">Nessuna iscrizione</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB: SETUP
// ============================================================
function TabSetup({ carnet, corsi, fetchAPI, auth, onDataChange }) {
  const [showCorsi, setShowCorsi] = useState(true);

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className="text-xl font-bold text-blue-900 mb-4">Corsi Disponibili</h3>
        <div className="grid gap-4">
          {corsi && corsi.length > 0 ? (
            corsi.map(c => (
              <div key={c.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-blue-900">{c.nome}</p>
                    <p className="text-sm text-gray-600">{c.numero_lezioni} lezioni • € {c.prezzo}</p>
                    <p className="text-sm text-gray-500 mt-2">{c.descrizione}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${c.attivo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {c.attivo ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Nessun corso configurato</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-blue-900 mb-4">Carnet</h3>
        <div className="grid gap-4">
          {carnet && carnet.length > 0 ? (
            carnet.map(c => (
              <div key={c.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-blue-900">{c.nome}</p>
                    <p className="text-sm text-gray-600">{c.numero_lezioni} lezioni • € {c.prezzo}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${c.attivo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {c.attivo ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Nessun carnet configurato</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// UTILITY COMPONENTS
// ============================================================

function FormPrenotazione({ slot, onClose }) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefono: '',
    cane: ''
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-amber-900">Prenota Lezione</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="bg-amber-50 p-3 rounded-lg mb-4 text-sm">
          <p className="font-medium text-amber-900">{slot.tipo_lezione}</p>
          <p className="text-amber-700">{slot.data} - {slot.ora} • {slot.luogo}</p>
        </div>

        <form className="space-y-3">
          <input type="text" placeholder="Nome" className="w-full px-3 py-2 border border-amber-300 rounded-lg" />
          <input type="email" placeholder="Email" className="w-full px-3 py-2 border border-amber-300 rounded-lg" />
          <input type="tel" placeholder="Telefono" className="w-full px-3 py-2 border border-amber-300 rounded-lg" />
          <input type="text" placeholder="Nome cane" className="w-full px-3 py-2 border border-amber-300 rounded-lg" />

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50">
              Annulla
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
              Prenota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
      <div className="animate-spin">
        <DogIcon className="w-16 h-16 text-amber-600" />
      </div>
      <p className="mt-4 text-amber-700 font-medium">Caricamento...</p>
    </div>
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function normalizeRows_(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => {
    if (typeof row === 'string') return {};
    return row || {};
  });
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
