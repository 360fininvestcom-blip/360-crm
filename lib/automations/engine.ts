import { prisma } from '@/lib/prisma';
import { Workflow, Contact } from "@/types";
import { AIProviderKeys } from "@/lib/ai-services";
import { Node as RFNode, Edge } from "reactflow";
import { sendEmail } from "@/lib/email-service";
import { Prisma } from '@prisma/client';

export interface WorkflowRun {
    id: string;
    organization_id: string;
    workflow_id: string;
    contact_id: string;
    status: 'running' | 'completed' | 'failed' | 'waiting';
    current_node_id: string | null;
    metadata: Record<string, unknown>;
    workflow: Workflow;
    contact: Contact;
}

export async function processWorkflowRun(runId: string, depth = 0) {
    if (depth > 5) return; // Prevent infinite loops

    // 1. Fetch Run and Workflow
    const runs: any[] = await prisma.$queryRaw`
        SELECT wr.*, 
               json_build_object('id', w.id, 'nodes', w.nodes, 'edges', w.edges) as workflow,
               json_build_object('id', c.id, 'email', c.email, 'first_name', c.first_name, 'last_name', c.last_name, 'tags', c.tags) as contact
        FROM workflow_runs wr
        JOIN workflows w ON wr.workflow_id = w.id
        JOIN contacts c ON wr.contact_id = c.id
        WHERE wr.id = CAST(${runId} AS UUID)
        LIMIT 1
    `;

    const run = runs[0];

    if (!run) {
        await logExecution(null, null, 'error', 'Workflow run not found: ' + runId);
        return;
    }

    const typedRun = run as unknown as WorkflowRun;

    if (typedRun.status === 'completed' || typedRun.status === 'failed') return;

    const workflow = typedRun.workflow as Workflow;
    const nodes = workflow.nodes as RFNode[];
    const edges = workflow.edges as Edge[];

    // 2. Determine Next Node
    let nextNodeId: string | null = null;

    if (!typedRun.current_node_id) {
        const triggerNode = nodes.find(n => n.type === 'trigger');
        if (!triggerNode) {
            await logExecution(typedRun, null, 'error', 'No trigger node found');
            await markRunStatus(runId, 'failed');
            return;
        }
        await logExecution(typedRun, triggerNode.id, 'info', `Workflow started via ${triggerNode.data.triggerType}`);
        const edge = edges.find(e => e.source === triggerNode.id);
        nextNodeId = edge ? edge.target : null;
    } else {
        const edge = edges.find(e => e.source === typedRun.current_node_id);
        nextNodeId = edge ? edge.target : null;
    }

    if (!nextNodeId) {
        await logExecution(run, run.current_node_id, 'info', 'Workflow completed');
        await markRunStatus(runId, 'completed');
        return;
    }

    const currentNode = nodes.find(n => n.id === nextNodeId);
    if (!currentNode) {
        await logExecution(run, nextNodeId, 'error', `Node ${nextNodeId} not found`);
        await markRunStatus(runId, 'failed');
        return;
    }

    // 3. Execute Node Logic
    try {
        await logExecution(run, nextNodeId, 'info', `Executing node type: ${currentNode.type}`);

        switch (currentNode.type) {
            case 'email':
                await executeEmailAction(run, currentNode);
                await advanceWorkflow(runId, nextNodeId, depth + 1);
                break;

            case 'delay':
                const delayUntil = calculateDelay(currentNode.data);
                await logExecution(run, nextNodeId, 'info', `Delaying execution until ${delayUntil.toLocaleString()}`);
                await markRunStatus(runId, 'waiting', {
                    current_node_id: nextNodeId,
                    next_execution_at: delayUntil.toISOString()
                });
                break;

            case 'condition':
                const branch = await evaluateCondition(run, currentNode);
                await logExecution(run, nextNodeId, 'info', `Condition evaluated to: ${branch}`);
                const branchEdge = edges.find(e => e.source === nextNodeId && e.sourceHandle === branch);
                if (branchEdge) {
                    await advanceWorkflow(runId, branchEdge.target, depth + 1);
                } else {
                    await logExecution(run, nextNodeId, 'info', `No path found for branch ${branch}, completing workflow`);
                    await markRunStatus(runId, 'completed');
                }
                break;

            case 'action':
                await executeGeneralAction(run, currentNode);
                await advanceWorkflow(runId, nextNodeId, depth + 1);
                break;

            default:
                await advanceWorkflow(runId, nextNodeId, depth + 1);
                break;
        }
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        await logExecution(run, nextNodeId, 'error', `Execution failed: ${errorMessage}`);
        await markRunStatus(runId, 'failed', { metadata: { ...run.metadata, error: errorMessage } });
    }
}

