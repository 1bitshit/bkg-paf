# BKG Code Manager

## Master Architecture & Implementation Plan

### Rust • Dioxus • WASM • BKG P2P • Local-First • Plugin-First

---

# Vision

**BKG Code Manager** wird die zentrale Entwicklungs-, Verwaltungs- und Orchestrierungsplattform des gesamten BKG-Ökosystems.

Der Code Manager ist kein einfacher Webservice, sondern die vollständige Managementschicht für:

* BKG Compute Network
* BKG Coin Economy
* Agent Orchestration
* Local AI
* Distributed Compute
* Plugin Management
* MCP Services
* OpenAI-kompatible APIs
* Entwicklerwerkzeuge
* Benutzerverwaltung
* Dashboards
* Remote Nodes
* Cluster Management

Grundprinzipien:

* Local First
* Rust First
* Native First
* Plugin First
* Offline First
* API First
* Event Driven
* Production Ready

Cloud-Anbieter sind optionale Erweiterungen und niemals Voraussetzung für den Betrieb.

---

# Qualitäts- und Implementierungsregeln (Verbindlich)

Diese Regeln gelten projektweit und haben Vorrang vor Komfortlösungen oder kurzfristigen Workarounds.

## Implementierungsqualität

* Keine Platzhalter.
* Keine Dummy-Implementierungen.
* Keine TODOs im Produktionscode.
* Keine unvollständigen Funktionen.
* Keine Simulationen.
* Keine künstlich erzeugten Ergebnisse.
* Keine Fake-Daten.
* Keine Mock-Implementierungen außerhalb echter Testprojekte.
* Keine Monkey-Patches ohne ausdrückliche technische Begründung.
* Keine Dirty Fixes.
* Keine Quick Hacks.
* Keine Workarounds zur Umgehung eigentlicher Fehlerursachen.
* Keine stillschweigenden Annahmen.
* Keine erfundenen APIs.
* Keine erfundenen Bibliotheken.
* Keine nicht existierenden Funktionen.
* Keine Success-Meldung ohne tatsächlichen Nachweis.
* Keine simulierten Benchmarks.
* Keine erfundenen Logs.
* Keine erfundenen Testergebnisse.
* Keine nicht reproduzierbaren Aussagen.

## Entwicklungsprinzipien

* Root Cause Analysis statt Symptombehandlung.
* Refactoring statt Flickwerk.
* Production Ready statt Demo Ready.
* Wartbarkeit vor kurzfristiger Bequemlichkeit.
* Erweiterbarkeit vor Sonderlösungen.
* Klare Verantwortlichkeiten.
* Kleine Module.
* Lose Kopplung.
* Hohe Kohäsion.
* Wiederverwendbare Komponenten.
* Klare API-Grenzen.
* Vollständig dokumentierte Schnittstellen.
* Deterministisches Verhalten.
* Nachvollziehbare Fehlerbehandlung.
* Typsicherheit vor Laufzeitprüfungen.
* Explizite Fehler statt stillschweigendem Verhalten.

## Testregeln

Ein Fehler gilt erst als behoben wenn:

* die eigentliche Ursache identifiziert wurde,
* die Ursache behoben wurde,
* passende Tests existieren,
* diese Tests tatsächlich ausgeführt wurden,
* die Ergebnisse nachvollziehbar dokumentiert sind.

Es dürfen niemals behauptet werden:

* "funktioniert"
* "behoben"
* "erledigt"

ohne einen realen Nachweis.

---

# Technologie-Stack

## Sprache

* Rust (Edition 2024)

---

## UI

* Dioxus
* Dioxus Fullstack
* Dioxus Desktop
* Dioxus Web
* Dioxus Mobile (zukünftig)

Keine React-Komponenten.

Keine Node-basierte UI.

---

## WebAssembly

Alle gemeinsamen UI-Komponenten werden als WASM kompiliert.

Ziele:

* Browser
* Desktop
* Embedded WebViews
* Remote Dashboards

---

## Server

* Axum
* Tokio
* Tower
* Hyper
* SQLx
* SQLite
* PostgreSQL
* Redis (optional)

---

## P2P

* libp2p
* QUIC
* Noise
* Kademlia
* Gossipsub
* Identify
* Relay
* AutoNAT
* mDNS

---

## Datenbank

Primär:

* SQLite

Optional:

* PostgreSQL

---

## Serialisierung

* serde
* serde_json
* toml

---

## Plugin Runtime

* Wasmtime

Alle Plugins laufen isoliert.

Keine nativen Shared Libraries.

Keine dynamischen DLLs.

---

## Agent Runtime

Rust-native.

Kein JavaScript.

Keine Node-Abhängigkeiten.

---

## RPC

* REST
* WebSocket
* gRPC (optional)

---

## Konfiguration

* TOML
* YAML
* JSON

---

## Build

Cargo Workspace

---

# Repository

```text
bkg-code-manager/
│
├── apps/
│   ├── desktop/
│   ├── web/
│   ├── server/
│   ├── cli/
│   └── updater/
│
├── crates/
│   ├── api/
│   ├── auth/
│   ├── config/
│   ├── dashboard/
│   ├── events/
│   ├── logging/
│   ├── models/
│   ├── notifications/
│   ├── plugins/
│   ├── p2p/
│   ├── wallet/
│   ├── coin/
│   ├── providers/
│   ├── agents/
│   ├── scheduler/
│   ├── jobs/
│   ├── storage/
│   ├── sync/
│   ├── updater/
│   ├── telemetry/
│   ├── sdk/
│   ├── ui/
│   ├── shared/
│   ├── utils/
│   └── testing/
│
├── plugins/
├── docs/
├── scripts/
├── assets/
├── examples/
├── benchmarks/
├── docker/
└── .github/
```

