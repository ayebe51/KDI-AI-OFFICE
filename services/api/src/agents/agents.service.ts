import { Injectable } from '@nestjs/common';
import { EventsGateway } from '../websocket/events.gateway.js';
import type { DigitalEmployee, AgentState } from '@kdi/types';

@Injectable()
export class AgentsService {
  private employees: Map<string, DigitalEmployee> = new Map();

  constructor(private readonly eventsGateway: EventsGateway) {
    this.initDefaultEmployees();
  }

  private initDefaultEmployees() {
    const engineer: DigitalEmployee = {
      agentId: 'AGT-ENG-001',
      name: 'Farhan (AI Software Engineer)',
      role: 'SOFTWARE_ENGINEER',
      department: 'Engineering',
      grade: 'GR-04',
      room: 'RM-05',
      currentState: 'IDLE',
      currentActivity: 'Standing by at engineering desk',
      baseSalary: 18000000,
    };

    const manager: DigitalEmployee = {
      agentId: 'AGT-MGR-001',
      name: 'Rian (AI Engineering Manager)',
      role: 'AI_MANAGER',
      department: 'Management',
      grade: 'GR-07',
      room: 'RM-02',
      currentState: 'PLANNING',
      currentActivity: 'Reviewing quarterly architecture goals',
      baseSalary: 32000000,
    };

    const naya: DigitalEmployee = {
      agentId: 'AGT-SALES-001',
      name: 'Naya (Account Manager)',
      role: 'ACCOUNT_MANAGER',
      department: 'Sales & Client Relations',
      grade: 'GR-05',
      room: 'RM-SALES',
      currentState: 'AVAILABLE' as AgentState,
      currentActivity: 'Konsultasi calon klien & koordinasi penawaran website',
      baseSalary: 16000000,
    };

    this.employees.set(engineer.agentId, engineer);
    this.employees.set(manager.agentId, manager);
    this.employees.set(naya.agentId, naya);
  }

  private clientLeads: Array<{
    id: string;
    name: string;
    company?: string;
    phone: string;
    need: string;
    budget?: string;
    notes?: string;
    status: 'NEW' | 'CONTACTED' | 'PROPOSAL_SENT';
    createdAt: string;
  }> = [
    {
      id: 'lead_001',
      name: 'Budi Santoso',
      company: 'PT Maju Perkasa',
      phone: '6281234567890',
      need: 'Website Company Profile Next.js + SEO Lokal',
      budget: 'Rp 5.000.000 - Rp 10.000.000',
      notes: 'Tertarik desain modern & loading cepat',
      status: 'PROPOSAL_SENT',
      createdAt: new Date().toISOString(),
    },
  ];