async function logExecution(run: WorkflowRun | null, nodeId: string | null, level: string, message: string) {
    if (!run) return;
    await prisma.$executeRaw`
        INSERT INTO workflow_logs (organization_id, workflow_id, run_id, node_id, level, message, created_at)
        VALUES (
            CAST(${run.organization_id} AS UUID),
            CAST(${run.workflow_id} AS UUID),
            CAST(${run.id} AS UUID),
            ${nodeId},
            ${level},
            ${message},
            CAST(${new Date().toISOString()} AS TIMESTAMPTZ)
        )
    `;
}

async function markRunStatus(runId: string, status: string, updates: Record<string, unknown> = {}) {
    const setClauses = [];
    const values = [];
    let i = 1;
    for (const [key, value] of Object.entries(updates)) {
        if (key === 'metadata') {
            setClauses.push(Prisma.sql`${Prisma.raw(key)} = ${Prisma.sql`${value}::jsonb`}`);
        } else if (key === 'next_execution_at') {
            setClauses.push(Prisma.sql`${Prisma.raw(key)} = CAST(${value} AS TIMESTAMPTZ)`);
        } else {
            setClauses.push(Prisma.sql`${Prisma.raw(key)} = ${value}`);
        }
    }
    setClauses.push(Prisma.sql`status = ${status}`);
    setClauses.push(Prisma.sql`last_executed_at = CAST(${new Date().toISOString()} AS TIMESTAMPTZ)`);

    await prisma.$executeRaw`
        UPDATE workflow_runs
        SET ${Prisma.join(setClauses, ', ')}
        WHERE id = CAST(${runId} AS UUID)
    `;
}

async function advanceWorkflow(runId: string, nodeId: string, depth: number) {
    await prisma.$executeRaw`
        UPDATE workflow_runs
        SET current_node_id = ${nodeId},
            status = 'running',
            next_execution_at = CAST(${new Date().toISOString()} AS TIMESTAMPTZ)
        WHERE id = CAST(${runId} AS UUID)
    `;

    await processWorkflowRun(runId, depth);
}

function calculateDelay(data: Record<string, unknown>): Date {
    const duration = parseInt((data.duration as string) || '0');
    const unit = (data.unit as string) || 'days';
    const date = new Date();

    if (unit === 'minutes') date.setMinutes(date.getMinutes() + duration);
    else if (unit === 'hours') date.setHours(date.getHours() + duration);
    else if (unit === 'days') date.setDate(date.getDate() + duration);

    return date;
}

async function executeEmailAction(run: WorkflowRun, node: RFNode) {
    const contact = run.contact as Contact;
    if (!contact?.email) throw new Error('Contact has no email');

    const templateId = node.data.templateId as string;
    if (!templateId) throw new Error('No template selected');

    await sendEmail({
        to: contact.email,
        templateId,
        organizationId: run.organization_id,
        variables: {
            first_name: contact.first_name,
            last_name: contact.last_name || ''
        }
    });
}

async function evaluateCondition(run: WorkflowRun, node: RFNode): Promise<'true' | 'false'> {
    const { field, operator, value } = node.data;
    if (!field || !operator) return 'true'; // Default path if misconfigured

    const contactValue = (run.contact as unknown as Record<string, unknown>)[field as string];

    switch (operator) {
        case 'equals': return String(contactValue).trim().toLowerCase() === String(value).trim().toLowerCase() ? 'true' : 'false';
        case 'contains': return String(contactValue).toLowerCase().includes(String(value).toLowerCase()) ? 'true' : 'false';
        case 'exists': return !!contactValue ? 'true' : 'false';
        case 'greater_than': return Number(contactValue) > Number(value) ? 'true' : 'false';
        case 'less_than': return Number(contactValue) < Number(value) ? 'true' : 'false';
        default: return 'true';
    }
}

