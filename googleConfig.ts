// --- CONFIGURAZIONE GOOGLE OAUTH 2.0 ---
// Questo è l'UNICO valore che devi configurare manualmente.
//
// COME OTTENERE IL CLIENT ID:
// 1. Vai su Google Cloud Console: https://console.cloud.google.com/
// 2. Assicurati di essere nel progetto corretto.
// 3. Nel menu di navigazione, vai su "API e servizi" > "Credenziali".
// 4. Clicca su "+ CREA CREDENZIALI" e scegli "ID client OAuth".
// 5. Se richiesto, configura la schermata di consenso:
//    - Scegli "Esterno" e clicca "Crea".
//    - Inserisci un nome per l'app (es. "App Prenotazioni"), la tua email e un'email di contatto per lo sviluppatore. Salva e continua.
//    - Nella sezione "Ambiti", clicca "Aggiungi o rimuovi ambiti" e cerca "Google Calendar API". Seleziona i due ambiti: ".../auth/calendar.events" e ".../auth/calendar.readonly". Clicca "Aggiorna".
//    - Aggiungi te stesso come utente di test. Salva e continua.
// 6. Torna a "Credenziali". Scegli "Applicazione web" come tipo di applicazione.
// 7. In "Origini JavaScript autorizzate", aggiungi l'URL dove viene eseguita la tua app (es. l'URL fornito dall'ambiente di sviluppo o il tuo dominio di produzione).
// 8. In "URI di reindirizzamento autorizzati", aggiungi lo stesso URL.
// 9. Clicca "Crea". Ti verrà mostrato il tuo ID client. Copialo e incollalo qui sotto.

export const GOOGLE_CLIENT_ID = "437487120297-nt028l5ddba28bngpcs1nrhleho6k51h.apps.googleusercontent.com"; // <--- INCOLLA QUI IL TUO ID CLIENT

// Definisce a quali dati dell'utente l'applicazione chiederà di accedere.
export const GOOGLE_API_SCOPES = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events";