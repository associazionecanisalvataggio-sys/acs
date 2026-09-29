/* ============================================================
   ACS v4 — App.jsx con supporto corsi GRATUITI
   ============================================================

   MODIFICHE PRINCIPALI:
   1. formattaPrezzoCorso() → mostra "Gratuito" per prezzo = 0
   2. corsoGratuito → calcolato da prezzo corso (0 → gratuito)
   3. Ricevuta OPZIONALE se corso gratuito
   4. Validazione passo 3: skip ricevuta se gratuito
   5. Email approvazione: adattate per corso gratuito

   TODO: Sostituire linea 18 con il tuo API_URL reale
         (Es: https://script.google.com/macros/s/XXXXX/exec)
*/

import { useState, useMemo, useEffect, Component } from "react";
import {
  PawPrint, Calendar, Clock, Phone, Mail, Lock, CheckCircle2,
  Plus, ChevronRight, ChevronDown, ShieldCheck, Smartphone, Share2, MoreVertical, MoreHorizontal, Share, Download, MapPin, RefreshCw,
  X, BookOpen, Dog, Award, ArrowLeft, Fingerprint, Wallet, AlertCircle, Pencil, Users, LogOut, LogIn, Trash2, Search, Eye, EyeOff, AlertTriangle, FileText, Upload
} from "lucide-react";

const API_URL = "https://script.google.com/macros/s/AKfycbz4cUlgZN4pHM1LacvHFLqKPPlhBktZzvY5pP75RdbBwyEXB5_CypfMAWf5nCHGTyUC/exec";

let contatoreAttivita = 0;
let ascoltatoreAttivita = null;
function impostaAscoltatoreAttivita(fn) {
  ascoltatoreAttivita = fn;
  if (fn) fn(contatoreAttivita > 0);
}
function segnalaAttivita(delta) {
  contatoreAttivita += delta;
  if (ascoltatoreAttivita) ascoltatoreAttivita(contatoreAttivita > 0);
}

async function chiamaAPI(action, payload = {}) {
  segnalaAttivita(1);
  try {
    const risposta = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
    return await risposta.json();
  } finally {
    segnalaAttivita(-1);
  }
}

async function chiamaAPIGet(action, params = {}) {
  segnalaAttivita(1);
  try {
    const query = new URLSearchParams({ action, ...params }).toString();
    const risposta = await fetch(`${API_URL}?${query}`);
    return await risposta.json();
  } finally {
    segnalaAttivita(-1);
  }
}

// ============================================================
// Utility per formattazione
// ============================================================

