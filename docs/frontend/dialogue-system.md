# Dialogue System & Naya Account Manager Integration

## 1. Dialogue Design & Game Feel
Rather than rendering generic enterprise chatbot widgets or full-screen dashboards, KDI AI OFFICE utilizes an **immersive, game-style dialogue system** (`NayaDialogueModal.tsx` and `GameConversationUI.tsx`):

* **Visual Anatomy**:
  - Semi-translucent dark glass panel with golden amber accent borders.
  - Large illustrated avatar portrait with cute chibi facial expressions.
  - Official KDI credentials header: Character Name, Role, Department, and Operational Status.
  - Typewriter-style speech bubble for organic game narration.
  - Action selector menu offering both conversational prompts and business transactions.

```
┌─────────────────────────────────────────────────────────────┐
│ 👩‍💼 Naya | Account Manager (Sales Department)            ✕ │
├─────────────────────────────────────────────────────────────┤
│ "Halo! Selamat datang di KDI AI Office. Ada yang bisa saya  │
│  bantu terkait solusi AI atau pembuatan website custom?"   │
├─────────────────────────────────────────────────────────────┤
│ 💬 [1] Ngobrol Santai & Konsultasi                          │
│ 📝 [2] Catat Calon Klien                                    │
│ 📋 [3] Calon Klien Saya                                     │
│ 📱 [4] Kirim Penawaran WhatsApp                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Zero-Bypass Secure Architecture
The dialogue system strictly obeys the KDI Security Policy:
* **No Direct LLM Calls from Browser**: The client never contacts external LLM APIs (OpenAI, Anthropic, Ollama) directly.
* **Full Backend Pipeline**:
  $$\text{Player Input} \longrightarrow \text{KDI API} \longrightarrow \text{Naya Agent} \longrightarrow \text{GraphRAG / Neo4j} \longrightarrow \text{AI Router} \longrightarrow \text{LLM} \longrightarrow \text{Response}$$
* **Sanitized Responses**: Public visitors receive customer-facing answers with zero exposure of private internal tasks, server credentials, or financial ledgers.

---

## 3. Naya Account Manager Endpoints & Workflows

### 3.1 [Action 1] Ngobrol & Konsultasi
* **Endpoint**: `POST /agents/AGT-SALES-001/chat`
* **Payload**: `{ message: string, history: Array<{ role: string, content: string }> }`
* **Response**: Contextual response grounded in KDI's actual public portfolio, tech stack, and corporate credentials.

### 3.2 [Action 2] Catat Calon Klien (Lead Intake)
* **Endpoint**: `POST /agents/naya/leads` *(alias `/agents/sinta/leads` maintained for backward-compatibility)*
* **Payload**:
  ```json
  {
    "clientName": "Budi Santoso",
    "companyName": "PT Maju Logistik",
    "phoneNumber": "081234567890",
    "serviceInterest": "Jasa Website Custom & AI Integration",
    "estimatedBudget": "Rp 15.000.000 - Rp 25.000.000",
    "notes": "Tertarik integrasi WhatsApp AI assistant"
  }
  ```
* **Validation**: Real database persistence in the backend lead registry. No fake mock alerts.

### 3.3 [Action 3] Calon Klien Saya (Lead Inspection)
* **Endpoint**: `GET /agents/naya/leads` *(alias `/agents/sinta/leads`)*
* **Behavior**: Retrieves registered leads with timestamps, status, and service interests.

### 3.4 [Action 4] Kirim Penawaran WhatsApp
* **Endpoint**: `POST /agents/naya/quote-whatsapp` *(alias `/agents/sinta/quote-whatsapp`)*
* **Behavior**: Backend formats an official quotation letter and generates an encoded `wa.me/62...` URL. When clicked, the visitor's WhatsApp client opens prefilled with the proposal details.