---

# Systemarchitektur

```text
                     Dioxus Desktop
                           │
                     Dioxus Web (WASM)
                           │
                  REST / WebSocket / RPC
                           │
                  BKG Code Manager Server
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
 Authentication      Agent Runtime        Provider Manager
      │                    │                    │
      ├────────────┬───────┴────────────┬───────┤
      │            │                    │
 Wallet       BKG Coin             Plugin Runtime
      │            │                    │
      ├────────────┴────────────┬───────┤
      │                         │
      P2P Node            Compute Scheduler
      │                         │
      └───────────────┬─────────┘
                      │
             BKG Compute Network
```

---

# Entwicklungsphasen

## Phase 1

Projektgrundgerüst

* Cargo Workspace
* Crate-Struktur
* CI
* Linting
* Formatierung
* Versionierung
* Build-System
* Dokumentation
* Release-Prozess

---

## Phase 2

Core Framework

* Konfiguration
* Logging
* Events
* Fehlerbehandlung
* Dependency Injection
* Plugin Loader

---

## Phase 3

Authentifizierung

* Benutzer
* Rollen
* Berechtigungen
* API-Keys
* Tokens
* Sitzungen

---

## Phase 4

Provider-System

Unterstützung für lokale und optionale Cloud-Anbieter.

Lokale Provider:

* llama.cpp
* Ollama
* LM Studio
* OpenCode
* OpenClaude
* NVIDIA NIM (lokal)

Cloud-Provider (optional):

* OpenAI
* Anthropic
* Google Gemini
* OpenRouter
* Mistral
* Together AI
* Fireworks AI
* Groq
* DeepSeek
* Cohere
* xAI

Provider erhalten:

* Discovery
* Konfiguration
* Validierung
* Health Checks
* Priorisierung
* Fallback
* Lastverteilung

---

## Phase 5

Agent-System

* Agent Registry
* Agent Sessions
* Chat
* Streaming
* Werkzeuge
* Dateisystem
* Terminal
* Git
* MCP
* Remote-Ausführung
* Lebenszyklusverwaltung

---

## Phase 6

BKG P2P

* Peer Discovery
* Wallet
* Node Management
* NAT Traversal
* Relay
* Verschlüsselung
* Compute Sharing
* Ressourcenverwaltung
* Job Scheduling

---

## Phase 7

BKG Coin

* Wallet
* Kontostände
* Transaktionen
* Belohnungen
* Gebühren
* Abrechnung
* Historie

BKG Coins werden verdient durch:

* CPU-Leistung
* GPU-Leistung
* Modell-Hosting
* Agent-Ausführung
* Speicherbereitstellung
* Relay-Dienste
* Netzwerkunterstützung

---

## Phase 8

Compute Marketplace

Bereitstellung und Nutzung von:

* CPU
* GPU
* RAM
* Speicher
* Modelle
* Agenten
* Plugins

Abrechnung ausschließlich in BKG Coin.

---

## Phase 9

Plugin-System

WASM-basierte Plugins für:

* Provider
* Agenten
* Dashboards
* Widgets
* MCP-Server
* Werkzeuge
* Speicher
* Authentifizierung
* Scheduler
* Integrationen

Alle Plugins laufen sandboxed über Wasmtime.

---

## Phase 10

Dioxus Frontend

Module:

* Dashboard
* Wallet
* BKG Coin
* Compute
* Marketplace
* Agenten
* Provider
* Benutzer
* Rollen
* Logs
* Netzwerk
* Jobs
* Plugins
* Einstellungen
* Systemstatus
* Clusterverwaltung
* Ressourcen
* Telemetrie

Alle UI-Komponenten werden gemeinsam für Desktop und Web verwendet und als WebAssembly kompiliert.

---

# Architekturprinzipien

* Rust-only Codebasis.
* Dioxus für sämtliche Benutzeroberflächen.
* WebAssembly für wiederverwendbare UI-Module.
* Cargo Workspace mit klar getrennten Crates.
* Plugin-System ausschließlich auf WASM-Basis.
* Ereignisgesteuerte Architektur.
* Strikte Modulgrenzen.
* API-First-Design.
* Local-First-Betrieb ohne Cloud-Zwang.
* Typsichere Kommunikation zwischen allen Komponenten.
* Erweiterbarkeit durch Plugins statt Änderungen am Kernsystem.
* Sicherheit, Wartbarkeit und Nachvollziehbarkeit haben Vorrang vor kurzfristigen Optimierungen.

---

# Langfristiges Ziel

BKG Code Manager bildet die zentrale Plattform des gesamten BKG-Ökosystems. Er vereint Entwicklung, Verwaltung, Compute-Sharing, Agenten, lokale KI, Plugin-Infrastruktur und die BKG-Coin-Ökonomie in einer vollständig Rust-basierten, Dioxus-gestützten und WebAssembly-fähigen Architektur. Sämtliche Kernfunktionen sind modular aufgebaut, produktionsreif implementiert und ohne proprietäre Cloud-Abhängigkeiten lauffähig.
