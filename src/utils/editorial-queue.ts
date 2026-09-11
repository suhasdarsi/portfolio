export type EditorialStatus = 'awaiting_review' | 'waiting' | 'approved';

export type EditorialQueueItem = {
  id: string;
  siftlyTopic: string;
  relatedTopics: string[];
  why: string;
  reviewSlot: string;
  proposedPublish: string;
  status: EditorialStatus;
};

/**
 * Review/publish sequence for original notes.
 * `dueDate` is intentionally omitted on these drafts so the site never auto-publishes them.
 */
export const editorialQueue: EditorialQueueItem[] = [
  {
    id: 'shadow-ai-as-unauthorized-hubs',
    siftlyTopic: 'Shadow AI security',
    relatedTopics: ['unapproved ai use'],
    why: 'Fits the existing hub thesis: unauthorized AI tools are hubs that form off the official map, which is how cascade risk starts in real organizations.',
    reviewSlot: '2026-09-11',
    proposedPublish: '2026-09-18',
    status: 'awaiting_review',
  },
  {
    id: 'mcp-servers-as-hub-to-hub-bridges',
    siftlyTopic: 'MCP server security',
    relatedTopics: ['agent, mcp and skill registry'],
    why: 'Extends the hub-to-hub essay into the actual protocol teams are using to let agents talk to tools, files, and other agents.',
    reviewSlot: '2026-09-18',
    proposedPublish: '2026-09-25',
    status: 'waiting',
  },
  {
    id: 'the-endpoint-is-where-the-agent-becomes-a-hub',
    siftlyTopic: 'Agentic endpoint security',
    relatedTopics: ['AI endpoint security', 'Agentic AI governance'],
    why: 'Brings the series down to the device, where agents actually accumulate permissions — the personal-brand counterpart to endpoint telemetry topics.',
    reviewSlot: '2026-09-25',
    proposedPublish: '2026-10-02',
    status: 'waiting',
  },
];

export function getCurrentReviewItem(queue = editorialQueue): EditorialQueueItem | undefined {
  return queue.find((item) => item.status === 'awaiting_review') ?? queue.find((item) => item.status === 'waiting');
}

export function getWaitingReviewItems(queue = editorialQueue): EditorialQueueItem[] {
  const current = getCurrentReviewItem(queue);
  return queue.filter((item) => item.id !== current?.id && item.status !== 'approved');
}