async function executeGeneralAction(run: WorkflowRun, node: RFNode) {
    const actionType = node.data.actionType;
    
    if (actionType === 'add_tag') {
        const tag = node.data.tag as string;
        if (!tag) return;
        
        const currentTags = run.contact.tags || [];
        if (!currentTags.includes(tag)) {
            const newTags = [...currentTags, tag];
            await prisma.$executeRaw`
                UPDATE contacts
                SET tags = array[${Prisma.join(newTags)}]
                WHERE id = CAST(${run.contact_id} AS UUID)
            `;
            await logExecution(run, node.id, 'info', `Added tag: ${tag}`);
        }
    } 
    else if (actionType === 'calculate_score') {
        const activities: any[] = await prisma.$queryRaw`
            SELECT * FROM activities
            WHERE contact_id = CAST(${run.contact_id} AS UUID)
            ORDER BY created_at DESC
            LIMIT 20
        `;

        const apiKeysRecords: any[] = await prisma.$queryRaw`
            SELECT * FROM api_keys
            WHERE organization_id = CAST(${run.organization_id} AS UUID)
            LIMIT 1
        `;
        const apiKeys = apiKeysRecords[0];

        if (apiKeys) {
            const { generateContactScore } = await import('@/lib/ai-services');
            const result = await generateContactScore(run.contact as unknown as Record<string, unknown>, activities || [], apiKeys as unknown as AIProviderKeys);
            if (result) {
                await prisma.$executeRaw`
                    UPDATE contacts
                    SET lead_score = ${result.score},
                        score_reason = ${result.reason}
                    WHERE id = CAST(${run.contact_id} AS UUID)
                `;
                await logExecution(run, node.id, 'info', `AI Lead Score updated: ${result.score}`);
            }
        } else {
             await logExecution(run, node.id, 'error', `Cannot calculate lead score: Missing API Keys for organization`);
        }
    }
    // Reserved for future expansion natively described in the Builder UI
    else if (actionType === 'notify_user') {
        const userId = node.data.userId as string;
        const title = node.data.title || 'Automation Alert';
        const message = node.data.message || 'An automation trigger has occurred.';
        
        if (!userId) {
            await logExecution(run, node.id, 'error', 'No user specified for notification');
            return;
        }

        await prisma.$executeRaw`
            INSERT INTO notifications (user_id, organization_id, title, message, type, link_url, read, created_at)
            VALUES (
                CAST(${userId} AS UUID),
                CAST(${run.organization_id} AS UUID),
                ${title},
                ${message},
                'system',
                ${`/dashboard/contacts/${run.contact_id}`},
                false,
                CAST(${new Date().toISOString()} AS TIMESTAMPTZ)
            )
        `.catch(notifError => {
            logExecution(run, node.id, 'error', `Failed to send notification: ${notifError.message}`);
        }).then(() => {
            logExecution(run, node.id, 'info', `Sent notification to user ${userId}`);
        });
    }
    else if (actionType === 'update_stage') {
        const stage = node.data.stage as string;
        if (!stage) {
            await logExecution(run, node.id, 'error', 'No stage specified for update');
            return;
        }
        
        // Find the most recent deal for this contact to update its stage
        const deals: any[] = await prisma.$queryRaw`
            SELECT id FROM deals
            WHERE contact_id = CAST(${run.contact_id} AS UUID)
            ORDER BY created_at DESC
            LIMIT 1
        `;

        if (deals && deals.length > 0) {
            await prisma.$executeRaw`
                UPDATE deals
                SET stage = ${stage}
                WHERE id = CAST(${deals[0].id} AS UUID)
            `.catch(updateError => {
                logExecution(run, node.id, 'error', `Failed to update deal stage: ${updateError.message}`);
            }).then(() => {
                logExecution(run, node.id, 'info', `Updated deal ${deals[0].id} stage to: ${stage}`);
            });
        } else {
            await logExecution(run, node.id, 'warn', 'No deals found for contact to update stage');
        }
    }
    else if (actionType === 'assign_owner') {
        const ownerId = node.data.ownerId as string;
        if (!ownerId) {
            await logExecution(run, node.id, 'error', 'No owner specified for assignment');
            return;
        }

        await prisma.$executeRaw`
            UPDATE contacts
            SET owner_id = CAST(${ownerId} AS UUID)
            WHERE id = CAST(${run.contact_id} AS UUID)
        `.catch(updateError => {
             logExecution(run, node.id, 'error', `Failed to assign owner: ${updateError.message}`);
        }).then(() => {
            logExecution(run, node.id, 'info', `Assigned contact owner to: ${ownerId}`);
        });
    }
}

export async function evaluateTriggers(triggerType: string, organizationId: string, payload: { contactId: string; [key: string]: unknown }) {
    // 1. Fetch active workflows for this trigger
    const workflows: any[] = await prisma.$queryRaw`
        SELECT * FROM workflows
        WHERE organization_id = CAST(${organizationId} AS UUID)
          AND is_active = true
    `;

    if (!workflows || workflows.length === 0) return;

    for (const workflow of workflows) {
        const nodes = workflow.nodes as RFNode[];
        const triggerNode = nodes.find(n => n.type === 'trigger' && n.data.triggerType === triggerType);

        if (!triggerNode) continue;

        // Check trigger specific conditions (e.g. formId routing)
        if (triggerType === 'lead_created' && triggerNode.data.formId && triggerNode.data.formId !== payload.formId) {
            continue; // Skip if this workflow is listening for a specific web form, but a different one was submitted
        }

        // 2. Create Workflow Run
        try {
            const runs: any[] = await prisma.$queryRaw`
                INSERT INTO workflow_runs (organization_id, workflow_id, contact_id, status, metadata, created_at, updated_at)
                VALUES (
                    CAST(${organizationId} AS UUID),
                    CAST(${workflow.id} AS UUID),
                    CAST(${payload.contactId} AS UUID),
                    'waiting',
                    ${Prisma.sql`${{ trigger_payload: payload }}::jsonb`},
                    CAST(${new Date().toISOString()} AS TIMESTAMPTZ),
                    CAST(${new Date().toISOString()} AS TIMESTAMPTZ)
                )
                RETURNING id
            `;
            const run = runs[0];
            
            // 3. Start processing immediately for the first node
            await processWorkflowRun(run.id, 0);
        } catch (runError) {
             console.error("Failed to insert workflow run:", runError);
        }
    }
}
