// ==========================================================
// 3d/character/CharacterTypes.ts
// Playable Character Model for Game-Like Character Selection
// ==========================================================

export type CharacterRole = 'VISITOR' | 'EMPLOYEE' | 'MANAGER' | 'DEVELOPER' | 'DESIGNER';

export interface PlayableCharacter {
  character_id: string;
  name: string;
  role: CharacterRole;
  description: string;
  /** Torso color hex */
  appearance: {
    torsoColor: string;
    headColor: string;
    accentColor: string;
    icon: string;
    hairColor?: string;
  };
  selected?: boolean;
}

export const PLAYABLE_CHARACTERS: PlayableCharacter[] = [
  {
    character_id: 'char_arka',
    name: 'Arka',
    role: 'DEVELOPER',
    description: 'Autonomous software engineer. Spesialis kode performa tinggi dan integrasi AI.',
    appearance: {
      torsoColor: '#10b981',
      headColor: '#f9d2be',
      accentColor: '#34d399',
      hairColor: '#1e293b',
      icon: '👨‍💻',
    },
  },
  {
    character_id: 'char_kirana',
    name: 'Kirana',
    role: 'MANAGER',
    description: 'Product & Solutions Specialist. Memandu roadmap digital dan kolaborasi tim.',
    appearance: {
      torsoColor: '#3b82f6',
      headColor: '#f9d2be',
      accentColor: '#60a5fa',
      hairColor: '#331e17',
      icon: '👩‍💼',
    },
  },
  {
    character_id: 'char_bagas',
    name: 'Bagas',
    role: 'DEVELOPER',
    description: 'Solutions Architect. Menjelajahi struktur distributed cluster dan keamanan data.',
    appearance: {
      torsoColor: '#6366f1',
      headColor: '#f9d2be',
      accentColor: '#818cf8',
      hairColor: '#18181b',
      icon: '🏛️',
    },
  },
  {
    character_id: 'char_tiara',
    name: 'Tiara',
    role: 'DESIGNER',
    description: 'Creative Visual Designer. Mengembangkan estetika UI modern dan media studio.',
    appearance: {
      torsoColor: '#ec4899',
      headColor: '#f9d2be',
      accentColor: '#f472b6',
      hairColor: '#4a154b',
      icon: '🎨',
    },
  },
  {
    character_id: 'char_tamu',
    name: 'Pengunjung',
    role: 'VISITOR',
    description: 'Tamu kehormatan KDI. Bebas menjelajahi seluruh area kantor dan berkonsultasi.',
    appearance: {
      torsoColor: '#f59e0b',
      headColor: '#f9d2be',
      accentColor: '#fbbf24',
      hairColor: '#262626',
      icon: '🧑‍💼',
    },
  },
];
