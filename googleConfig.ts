// ==========================================================================================
// IMPORTANTE: CONFIGURAZIONE NECESSARIA
// ==========================================================================================
// Per far funzionare l'integrazione con Google Calendar, è necessario creare un progetto
// nella Google Cloud Console e ottenere le proprie credenziali API.
//
// Segui questi passaggi:
// 1. Vai su https://console.cloud.google.com/ e crea un nuovo progetto.
// 2. Nel menu di navigazione, vai su "API e servizi" -> "Libreria".
// 3. Cerca e abilita l'API "Google Calendar API".
// 4. Vai a "API e servizi" -> "Credenziali":
//    a. Clicca su "+ CREA CREDENZIALI" e scegli "Chiave API". Copia la chiave e
//       incollala nella costante `API_KEY` qui sotto.
//    b. Clicca su "+ CREA CREDENZIALI" e scegli "ID client OAuth 2.0".
//       - Se richiesto, configura la schermata di consenso.
//       - Scegli "Applicazione web" come tipo di applicazione.
//       - **FONDAMENTALE:** In "Origini JavaScript autorizzate", devi aggiungere TUTTI gli URL
//         esatti da cui l'applicazione viene eseguita. Se ne manca anche solo uno,
//         il login fallirà con un errore "400: invalid_request".
//         - **Per lo sviluppo in AI Studio:** Aggiungi l'URL che vedi nella barra
//           degli indirizzi (es. https://unique-id.aistudio.dev).
//         - **Per lo sviluppo locale:** Aggiungi `http://localhost:8080` (o la porta che usi).
//         - **Per la produzione (Vercel, Netlify, etc.):** Aggiungi l'URL pubblico della tua
//           applicazione (es. https://gestionale-prenotazioni-lezioni-8xy1fpsc5.vercel.app).
//         Puoi aggiungere più URL alla lista.
//       - Copia l' "ID client" generato (dovrebbe finire con ".apps.googleusercontent.com")
//         e incollalo nella costante `CLIENT_ID` qui sotto.
//
// NON USARE L'APPLICAZIONE IN PRODUZIONE CON QUESTI VALORI SEGNAPOSTO.
// L'applicazione non funzionerà correttamente senza credenziali valide e origini autorizzate.
// ==========================================================================================

export const CLIENT_ID = "178113680047-f9oco3mhkcin8me8udfm9t8jmb701mpk.apps.googleusercontent.com";
export const API_KEY = "AIzaSyCwhsKOJEDrhmarO0sEI7ibdn35f8hIiSI";

export const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

// FIX: Aggiunto lo scope 'calendar.readonly' per permettere la lettura della lista dei calendari e degli eventi.
// Questo è fondamentale per la sincronizzazione della disponibilità.
export const SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";
