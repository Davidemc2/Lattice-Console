import * as cron from 'node-cron';
import { spawn } from 'child_process';
import { Logger } from '@lattice-console/utils';

interface CronJobConfig {
  workloadId: string;
  name: string;
  schedule: string;
  command: string;
  env?: Record<string, string>;
  timeout?: number;
}

interface CronJob {
  id: string;
  workloadId: string;
  name: string;
  schedule: string;
  command: string;
  env: Record<string, string>;
  timeout: number;
  task: cron.ScheduledTask;
  status: 'active' | 'paused' | 'disabled';
  lastRun?: Date;
  nextRun?: Date;
  lastOutput?: string;
  lastError?: string;
}

interface CronExecution {
  jobId: string;
  startTime: Date;
  endTime?: Date;
  success?: boolean;
  output?: string;
  error?: string;
  duration?: number;
}

export class CronService {
  private jobs: Map<string, CronJob> = new Map();
  private executions: Map<string, CronExecution[]> = new Map();

  async initialize(): Promise<void> {
    Logger.info('Initializing Cron service...');

    try {
      // Validate cron library
      Logger.info('Cron service initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize Cron service:', error);
      throw error;
    }
  }

  async deployCronJob(config: CronJobConfig): Promise<CronJob> {
    const jobId = `cron-${config.workloadId}-${Date.now()}`;
    
    Logger.info(`Deploying cron job ${jobId} for workload ${config.workloadId}`);

    // Validate cron schedule
    if (!cron.validate(config.schedule)) {
      throw new Error(`Invalid cron schedule: ${config.schedule}`);
    }

    try {
      const task = cron.schedule(config.schedule, async () => {
        await this.executeCronJob(jobId);
      }, {
        scheduled: false, // Start manually after setup
        timezone: 'UTC',
      });

      const cronJob: CronJob = {
        id: jobId,
        workloadId: config.workloadId,
        name: config.name,
        schedule: config.schedule,
        command: config.command,
        env: config.env || {},
        timeout: config.timeout || 300000, // 5 minutes default
        task,
        status: 'active',
        nextRun: this.getNextRunTime(),
      };

      this.jobs.set(jobId, cronJob);
      this.executions.set(jobId, []);

      // Start the cron job
      task.start();

      Logger.info(`Cron job ${jobId} deployed and started`);
      return cronJob;

    } catch (error) {
      Logger.error(`Failed to deploy cron job: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async executeCronJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'active') {
      return;
    }

    const execution: CronExecution = {
      jobId,
      startTime: new Date(),
    };

    Logger.info(`Executing cron job ${jobId}: ${job.command}`);

    try {
      const result = await this.runCommand(job.command, job.env, job.timeout);
      
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.success = result.exitCode === 0;
      execution.output = result.stdout;
      execution.error = result.stderr;

      // Update job info
      job.lastRun = execution.startTime;
      job.nextRun = this.getNextRunTime();
      job.lastOutput = result.stdout;
      job.lastError = result.stderr;

      // Store execution history (keep last 100)
      const executions = this.executions.get(jobId) || [];
      executions.push(execution);
      if (executions.length > 100) {
        executions.shift();
      }
      this.executions.set(jobId, executions);

      // Report to backend
      // await this.reportExecution(job, execution);

      if (result.exitCode === 0) {
        Logger.info(`Cron job ${jobId} completed successfully`);
      } else {
        Logger.warn(`Cron job ${jobId} failed with exit code ${result.exitCode}`);
      }

    } catch (error: any) {
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.success = false;
      execution.error = error.message;

      job.lastRun = execution.startTime;
      job.nextRun = this.getNextRunTime();
      job.lastError = error.message;

      // Store execution
      const executions = this.executions.get(jobId) || [];
      executions.push(execution);
      if (executions.length > 100) {
        executions.shift();
      }
      this.executions.set(jobId, executions);

      // Report to backend
      // await this.reportExecution(job, execution);

      Logger.error(`Cron job ${jobId} failed: ${error.message}`);
    }
  }

  private async runCommand(command: string, env: Record<string, string>, timeout: number): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      
      const childProcess = spawn(cmd, args, {
        env: { ...process.env, ...env },
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data: any) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data: any) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code: any) => {
        resolve({
          exitCode: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      });

      childProcess.on('error', (error: any) => {
        Logger.error(`Failed to start cron job process: ${error instanceof Error ? error.message : String(error)}`);
      });

      // Set timeout
      const timeoutHandle = setTimeout(() => {
        childProcess.kill('SIGKILL');
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      childProcess.on('close', () => {
        clearTimeout(timeoutHandle);
      });
    });
  }

  async pauseCronJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Cron job ${jobId} not found`);
    }

    job.task.stop();
    job.status = 'paused';
    job.nextRun = undefined;

    Logger.info(`Cron job ${jobId} paused`);
  }

