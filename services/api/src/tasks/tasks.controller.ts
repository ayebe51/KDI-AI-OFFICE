import { Controller, Get, Post, Param, Body, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service.js';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  getTasks() {
    return this.tasksService.getAll();
  }

  @Get(':id')
  getTask(@Param('id') id: string) {
    const task = this.tasksService.getById(id);
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  @Post()
  createTask(@Body() body: { title: string; description: string }) {
    return this.tasksService.createTask(body.title, body.description);
  }
}
