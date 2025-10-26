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
//       incollala al posto di `API_KEY` qui sotto.
//    b. Clicca su "+ CREA CREDENZIALI" e scegli "ID client OAuth 2.0".
//       - Se richiesto, configura la schermata di consenso.
//       - Scegli "Applicazione web" come tipo di applicazione.
//       - In "Origini JavaScript autorizzate", aggiungi l'URL dove l'app è in esecuzione
//         (es. `http://localhost:8080` per lo sviluppo locale).
//       - Copia l' "ID client" generato e incollalo al posto di `CLIENT_ID` qui sotto.
//
// NON USARE L'APPLICAZIONE IN PRODUZIONE CON QUESTI VALORI SEGNAPOSTO.
// L'applicazione non funzionerà correttamente senza credenziali valide.
// ==========================================================================================

export const CLIENT_ID = "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";
export const API_KEY = "AIzaSyCwhsKOJEDrhmarO0sEI7ibdn35f8hIiSI";

export const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

export const SCOPES = "https://www.googleapis.com/auth/calendar.events";