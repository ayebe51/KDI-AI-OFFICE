import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectsService {
  private projects = [
    {
      id: 'prj_01J9X8KONEKSI',
      name: 'Koneksi Santri',
      category: 'Web Application',
      description: 'Integrated digital management ecosystem for Islamic boarding schools',
      status: 'DEVELOPMENT',
      activeAgents: 3,
      currentTasks: 7,
      techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'TailwindCSS'],
    },
    {
      id: 'prj_02J9X8OFFICE',
      name: 'KDI AI Office',
      category: 'AI System',
      description: 'Living virtual office and multi-agent software engineering workspace',
      status: 'DEVELOPMENT',
      activeAgents: 5,
      currentTasks: 12,
      techStack: ['NestJS', 'React', 'Three.js', 'R3F', 'PostgreSQL', 'Neo4j', 'Redis'],
    },
  ];

  getAll() {
    return {
      total: this.projects.length,
      data: this.projects,
    };
  }

  getById(id: string) {
    return this.projects.find((p) => p.id === id);
  }
}
