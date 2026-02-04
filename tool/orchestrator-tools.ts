import { tool } from 'ai';
import { z } from 'zod';
import { mutateChat } from '@/lib/chat-store';

const SPECIAL_AGENT_NAME = '__self__';

export const GraphNodeSchema = z.object({
  agent: z.string().describe('Name of the agent created by create_subagent'),
  task: z.string().describe('Brief task description for the agent to perform'),
  step: z.number().int().describe('Step number in the task sequence (for ordering/parallelism)'),
  status: z.enum(['in_progress', 'pending', 'completed']).describe('Status of the task'),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;

export function createOrchestratorTools(chatId: string) {
  const createSubAgentTool = tool({
    description: 'Create a custom sub-agent with specific system prompt and name for reuse.',
    inputSchema: z.object({
      name: z.string().describe('Unique name for this agent configuration'),
      system_prompt: z.string().describe("System prompt defining the agent's role"),
    }),
    async execute({ name, system_prompt }) {
      if (name === SPECIAL_AGENT_NAME) {
        return `Agent name '${SPECIAL_AGENT_NAME}' is reserved for self-delegation.`;
      }

      const action = await mutateChat(chatId, chat => {
        const subAgents = chat.subAgents ?? [];
        const existingIndex = subAgents.findIndex(a => a.name === name);

        if (existingIndex >= 0) {
          const incoming = typeof system_prompt === 'string' ? system_prompt.trim() : '';
          const current =
            typeof subAgents[existingIndex]?.system_prompt === 'string' ? subAgents[existingIndex].system_prompt.trim() : '';

          if (incoming && incoming !== current) {
            subAgents[existingIndex] = { name, system_prompt };
            return { result: 'updated' as const, chat: { ...chat, subAgents } };
          }
          return { result: 'reused' as const };
        }

        subAgents.push({ name, system_prompt });
        return { result: 'created' as const, chat: { ...chat, subAgents } };
      });

      if (action === 'created') return `Sub-agent '${name}' created successfully.`;
      if (action === 'updated') return `Sub-agent '${name}' updated successfully.`;
      return `Sub-agent '${name}' reused.`;
    },
  });

  const planSubagentGraphTool = tool({
    description: 'Plan or update the subagent dependency graph. The graph defines the topology of sub-agents and their tasks.',
    inputSchema: z.object({
      nodes: z.array(GraphNodeSchema),
    }),
    async execute({ nodes }) {
      if (!nodes || nodes.length === 0) {
        return mutateChat(chatId, chat => ({
          result: 'Subagent Graph Cleared.',
          chat: { ...chat, graph: [] },
        }));
      }

      return mutateChat(chatId, chat => {
        const agentNames = new Set((chat.subAgents ?? []).map(a => a.name));

        for (const node of nodes) {
          if (!agentNames.has(node.agent) && node.agent !== SPECIAL_AGENT_NAME) {
            return { result: `Error: Agent '${node.agent}' does not exist. Please create it first.` };
          }
        }

        const steps = Array.from(new Set(nodes.map(n => n.step))).sort((a, b) => a - b);
        if (steps.length === 0) {
          return { result: 'Error: No steps defined.' };
        }

        for (let i = 0; i < steps.length - 1; i++) {
          if (steps[i + 1] !== steps[i] + 1) {
            return { result: `Error: Steps are not continuous. Missing step between ${steps[i]} and ${steps[i + 1]}.` };
          }
        }

        for (const node of nodes) {
          if (node.status === 'in_progress') {
            const currentStep = node.step;
            const prevStepIndex = steps.indexOf(currentStep) - 1;
            if (prevStepIndex < 0) continue;

            const prevStep = steps[prevStepIndex];
            const prevNodes = nodes.filter(n => n.step === prevStep);
            for (const prevNode of prevNodes) {
              if (prevNode.status !== 'completed') {
                return {
                  result: `Error: Cannot start step ${currentStep} (Agent '${node.agent}') because previous step ${prevStep} (Agent '${prevNode.agent}') is not completed.`,
                };
              }
            }
          }
        }

        return { result: 'Subagent Graph Updated!', chat: { ...chat, graph: nodes } };
      });
    },
  });

  return {
    create_subagent: createSubAgentTool,
    plan_subagent_graph: planSubagentGraphTool,
  };
}