function formattaEuro(valore) {
  return (Number(valore) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

// NUOVO: Corso con prezzo 0 è gratuito
function formattaPrezzoCorso(valore) {
  return (Number(valore) || 0) > 0 ? formattaEuro(valore) : "Gratuito";
}

function formattaDataComplete(strData) {
  try {
    const d = new Date(String(strData).slice(0, 10) + "T00:00:00");
    return !isNaN(d.getTime()) ? d.toLocaleDateString("it-IT", { weekday: "short", year: "2-digit", month: "2-digit", day: "2-digit" }) : "–";
  } catch (_) {
    return "–";
  }
}

function formattaData(strData) {
  try {
    const d = new Date(String(strData).slice(0, 10) + "T00:00:00");
    return !isNaN(d.getTime()) ? d.toLocaleDateString("it-IT") : "–";
  } catch (_) {
    return "–";
  }
}

// ============================================================
// FORM ISCRIZIONE (v4)
// ============================================================

function FormIscrizione({ onBack }) {
  const COLORI = {
    navy: "#16324A", green: "#1F9D4C", red: "#E23B32", terracotta: "#C1552C",
    paper: "#FFFFFF", ink: "#1B2B33", muted: "#64748B",
  };

  const VUOTO = {
    nome: "", cognome: "", email: "", telefono: "",
    caneNome: "", caneRazza: "", dataNascitaCane: "", sessoCane: "",
    microchip: "", corsoId: "", privacy: false
  };

  const [passo, setPasso] = useState(1);
  const [form, setForm] = useState(VUOTO);
  const [corsi, setCorsi] = useState([]);
  const [statoCorsi, setStatoCorsi] = useState("caricamento");
  const [ricevuta, setRicevuta] = useState(null);
  const [errore, setErrore] = useState("");
  const [invio, setInvio] = useState(false);
  const [inviata, setInviata] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await chiamaAPIGet("getCarnet");
        setCorsi(c.map(x => ({ id: x.id, nome: x.nome, prezzo: Number(x.prezzo) || 0 })));
        setStatoCorsi("ok");
      } catch (_) {
        setStatoCorsi("errore");
      }
    })();
  }, []);

  function aggiorna(campo, valore) {
    setForm({ ...form, [campo]: valore });
  }

  const corsoSelezionato = corsi.find(c => c.id === form.corsoId);
  const corsoGratuito = corsoSelezionato && (Number(corsoSelezionato.prezzo) || 0) === 0;
  const prezzoStr = corsoSelezionato ? formattaPrezzoCorso(corsoSelezionato.prezzo) : "–";

  function validaPasso(p) {
    if (p === 1) {
      if (!form.nome.trim()) return "Inserisci il nome.";
      if (!form.email.trim()) return "Inserisci l'email.";
      if (!form.telefono.trim()) return "Inserisci il telefono.";
    }
    if (p === 2) {
      if (!form.caneNome.trim()) return "Inserisci il nome del cane.";
    }
    if (p === 3) {
      if (!form.corsoId) return "Scegli il corso.";
      // NUOVO: ricevuta obbligatoria SOLO se corso NON gratuito
      if (!corsoGratuito && !ricevuta) {
        return "La ricevuta del bonifico è obbligatoria per i corsi a pagamento.";
      }
      if (!form.privacy) return "Acconsenti al trattamento dati?";
    }
    return "";
  }

  function scegliFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrore("File troppo grande (max 10 MB)");
      return;
    }
    const lettore = new FileReader();
    lettore.onload = () => {
      setRicevuta({ nomeFile: file.name, dataUrl: String(lettore.result) });
      setErrore("");
    };
    lettore.onerror = () => setErrore("Impossibile leggere il file");
    lettore.readAsDataURL(file);
  }

  async function invia() {
    const err = validaPasso(3);
    if (err) {
      setErrore(err);
      return;
    }
    setInvio(true);
    setErrore("");
    try {
      const risposta = await chiamaAPI("creaIscrizione", {
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        caneNome: form.caneNome.trim(),
        caneRazza: form.caneRazza.trim(),
        dataNascitaCane: form.dataNascitaCane,
        sessoCane: form.sessoCane,
        microchip: form.microchip.trim(),
        corsoSelezionato: form.corsoId,
        // NUOVO: ricevuta è "", quindi il backend non farà richiesta ricevuta se corso gratuito
        ricevutaBase64: corsoGratuito || !ricevuta ? "" : ricevuta.dataUrl,
      });
      if (risposta?.ok) {
        setInviata(true);
        try { window.scrollTo({ top: 0 }); } catch (_) {}
      } else {
        setErrore(risposta?.errore || "Errore sconosciuto");
      }
    } catch (e) {
      setErrore(String(e?.message || e || "Errore di rete"));
    } finally {
      setInvio(false);
    }
  }

  if (inviata) {
    return (
      <div className="max-w-md sm:max-w-2xl mx-auto px-4 py-5 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: COLORI.green }}>
          <CheckCircle2 size={32} color={COLORI.paper} />
        </div>
        <h2 className="font-bold text-lg mb-2" style={{ color: COLORI.navy }}>
          Iscrizione ricevuta!
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {corsoGratuito
            ? "Grazie per l'iscrizione al corso gratuito. A breve riceverai un'email di conferma."
            : "Grazie! Verifichiamo la ricevuta e ti contatteremo a breve."}
        </p>
        <button onClick={onBack} className="px-6 py-2.5 rounded-lg font-semibold text-white"
          style={{ background: COLORI.green }}>
          Torna alla home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md sm:max-w-2xl mx-auto px-4 py-5">
      <button onClick={onBack} className="mb-4 text-sm flex items-center gap-1" style={{ color: COLORI.navy }}>
        <ArrowLeft size={16} /> Indietro
      </button>

      <h2 className="font-bold text-lg mb-4" style={{ color: COLORI.navy }}>
        Iscrizione ai corsi 🐾
      </h2>

      <div className="flex gap-1.5 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-1.5 rounded-full"
            style={{ background: i <= passo ? COLORI.green : "#E2E5E9" }} />
        ))}
      </div>

      {passo === 1 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm" style={{ color: COLORI.navy }}>I tuoi dati</h3>
          <input type="text" placeholder="Nome *" value={form.nome} onChange={(e) => aggiorna("nome", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm"
            style={{ borderColor: "#E2E5E9" }} />
          <input type="text" placeholder="Cognome (facoltativo)" value={form.cognome} onChange={(e) => aggiorna("cognome", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm"
            style={{ borderColor: "#E2E5E9" }} />
          <input type="email" placeholder="Email *" value={form.email} onChange={(e) => aggiorna("email", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm"
            style={{ borderColor: "#E2E5E9" }} />
          <input type="tel" placeholder="Telefono *" value={form.telefono} onChange={(e) => aggiorna("telefono", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm"
            style={{ borderColor: "#E2E5E9" }} />
        </div>
      )}

      {passo === 2 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm" style={{ color: COLORI.navy }}>Dati del cane</h3>
          <input type="text" placeholder="Nome cane *" value={form.caneNome} onChange={(e) => aggiorna("caneNome", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm"
            style={{ borderColor: "#E2E5E9" }} />
          <input type="text" placeholder="Razza (facoltativo)" value={form.caneRazza} onChange={(e) => aggiorna("caneRazza", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm"
            style={{ borderColor: "#E2E5E9" }} />
          <input type="date" placeholder="Data di nascita" value={form.dataNascitaCane} onChange={(e) => aggiorna("dataNascitaCane", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm"
            style={{ borderColor: "#E2E5E9" }} />
          <input type="text" placeholder="Microchip (facoltativo)" value={form.microchip} onChange={(e) => aggiorna("microchip", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm"
            style={{ borderColor: "#E2E5E9" }} />
        </div>
      )}

      {passo === 3 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm" style={{ color: COLORI.navy }}>Corso e riepilogo</h3>

          <div className="rounded-lg border p-3" style={{ borderColor: "#E2E5E9", background: "#F5F6F8" }}>
            <label className="text-sm font-medium text-slate-600 mb-2 block">Scegli il corso *</label>
            <select value={form.corsoId} onChange={(e) => aggiorna("corsoId", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm"
              style={{ borderColor: "#E2E5E9" }}>
              <option value="">-- Scegli --</option>
              {corsi.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome} — {formattaPrezzoCorso(c.prezzo)}
                </option>
              ))}
            </select>
          </div>

          {/* NUOVO: Ricevuta SOLO se NON gratuito */}
          {corsoSelezionato && !corsoGratuito && (
            <div className="rounded-lg border p-3" style={{ borderColor: "#E2E5E9", background: "#F5F6F8" }}>
              <label className="text-sm font-medium text-slate-600 mb-2 block">
                Ricevuta del bonifico <span style={{ color: COLORI.red }}>*</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border-2 border-dashed p-4 cursor-pointer"
                style={{ borderColor: ricevuta ? COLORI.green : "#CBD2D9", background: ricevuta ? "#F0FAF3" : "transparent" }}>
                {ricevuta && ricevuta.dataUrl.startsWith("data:image") ? (
                  <img src={ricevuta.dataUrl} alt="Ricevuta" className="w-14 h-14 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg grid place-items-center shrink-0" style={{ background: "#EEF1F4" }}>
                    {ricevuta ? <FileText size={22} color={COLORI.navy} /> : <Upload size={22} color={COLORI.muted} />}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold" style={{ color: COLORI.navy }}>
                    {ricevuta ? ricevuta.nomeFile : "Carica foto o PDF"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {ricevuta ? "Tocca per sostituirla" : "Foto della ricevuta o PDF"}
                  </div>
                </div>
                <input type="file" accept="image/*,application/pdf" onChange={scegliFile} className="hidden" />
              </label>
            </div>
          )}

          {/* Messaggio per corso gratuito */}
          {corsoSelezionato && corsoGratuito && (
            <div className="rounded-lg p-3 border" style={{ borderColor: COLORI.green, background: "#E7F6EC" }}>
              <div className="text-sm font-semibold" style={{ color: COLORI.green }}>
                ✅ Corso gratuito
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Nessuna ricevuta richiesta. Continua direttamente alla conferma.
              </div>
            </div>
          )}

          {/* Privacy */}
          <label className="flex items-start gap-2.5 rounded-lg border p-3" style={{ borderColor: "#E2E5E9", background: "#F5F6F8" }}>
            <input type="checkbox" checked={form.privacy} onChange={(e) => aggiorna("privacy", e.target.checked)}
              className="mt-1" />
            <span className="text-xs text-slate-600">
              Acconsento al trattamento dei dati personali secondo le norme sulla privacy.
            </span>
          </label>
        </div>
      )}

      {errore && (
        <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: "#FDECEA", color: COLORI.red }}>
          {errore}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        {passo > 1 && (
          <button onClick={() => setPasso(passo - 1)} className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm"
            style={{ background: "#E2E5E9", color: COLORI.navy }} disabled={invio}>
            Indietro
          </button>
        )}
        <button
          onClick={() => {
            const err = validaPasso(passo);
            if (err) {
              setErrore(err);
              return;
            }
            if (passo === 3) {
              invia();
            } else {
              setPasso(passo + 1);
            }
          }}
          className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm text-white"
          style={{ background: COLORI.green }}
          disabled={invio || statoCorsi !== "ok"}>
          {invio ? "⏳ Invio..." : passo === 3 ? "Iscriviti" : "Continua"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// EXPORT APP (stub semplificato)
// ============================================================

export default function App() {
  const [pagina, setPagina] = useState("home");
  const [inCaricamento, setInCaricamento] = useState(false);
  useEffect(() => {
    impostaAscoltatoreAttivita(setInCaricamento);
  }, []);

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      {inCaricamento && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.2)", display: "grid", placeItems: "center", zIndex: 999
        }}>
          <div style={{ fontSize: 24 }}>⏳</div>
        </div>
      )}

      {pagina === "home" && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">ACS — Iscrizioni</h1>
          <button onClick={() => setPagina("iscrizione")} className="px-6 py-3 rounded-lg text-white bg-green-600">
            Iscriviti al corso
          </button>
        </div>
      )}

      {pagina === "iscrizione" && (
        <FormIscrizione onBack={() => setPagina("home")} />
      )}
    </div>
  );
}
