// ==========================================================
// 3d/character/KDICharacterRegistry.ts
// Centralized KDI Character Identity System (Original Roster)
// Separates Presentation Character Identity from Backend Agent Identity
// ==========================================================

export interface KDICharacterDefinition {
  character_id: string;
  display_name: string;
  role: string;
  department: string;
  personality: string;
  avatar: string;
  appearance: {
    torsoColor: string;
    headColor: string;
    accentColor: string;
    hairColor: string;
    clothingStyle: string;
  };
  dialogue_style: string;
  description: string;
  backend_agent_id?: string;
  location: {
    floor: 'GROUND' | 'FLOOR_2' | 'ROOFTOP';
    room: string;
    coordinates: [number, number, number];
  };
  initial_dialogue: string;
  available_actions: string[];
}

export const KDI_OFFICIAL_CHARACTERS: Record<string, KDICharacterDefinition> = {
  // ── 1. ACCOUNT MANAGER & SALES ──
  naya: {
    character_id: 'char_naya',
    display_name: 'Naya',
    role: 'Account Manager',
    department: 'Sales & Client Solutions',
    personality: 'Warm, highly proactive, articulate, consultative, and business-focused.',
    avatar: '👩‍💼',
    appearance: {
      torsoColor: '#f59e0b', // Warm amber blazer
      headColor: '#f9d2be',
      accentColor: '#fbbf24',
      hairColor: '#2b1b17', // Espresso ponytail
      clothingStyle: 'Polished business blazer with gold trim',
    },
    dialogue_style: 'Friendly, professional, concise, focused on client business outcomes.',
    description: 'Lead client partner managing custom software development inquiries and WhatsApp quotations.',
    backend_agent_id: 'AGT-SALES-001',
    location: {
      floor: 'GROUND',
      room: 'Sales Area',
      coordinates: [7.0, 0.0, 9.0],
    },
    initial_dialogue: 'Halo! Selamat datang di KDI AI Office. Saya Naya, Account Manager Anda. Ada yang bisa saya bantu terkait solusi digital atau website custom bisnis Anda?',
    available_actions: [
      'Ngobrol & Konsultasi Kebutuhan',
      'Catat Calon Klien',
      'Lihat Calon Klien Saya',
      'Kirim Penawaran Resmi via WhatsApp',
    ],
  },

  // ── 2. LEAD SOFTWARE ENGINEER ──
  farhan: {
    character_id: 'char_farhan',
    display_name: 'Farhan',
    role: 'Lead AI Software Engineer',
    department: 'Engineering',
    personality: 'Technical, focused, calm, pragmatic, deeply knowledgeable in TypeScript & NestJS.',
    avatar: '👨‍💻',
    appearance: {
      torsoColor: '#10b981', // Emerald tech hoodie
      headColor: '#f9d2be',
      accentColor: '#34d399',
      hairColor: '#1f2937', // Short textured dark hair
      clothingStyle: 'Smart casual tech hoodie and jeans',
    },
    dialogue_style: 'Direct, analytical, references actual system architecture and code commits.',
    description: 'Senior full-stack autonomous engineer executing core microservices and API gateways.',
    backend_agent_id: 'AGT-ENG-001',
    location: {
      floor: 'GROUND',
      room: 'Engineering Floor',
      coordinates: [0.0, 0.0, 1.0],
    },
    initial_dialogue: 'Halo! Sedang memonitor service worker dan pipeline Antigravity. Ada issue yang perlu di-triage?',
    available_actions: [
      'Tanya Status Kode & Runtime',
      'Lihat Commit Terbaru',
      'Jalankan Unit Test Runner',
    ],
  },

  // ── 3. PRINCIPAL SYSTEM ARCHITECT ──
  ahmad: {
    character_id: 'char_ahmad',
    display_name: 'Ahmad',
    role: 'Principal System Architect',
    department: 'Architecture',
    personality: 'Methodical, visionary, disciplined, author of Architecture Decision Records (ADRs).',
    avatar: '🏛️',
    appearance: {
      torsoColor: '#6366f1', // Indigo tailored jacket
      headColor: '#f9d2be',
      accentColor: '#818cf8',
      hairColor: '#374151',
      clothingStyle: 'Architectural minimalist navy jacket',
    },
    dialogue_style: 'Structured, architectural, emphasizes zero-trust boundaries and resilience.',
    description: 'System architect overseeing Neo4j ontology models, distributed caching, and zero-trust policies.',
    backend_agent_id: 'AGT-ARCH-001',
    location: {
      floor: 'GROUND',
      room: 'Systems Architecture Lab',
      coordinates: [-8.0, 0.0, 1.0],
    },
    initial_dialogue: 'Selamat datang di Lab Arsitektur. Semua keputusan sistem didokumentasikan di ADR repository.',
    available_actions: [
      'Review Architecture Decision Records',
      'Inspeksi Desain Topologi Sistem',
    ],
  },

  // ── 4. ENGINEERING MANAGER ──
  rian: {
    character_id: 'char_rian',
    display_name: 'Rian',
    role: 'AI Engineering Manager',
    department: 'Management',
    personality: 'Strategic, objective-focused, empathetic, coordinates workforce sprints.',
    avatar: '👔',
    appearance: {
      torsoColor: '#3b82f6', // Cobalt blue executive cardigan
      headColor: '#f9d2be',
      accentColor: '#60a5fa',
      hairColor: '#1e293b',
      clothingStyle: 'Professional executive office cardigan',
    },
    dialogue_style: 'Concise, managerial, focused on delivery schedules and team health.',
    description: 'Engineering manager overseeing task decomposition, agent schedules, and sprint velocity.',
    backend_agent_id: 'AGT-MGR-001',
    location: {
      floor: 'GROUND',
      room: 'Product Management Room',
      coordinates: [-8.0, 0.0, 8.0],
    },
    initial_dialogue: 'Halo, saya Rian. Semua sprint dan kapasitas AI workforce berjalan optimal sesuai roadmap.',
    available_actions: [
      'Cek Progress Sprint Mingguan',
      'Alokasi Resource AI Workforce',
    ],
  },

  // ── 5. AI RESEARCH SCIENTIST ──
  zahra: {
    character_id: 'char_zahra',
    display_name: 'Dr. Zahra',
    role: 'AI Research Scientist',
    department: 'Research & Intelligence',
    personality: 'Curious, scholarly, rigorous, specialist in vector embeddings and GraphRAG retrieval.',
    avatar: '🔬',
    appearance: {
      torsoColor: '#8b5cf6', // Soft purple lab coat / sweater
      headColor: '#f9d2be',
      accentColor: '#a78bfa',
      hairColor: '#1e1b4b',
      clothingStyle: 'Academic tailored cardigan with subtle glasses',
    },
    dialogue_style: 'Analytical, academic, precise citations of knowledge graph nodes and embeddings.',
    description: 'Research scientist managing hybrid semantic search and GraphRAG knowledge synthesis.',
    backend_agent_id: 'AGT-RES-001',
    location: {
      floor: 'GROUND',
      room: 'AI Research Lab',
      coordinates: [-8.0, 0.0, -14.0],
    },
    initial_dialogue: 'Selamat datang di Lab Riset. Saya sedang mengoptimalkan GraphRAG indexing pada Neo4j cluster.',
    available_actions: [
      'Eksplorasi GraphRAG Memory',
      'Uji Retrieval Benchmark',
    ],
  },

  // ── 6. QA & VERIFICATION SPECIALIST ──
  hana: {
    character_id: 'char_hana',
    display_name: 'Hana',
    role: 'QA & Verification Specialist',
    department: 'Quality Assurance',
    personality: 'Meticulous, observant, detail-oriented, guardian against regressions.',
    avatar: '🛡️',
    appearance: {
      torsoColor: '#eab308', // Warm yellow utility vest
      headColor: '#f9d2be',
      accentColor: '#fde047',
      hairColor: '#451a03',
      clothingStyle: 'Modern QA utility vest with testing badge',
    },
    dialogue_style: 'Methodical, test-driven, always reports explicit pass/fail assertions.',
    description: 'QA lead orchestrating automated test suites, end-to-end integration, and stress tests.',
    backend_agent_id: 'AGT-QA-001',
    location: {
      floor: 'GROUND',
      room: 'QA Suite',
      coordinates: [-8.0, 0.0, -8.0],
    },
    initial_dialogue: 'Halo! Seluruh 181 backend tests dan 125 frontend integration tests berstatus 100% PASS.',
    available_actions: [
      'Lihat Hasil Test Suite',
      'Audit Coverage Report',
    ],
  },

  // ── 7. LOBBY RECEPTIONIST & CORPORATE HOST ──
  citra: {
    character_id: 'char_citra',
    display_name: 'Citra',
    role: 'Office Host & Receptionist',
    department: 'Corporate Operations',
    personality: 'Courteous, informative, warm, the welcoming face of KDI virtual headquarters.',
    avatar: '💁‍♀️',
    appearance: {
      torsoColor: '#0ea5e9', // Sky blue formal hospitality vest
      headColor: '#f9d2be',
      accentColor: '#38bdf8',
      hairColor: '#262626',
      clothingStyle: 'Elegantly tailored hospitality vest with KDI pin',
    },
    dialogue_style: 'Polite, enthusiastic, guides visitors to rooms, elevators, and portfolio kiosk.',
    description: 'Lobby receptionist welcoming visitors and guiding them through the KDI virtual headquarters.',
    backend_agent_id: 'AGT-RECEPT-001',
    location: {
      floor: 'GROUND',
      room: 'Main Reception Lobby',
      coordinates: [0.0, 0.0, 16.0],
    },
    initial_dialogue: 'Selamat datang di PT Koneksi Digital Inovasi (KDI)! Silakan jelajahi portfolio kami di sebelah kiri, atau temui Naya di Area Sales untuk konsultasi.',
    available_actions: [
      'Panduan Navigasi Kantor',
      'Petunjuk Penggunaan Lift',
    ],
  },

  // ── 8. FRONT YARD CAFE HOST ──
  joko: {
    character_id: 'char_joko',
    display_name: 'Pak Joko',
    role: 'Cafe & Hospitality Host',
    department: 'Workplace Services',
    personality: 'Genial, generous, authentic Indonesian coffee artisan, energetic and cheery.',
    avatar: '☕',
    appearance: {
      torsoColor: '#92400e', // Earthy brown barista apron
      headColor: '#f9d2be',
      accentColor: '#d97706',
      hairColor: '#171717',
      clothingStyle: 'Classic barista apron with white rolled-sleeve shirt',
    },
    dialogue_style: 'Warm, jovial, authentic Indonesian hospitality with coffee recommendations.',
    description: 'Front yard coffee artisan serving freshly brewed local roasts and traditional snacks.',
    backend_agent_id: 'NPC-FOOD-001',
    location: {
      floor: 'GROUND',
      room: 'Front Yard',
      coordinates: [5.5, 0.0, 26.5],
    },
    initial_dialogue: 'Monggo mampir, Mas/Mbak! Ada Kopi Tubruk Nusantara dan Es Kopi Susu Aren segar. Seduh hangat sambil ngobrol santai?',
    available_actions: [
      'Pesan Kopi & Camilan',
      'Rekomendasi Menu Hari Ini',
    ],
  },

  // ── 9. CREATIVE & SOCIAL MEDIA STRATEGIST ──
  alya: {
    character_id: 'char_alya',
    display_name: 'Alya',
    role: 'Creative & Content Strategist',
    department: 'Marketing & Studio',
    personality: 'Artistic, trendy, dynamic, visual storyteller.',
    avatar: '🎬',
    appearance: {
      torsoColor: '#ec4899', // Coral pink creative sweater
      headColor: '#f9d2be',
      accentColor: '#f472b6',
      hairColor: '#312e81',
      clothingStyle: 'Modern creative oversized sweater with headphones',
    },
    dialogue_style: 'Vibrant, visual, focused on brand identity, video scripts, and UI aesthetics.',
    description: 'Studio creative producer handling video production, social channels, and media assets.',
    backend_agent_id: 'AGT-MKT-001',
    location: {
      floor: 'FLOOR_2',
      room: 'Creative Studio & Social Pod',
      coordinates: [-6.0, 0.0, 6.0],
    },
    initial_dialogue: 'Hai! Kami lagi setup recording di Studio untuk showcase produk AI terbaru KDI. Desain visualnya super clean!',
    available_actions: [
      'Lihat Draft Konten Media',
      'Tur Studio Produksi',
    ],
  },

  // ── 10. ROOFTOP LOUNGE HOST ──
  danang: {
    character_id: 'char_danang',
    display_name: 'Danang',
    role: 'Rooftop Lounge Host',
    department: 'Workplace Services',
    personality: 'Chill, observant, relaxed, curator of twilight rooftop vibes.',
    avatar: '🍹',
    appearance: {
      torsoColor: '#059669', // Emerald tropical linen shirt
      headColor: '#f9d2be',
      accentColor: '#34d399',
      hairColor: '#18181b',
      clothingStyle: 'Relaxed linen shirt suited for the open-air rooftop bar',
    },
    dialogue_style: 'Mellow, hospitable, invites team members to relax around the fire pit.',
    description: 'Rooftop bar steward preparing mocktails and maintaining the fire pit lounge ambience.',
    backend_agent_id: 'NPC-BAR-001',
    location: {
      floor: 'ROOFTOP',
      room: 'Rooftop Garden Bar',
      coordinates: [-6.0, 0.0, -2.0],
    },
    initial_dialogue: 'Selamat sore! Angin rooftop lagi sejuk banget. Mau duduk santai di bean bag dekat api unggun atau butuh mocktail segar?',
    available_actions: [
      'Pesan Minuman Segar',
      'Santai di Fire Pit Lounge',
    ],
  },
};

/** Get character definition by key */
export function getKDICharacter(key: string): KDICharacterDefinition | undefined {
  return KDI_OFFICIAL_CHARACTERS[key.toLowerCase()];
}

/** Get character by backend agent ID */
export function getKDICharacterByAgentId(agentId: string): KDICharacterDefinition | undefined {
  return Object.values(KDI_OFFICIAL_CHARACTERS).find((c) => c.backend_agent_id === agentId);
}
