# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Progetto

Estensione Chrome (Manifest V3) che scarica file VTT da pagine web e li salva come `.txt` con il nome del titolo della pagina.

## Architettura

### Componenti Principali

**popup.html/popup.js** - UI e orchestrazione
- Click su "Scarica VTT" → richiede tab attivo
- Usa `chrome.scripting.executeScript()` per iniettare `findAndDownloadVTT()` nel contesto della pagina
- Gestisce risultato (success/error) e aggiorna UI

**findAndDownloadVTT()** - Logica di ricerca ed estrazione (eseguita nel page context)
- Cerca file VTT in ordine di priorità:
  1. `<track>` tags con selettori: `track[src*=".vtt"], track[kind="subtitles"], track[kind="captions"]`
  2. `<a>` links: `a[href*=".vtt"]`
  3. Regex nell'HTML: `/(https?:\/\/[^\s<>"]+\.vtt)/i`
  4. Blob/Data URLs: `a[href^="blob:"], a[href^="data:text/vtt"]`
- Fetch del contenuto VTT
- Sanitizza titolo pagina (rimuove caratteri invalidi, sostituisce spazi, max 100 char)
- Crea blob e trigger download via elemento `<a>` temporaneo

### Pattern di Comunicazione

```
popup.js (extension context)
    ↓ chrome.scripting.executeScript()
    ↓ inject findAndDownloadVTT()
page context (ha accesso al DOM)
    ↓ return { success, filename/error }
popup.js
    ↓ aggiorna UI con risultato
```

Nota: `findAndDownloadVTT()` deve essere una funzione standalone (no riferimenti esterni) perché viene serializzata e iniettata.

## Testing e Sviluppo

**Caricare l'estensione**:
1. `chrome://extensions/`
2. Attiva "Modalità sviluppatore"
3. "Carica estensione non pacchettizzata" → seleziona questa directory

**Testare modifiche**:
1. Modifica i file sorgente
2. `chrome://extensions/` → pulsante "Ricarica" sull'estensione
3. Vai su una pagina con VTT (o crea una test page con `<track src="test.vtt">`)
4. Clicca sull'icona e testa il download

**Rigenerare icona**:
- Apri `create_icon.html` in browser → scarica `icon.png` automaticamente
- Oppure: `node create_icon.js` (genera PNG base)

## Permessi Chrome

- `activeTab`: Accesso alla pagina attiva
- `scripting`: Iniezione di `findAndDownloadVTT()`
- `downloads`: Non usato direttamente (usa blob download via `<a>` element)
- `host_permissions: <all_urls>`: Necessario per fetch di VTT da qualsiasi dominio

## Note Tecniche

- **Manifest V3**: Usa service worker invece di background pages (non applicabile qui, solo popup)
- **Filename sanitization**: Regex `/[<>:"/\\|?*]/g` per caratteri Windows/Unix invalidi
- **CORS**: Il fetch avviene nel page context, quindi eredita le stesse policy della pagina
- **No content script persistente**: Script iniettato on-demand via `executeScript()`
