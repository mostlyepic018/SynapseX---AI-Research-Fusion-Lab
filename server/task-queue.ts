import { getStorage } from "./storage";
import { buildWorkspacePapersContext } from "./context";
import { queryAgent, type AgentRole } from "./gemini";
import type { Task } from "../shared/schema";
import { WebSocket } from "ws";

interface TaskQueueManager {
  processingTasks: Set<string>;
  addToQueue: (task: Task, broadcast: BroadcastFunction) => Promise<void>;
  processQueue: (workspaceId: string, broadcast: BroadcastFunction) => Promise<void>;
}

type BroadcastFunction = (message: any) => void;

const queueManager: TaskQueueManager = {
  processingTasks: new Set(),
  
  async addToQueue(task: Task, broadcast: BroadcastFunction) {
    broadcast({
      type: "task_queued",
      task: {
        id: task.id,
        title: task.title,
        agentType: task.agentType,
        priority: task.priority,
        status: task.status,
      },
      timestamp: new Date().toISOString(),
    });

    // Start processing the queue for this workspace
    this.processQueue(task.workspaceId, broadcast);
  },

  async processQueue(workspaceId: string, broadcast: BroadcastFunction) {
    const storage = await getStorage();
    
    // Get pending tasks sorted by priority
    const pendingTasks = await storage.getPendingTasks(workspaceId);
    
    // Priority order: urgent > high > medium > low
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    pendingTasks.sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
      return aPriority - bPriority;
    });

    // Process tasks one at a time (can be parallelized if needed)
    for (const task of pendingTasks) {
      if (this.processingTasks.has(task.id)) continue;
      
      this.processingTasks.add(task.id);
      
      try {
        await processTask(task, broadcast);
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
      } finally {
        this.processingTasks.delete(task.id);
      }
    }
  },
};

async function processTask(task: Task, broadcast: BroadcastFunction) {
  const storage = await getStorage();
  
  // Update task to in_progress
  await storage.updateTaskProgress(task.id, "in_progress", new Date());
  
  broadcast({
    type: "task_started",
    task: {
      id: task.id,
      title: task.title,
      agentType: task.agentType,
      status: "in_progress",
    },
    timestamp: new Date().toISOString(),
  });

  console.log(`[Task Queue] Starting task ${task.id} - ${task.title} [Agent: ${task.agentType}]`);

  try {
    // Build context for the agent
    let context = task.context || "";
    
    // If task is related to a paper, fetch paper context
    if (task.paperId) {
      const paper = await storage.getPaper(task.paperId);
      if (paper) {
        context += `\n\nPaper Title: ${paper.title}\nAbstract: ${paper.abstract || "Not available"}`;
        if (paper.content) {
          context += `\n\nContent: ${paper.content.slice(0, 2000)}...`;
        }
      }
    }

    // Augment with workspace uploads
    const uploadsCtx = await buildWorkspacePapersContext(task.workspaceId);
    if (uploadsCtx) {
      context += `\n\n${uploadsCtx}`;
    }

    // Query the specific agent
    const result = await queryAgent({
      role: task.agentType as AgentRole,
      query: task.description,
      context: context || undefined,
    });

    // Update task with result
    await storage.updateTaskProgress(task.id, "completed", undefined, new Date());
    await storage.updateTaskStatus(task.id, "completed", result);

    console.log(`[Task Queue] Completed task ${task.id} - ${task.title}`);

    broadcast({
      type: "task_completed",
      task: {
        id: task.id,
        title: task.title,
        agentType: task.agentType,
        status: "completed",
        result: result.slice(0, 200) + (result.length > 200 ? "..." : ""),
      },
      timestamp: new Date().toISOString(),
    });

    // Also send as a message to the workspace
    await storage.createMessage({
      content: `Task completed: ${task.title}\n\nResult: ${result}`,
      role: "agent",
      agentType: task.agentType,
      paperId: task.paperId || null,
      workspaceId: task.workspaceId,
      userId: null,
    });

  } catch (error: any) {
    console.error(`[Task Queue] Failed task ${task.id}:`, error);
    
    await storage.updateTaskProgress(task.id, "failed", undefined, new Date());
    await storage.updateTaskStatus(task.id, "failed", `Error: ${error.message}`);

    broadcast({
      type: "task_failed",
      task: {
        id: task.id,
        title: task.title,
        agentType: task.agentType,
        status: "failed",
        error: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export { queueManager };