  async resumeCronJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Cron job ${jobId} not found`);
    }

    job.task.start();
    job.status = 'active';
    job.nextRun = this.getNextRunTime();

    Logger.info(`Cron job ${jobId} resumed`);
  }

  async stopCronJob(workloadId: string): Promise<void> {
    // Find and stop all cron jobs for the workload
    const jobsToStop = Array.from(this.jobs.values()).filter(job => job.workloadId === workloadId);

    for (const job of jobsToStop) {
      job.task.stop();
      job.status = 'disabled';
      
      this.jobs.delete(job.id);
      this.executions.delete(job.id);
      
      Logger.info(`Cron job ${job.id} stopped and removed`);
    }
  }

  async updateCronJob(jobId: string, updates: Partial<CronJobConfig>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Cron job ${jobId} not found`);
    }

    // Stop current task
    job.task.stop();

    // Apply updates
    if (updates.name) job.name = updates.name;
    if (updates.command) job.command = updates.command;
    if (updates.env) job.env = updates.env;
    if (updates.timeout) job.timeout = updates.timeout;

    // If schedule changed, create new task
    if (updates.schedule) {
      if (!cron.validate(updates.schedule)) {
        throw new Error(`Invalid cron schedule: ${updates.schedule}`);
      }
      
      job.schedule = updates.schedule;
      job.task = cron.schedule(job.schedule, async () => {
        await this.executeCronJob(jobId);
      }, {
        scheduled: false,
        timezone: 'UTC',
      });
    } else {
      // Recreate task with same schedule
      job.task = cron.schedule(job.schedule, async () => {
        await this.executeCronJob(jobId);
      }, {
        scheduled: false,
        timezone: 'UTC',
      });
    }

    // Restart if was active
    if (job.status === 'active') {
      job.task.start();
      job.nextRun = this.getNextRunTime();
    }

    Logger.info(`Cron job ${jobId} updated`);
  }

  getCronJob(jobId: string): CronJob | undefined {
    return this.jobs.get(jobId);
  }

  listCronJobs(workloadId?: string): CronJob[] {
    const allJobs = Array.from(this.jobs.values());
    return workloadId ? allJobs.filter(job => job.workloadId === workloadId) : allJobs;
  }

  getCronJobExecutions(jobId: string, limit: number = 50): CronExecution[] {
    const executions = this.executions.get(jobId) || [];
    return executions.slice(-limit).reverse(); // Most recent first
  }

  private getNextRunTime(): Date {
    try {
      // This is a simplified implementation
      // In production, you'd use a proper cron expression parser
      const now = new Date();
      const next = new Date(now.getTime() + 60000); // Approximate next minute
      
      return next;
    } catch (error) {
      return new Date(Date.now() + 60000); // Default to 1 minute from now
    }
  }

  // private async reportExecution(job: CronJob, execution: CronExecution): Promise<void> {
  //   try {
  //     // await this.apiClient.reportCronExecution({
  //     //   jobId: job.id,
  //     //   workloadId: job.workloadId,
  //     //   execution: {
  //     //     startTime: execution.startTime,
  //     //     endTime: execution.endTime,
  //     //     duration: execution.duration,
  //     //     success: execution.success,
  //     //     output: execution.output,
  //     //     error: execution.error,
  //     //   },
  //     // });
  //   } catch (error) {
  //     Logger.warn('Failed to report cron execution');
  //   }
  // }

  /**
   * Gracefully stop all cron jobs and clean up resources.
   */
  async shutdown(): Promise<void> {
    for (const job of this.jobs.values()) {
      job.task.stop();
    }
    this.jobs.clear();
    this.executions.clear();
    Logger.info('CronService shutdown: all jobs stopped and resources cleared');
  }
}