  recordLead(lead: { name: string; company?: string; phone: string; need: string; budget?: string; notes?: string }) {
    const newLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'NEW' as const,
      createdAt: new Date().toISOString(),
      ...lead,
    };
    this.clientLeads.unshift(newLead);
    return newLead;
  }

  getLeads() {
    return this.clientLeads;
  }

  generateWhatsAppQuote(clientName: string, serviceTitle: string, clientPhone?: string) {
    const phone = (clientPhone || '6285286038143').replace(/[^0-9]/g, '');
    const message = `Halo Kak ${clientName || 'Klien'},\n\nTerima kasih telah berkunjung ke Kantor Virtual *Koneksi Digital Inovasi (KDI)*!\n\nPerkenalkan saya *Naya (Account Manager)* dari KDI. Kami sangat antusias membantu kebutuhan *${serviceTitle || 'Pembuatan Website / Software AI Custom'}* Anda.\n\nKeunggulan solusi KDI:\n• Desain Cozy & Ultra Clean Modern\n• Next.js + High Performance 90+ PageSpeed\n• SEO Ready & Mobile Responsive\n• Didukung AI Workforce yang cepat & andal\n\nKapan waktu yang nyaman untuk kita jadwalkan konsultasi singkat via WhatsApp atau Google Meet?\n\nSalam hangat,\n*Naya — Account Manager*\nKoneksi Digital Inovasi\nhttps://kdi-ai-office.com`;
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${phone}?text=${encoded}`;
    return { url, message };
  }

  async chatWithAgent(agentId: string, message: string, _context?: string) {
    const agent = this.employees.get(agentId) || this.employees.get('AGT-SALES-001');
    const name = agent ? agent.name : 'Naya (Account Manager)';

    if (agentId === 'AGT-SALES-001' || agent?.role === 'ACCOUNT_MANAGER') {
      const q = message.toLowerCase();
      if (q.includes('harga') || q.includes('biaya') || q.includes('paket')) {
        return {
          reply: `Halo! Di Koneksi Digital Inovasi, layanan pembuatan website profesional kami transparan dan fleksibel:\n• Company Profile Custom: mulai Rp 1,5jt - Rp 7,5jt\n• Sistem Bisnis & Booking Online: mulai Rp 5jt - Rp 15jt\n• Toko Online & Custom Web App: mulai Rp 8jt - Rp 25jt\nSemua paket include domain, SSL, mobile-first design, dan SEO. Boleh saya bantu catat kebutuhan spesifik bisnis Bapak?`,
          agentId,
          name,
        };
      }
      if (q.includes('portofolio') || q.includes('proyek') || q.includes('contoh') || q.includes('karya')) {
        return {
          reply: `Kami memiliki deretan portofolio unggulan yang bisa Bapak eksplorasi langsung di kiosk lobby kantor: Expeditour Bali (Travel Booking), Delta Legal Firm, Padel Court Booking, Rental Mobil Armada, dan Company Profile Next.js. Silakan lihat demonya di layar display ya, Pak!`,
          agentId,
          name,
        };
      }
      if (q.includes('calon') || q.includes('klien') || q.includes('penawaran') || q.includes('whatsapp') || q.includes('wa')) {
        return {
          reply: `Siap, Pak! Silakan klik menu 'Catat calon klien' untuk mencatat detail kontak dan kebutuhan, atau 'Kirim penawaran WhatsApp' agar saya langsung menyusun draf penawaran resmi untuk dikirimkan via WhatsApp.`,
          agentId,
          name,
        };
      }
      return {
        reply: `Selamat datang di kantor Koneksi Digital Inovasi! Saya Naya, Account Manager di KDI AI Office. Kami adalah AI software organization yang siap membantu merancang dan membangun platform digital berkualitas tinggi untuk bisnis Anda. Ada yang bisa saya bantu, Pak?`,
        agentId,
        name,
      };
    }

    return {
      reply: `Halo! Saya ${name}. Saat ini status saya ${agent?.currentState || 'IDLE'} (${agent?.currentActivity || 'siap bertugas'}). Ada yang bisa dibantu untuk engineering atau sistem KDI?`,
      agentId,
      name,
    };
  }

  getAll(): DigitalEmployee[] {
    return Array.from(this.employees.values());
  }

  getById(id: string): DigitalEmployee | undefined {
    return this.employees.get(id);
  }

  updateState(agentId: string, newState: AgentState, activitySummary?: string): DigitalEmployee {
    const emp = this.employees.get(agentId);
    if (!emp) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const previousState = emp.currentState;
    emp.currentState = newState;
    if (activitySummary) {
      emp.currentActivity = activitySummary;
    }

    // Broadcast real-time WebSocket event to all connected clients!
    this.eventsGateway.broadcastAgentState({
      agentId: emp.agentId,
      role: emp.role,
      previousState,
      currentState: newState,
      roomId: emp.room,
      taskId: emp.currentTaskId,
      activitySummary: emp.currentActivity,
    });

    return emp;
  }

  toggleDemoEngineerState(): DigitalEmployee {
    const engineer = this.employees.get('AGT-ENG-001');
    if (!engineer) {
      throw new Error('Demo engineer not found');
    }

    const nextState: AgentState = engineer.currentState === 'IDLE' ? 'WORKING' : 'IDLE';
    const activity = nextState === 'WORKING' 
      ? 'Writing AST code patch for module PickupService.ts:L48'
      : 'Standing by at engineering desk';

    return this.updateState('AGT-ENG-001', nextState, activity);
  }
}
