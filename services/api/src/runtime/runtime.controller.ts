// ==========================================================
// services/api/src/runtime/runtime.controller.ts
// REST Endpoints for Agent Runtime, Task Orchestration & Console
// ==========================================================

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RuntimeService } from './runtime.service.js';
import type { InboundTaskRequest } from './engine/ai.manager.js';

@Controller()
export class RuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

  // ==========================================================
  // Tasks API (Section 39)
  // ==========================================================

  @Post('tasks')
  createTask(@Body() body: InboundTaskRequest) {
    if (!body.title || !body.description) {
      throw new BadRequestException('Task title and description are required');
    }
    const task = this.runtimeService.createTask(body);
    return {
      message: 'Task created and dispatched to Agent Runtime',
      task,
    };
  }

  @Get('tasks')
  getAllTasks() {
    const tasks = this.runtimeService.getAllTasks();
    return {
      total: tasks.length,
      data: tasks,
    };
  }

  @Get('tasks/:id')
  getTask(@Param('id') id: string) {
    const task = this.runtimeService.getTask(id);
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  @Post('tasks/:id/cancel')
  cancelTask(@Param('id') id: string, @Body() body?: { reason?: string }) {
    const success = this.runtimeService.cancelTask(id, body?.reason);
    if (!success) {
      throw new BadRequestException(`Task ${id} could not be cancelled (not found or terminal state)`);
    }
    return { message: `Task ${id} cancelled successfully` };
  }

  @Post('tasks/:id/pause')
  pauseTask(@Param('id') id: string) {
    const success = this.runtimeService.pauseTask(id);
    if (!success) {
      throw new BadRequestException(`Task ${id} could not be paused`);
    }
    return { message: `Task ${id} paused successfully` };
  }

  @Post('tasks/:id/resume')
  resumeTask(@Param('id') id: string) {
    const success = this.runtimeService.resumeTask(id);
    if (!success) {
      throw new BadRequestException(`Task ${id} could not be resumed (must be in PAUSED state)`);
    }
    return { message: `Task ${id} resumed successfully` };
  }

  @Post('tasks/:id/retry')
  retryTask(@Param('id') id: string) {
    const success = this.runtimeService.retryTask(id);
    if (!success) {
      throw new BadRequestException(`Task ${id} could not be retried (must be in FAILED state)`);
    }
    return { message: `Task ${id} re-enqueued for retry` };
  }

  @Post('tasks/:id/approve')
  approveTask(@Param('id') id: string, @Body() body?: { operator?: string }) {
    const success = this.runtimeService.approveTask(id, body?.operator);
    if (!success) {
      throw new BadRequestException(`Task ${id} is not waiting for approval`);
    }
    return { message: `Task ${id} approved and dispatched to queue` };
  }

  @Post('tasks/:id/reject')
  rejectTask(@Param('id') id: string, @Body() body?: { reason?: string }) {
    const success = this.runtimeService.rejectTask(id, body?.reason);
    if (!success) {
      throw new BadRequestException(`Task ${id} is not waiting for approval`);
    }
    return { message: `Task ${id} rejected` };
  }

  @Get('tasks/:id/executions')
  getTaskExecutions(@Param('id') id: string) {
    const executions = this.runtimeService.getTaskExecutions(id);
    return {
      taskId: id,
      total: executions.length,
      data: executions,
    };
  }

  // ==========================================================
  // Agents API (Section 40)
  // ==========================================================

  @Get('runtime/agents')
  getAgents() {
    const agents = this.runtimeService.getAgents();
    return {
      total: agents.length,
      data: agents,
    };
  }

  @Get('runtime/agents/:id')
  getAgent(@Param('id') id: string) {
    const agent = this.runtimeService.getAgent(id);
    if (!agent) {
      throw new NotFoundException(`Agent ${id} not found`);
    }
    return agent;
  }

  // ==========================================================
  // Runtime Orchestration & Queue API
  // ==========================================================

  @Get('runtime/status')
  getRuntimeStatus() {
    return this.runtimeService.getRuntimeSummary();
  }

  @Get('runtime/queue')
  getQueuedTasks() {
    const tasks = this.runtimeService.getQueuedTasks();
    return {
      total: tasks.length,
      data: tasks,
    };
  }

  @Get('runtime/dlq')
  getDLQTasks() {
    const dlq = this.runtimeService.getDLQTasks();
    return {
      total: dlq.length,
      data: dlq,
    };
  }

  // Demo task trigger (Section 58)
  @Post('runtime/demo-task')
  triggerDemoTask(@Body() body?: { type?: 'summarize' | 'code' | 'arch' | 'confidential' }) {
    const type = body?.type || 'summarize';

    let taskReq: InboundTaskRequest;
    if (type === 'code') {
      taskReq = {
        title: 'Refactor rate limiter sliding window',
        description: 'Implement a memory-safe sliding window token bucket in TypeScript.',
        taskType: 'CODING',
        priority: 'HIGH',
      };
    } else if (type === 'arch') {
      taskReq = {
        title: 'Draft architectural decision for event streaming',
        description: 'Compare WebSocket vs SSE vs MQTT for real-time digital twin telemetry.',
        taskType: 'PLANNING',
        priority: 'NORMAL',
      };
    } else if (type === 'confidential') {
      taskReq = {
        title: 'Audit confidential security keys',
        description: 'Review database credentials configuration for potential leaks.',
        taskType: 'SECURITY',
        privacyClass: 'CONFIDENTIAL',
        priority: 'URGENT',
      };
    } else {
      taskReq = {
        title: 'Summarize distributed consensus protocols',
        description: 'Provide a concise overview comparing Raft, Paxos, and PBFT.',
        taskType: 'ANALYSIS',
        priority: 'NORMAL',
      };
    }

    const task = this.runtimeService.createTask(taskReq);
    return {
      message: `Demo task (${type}) submitted to Agent Runtime`,
      task,
    };
  }
}
