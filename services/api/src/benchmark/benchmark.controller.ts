// ==========================================================
// services/api/src/benchmark/benchmark.controller.ts
// REST Controller for Autonomous Software Delivery Benchmark
// ==========================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BenchmarkService } from './benchmark.service.js';
import type { HumanInterventionType, BenchmarkMode } from '@kdi/types';

@Controller('benchmark')
export class BenchmarkController {
  constructor(private readonly benchmarkService: BenchmarkService) {}

  @Get('tasks')
  getTasks() {
    return {
      success: true,
      tasks: this.benchmarkService.listTasks(),
    };
  }

  @Get('tasks/:id')
  getTaskById(@Param('id') id: string) {
    const task = this.benchmarkService.getTask(id);
    if (!task) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }
    return {
      success: true,
      task,
    };
  }

  @Get('runs')
  async listRuns() {
    const runs = await this.benchmarkService.listRuns();
    return {
      success: true,
      runs,
    };
  }

  @Get('runs/:runId')
  async getRun(@Param('runId') runId: string) {
    const run = await this.benchmarkService.getRun(runId);
    if (!run) {
      throw new HttpException('Run not found', HttpStatus.NOT_FOUND);
    }
    return {
      success: true,
      run,
    };
  }

  @Post('runs')
  async startRun(
    @Body()
    body: {
      taskId: string;
      mode?: BenchmarkMode;
      repositoryPath?: string;
      maxRetries?: number;
    }
  ) {
    if (!body.taskId) {
      throw new HttpException('taskId is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const run = await this.benchmarkService.startBenchmarkRun(body.taskId, {
        mode: body.mode || 'AUTONOMOUS',
        repositoryPath: body.repositoryPath,
        maxRetries: body.maxRetries,
      });

      return {
        success: true,
        run,
      };
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('runs/:runId/intervene')
  async recordIntervention(
    @Param('runId') runId: string,
    @Body()
    body: {
      type: HumanInterventionType;
      description: string;
      actor?: string;
    }
  ) {
    if (!body.type || !body.description) {
      throw new HttpException('type and description are required', HttpStatus.BAD_REQUEST);
    }

    const intervention = await this.benchmarkService.recordIntervention(
      runId,
      body.type,
      body.description,
      body.actor
    );

    return {
      success: true,
      intervention,
    };
  }

  @Post('approvals/:approvalId/resolve')
  async resolveApproval(
    @Param('approvalId') approvalId: string,
    @Body() body: { approved: boolean; resolvedBy?: string }
  ) {
    const res = await this.benchmarkService.resolveApproval(
      approvalId,
      body.approved,
      body.resolvedBy || 'OWNER'
    );
    if (!res) {
      throw new HttpException('Approval not found', HttpStatus.NOT_FOUND);
    }
    return {
      success: true,
      approval: res,
    };
  }

  @Get('runs/:runId/artifacts')
  async getArtifacts(@Param('runId') runId: string) {
    const artifacts = await this.benchmarkService.getArtifacts(runId);
    return {
      success: true,
      artifacts,
    };
  }

  @Get('metrics')
  async getMetrics() {
    const metrics = await this.benchmarkService.getMetricsSummary();
    return {
      success: true,
      metrics,
    };
  }
}
