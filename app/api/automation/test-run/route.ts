import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Node as RFNode, Edge } from "reactflow";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { contactId, nodes, edges } = body as { contactId: string; nodes: RFNode[]; edges: Edge[] };

        if (!contactId || !nodes || !edges) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Fetch contact details for evaluating conditions
        const contact = await prisma.contact.findUnique({
            where: { id: contactId }
        });

        if (!contact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        // Simulation logs collector
        const logs: Array<{ step: string; level: 'info' | 'warn' | 'error'; message: string; timestamp: string }> = [];
        const addLog = (step: string, level: 'info' | 'warn' | 'error', message: string) => {
            logs.push({ step, level, message, timestamp: new Date().toISOString() });
        };

        // Start execution loop
        addLog('Start', 'info', `Starting test run for contact ${contact.firstName} ${contact.lastName || ''} (${contact.email || 'No email'})`);

        let currentNode = nodes.find(n => n.type === 'trigger');
        if (!currentNode) {
            addLog('Trigger', 'error', 'No trigger node found in workflow. Simulation aborted.');
            return NextResponse.json({ success: false, logs });
        }

        addLog(currentNode.data.label || 'Trigger', 'info', `Trigger activated: ${currentNode.data.triggerType || 'Manual'}`);

        let depth = 0;
        const maxDepth = 30; // Prevent infinite loop in badly configured cycles
        let nextEdge = edges.find(e => e.source === currentNode?.id);

        while (nextEdge && depth < maxDepth) {
            depth++;
            const nextNodeId = nextEdge.target;
            const nextNode = nodes.find(n => n.id === nextNodeId);

            if (!nextNode) {
                addLog('Navigation', 'error', `Target node ${nextNodeId} not found. Simulation aborted.`);
                break;
            }

            currentNode = nextNode;
            const nodeLabel = (currentNode.data.label as string) || `${currentNode.type} node`;
            addLog(nodeLabel, 'info', `Entering step: ${currentNode.type}`);

            if (currentNode.type === 'email') {
                const templateId = currentNode.data.templateId;
                if (!templateId) {
                    addLog(nodeLabel, 'warn', 'No email template selected for this step.');
                } else {
                    addLog(nodeLabel, 'info', `[SIMULATED] Send email using template: ${templateId} to ${contact.email || 'unknown email'}`);
                }
                nextEdge = edges.find(e => e.source === currentNode?.id);
            } 
            else if (currentNode.type === 'delay') {
                const duration = currentNode.data.duration || '0';
                const unit = currentNode.data.unit || 'days';
                addLog(nodeLabel, 'info', `[SIMULATED] Wait for ${duration} ${unit} (skipped in test run)`);
                nextEdge = edges.find(e => e.source === currentNode?.id);
            } 
            else if (currentNode.type === 'condition') {
                const { field, operator, value } = currentNode.data as { field?: string; operator?: string; value?: string };
                if (!field || !operator) {
                    addLog(nodeLabel, 'warn', 'Condition is not fully configured. Defaulting to True path.');
                    nextEdge = edges.find(e => e.source === currentNode?.id && e.sourceHandle === 'true');
                } else {
                    const contactValue = contact[field as keyof typeof contact];
                    let matched = false;
                    switch (operator) {
                        case 'equals':
                            matched = String(contactValue).trim().toLowerCase() === String(value).trim().toLowerCase();
                            break;
                        case 'contains':
                            matched = String(contactValue).toLowerCase().includes(String(value).toLowerCase());
                            break;
                        case 'exists':
                            matched = contactValue !== undefined && contactValue !== null && contactValue !== '';
                            break;
                        case 'greater_than':
                            matched = Number(contactValue) > Number(value);
                            break;
                        case 'less_than':
                            matched = Number(contactValue) < Number(value);
                            break;
                        default:
                            matched = true;
                    }
                    const branch = matched ? 'true' : 'false';
                    addLog(nodeLabel, 'info', `Condition evaluated: ${field} (${contactValue || 'null'}) ${operator} ${value || ''} -> Result: ${branch}`);
                    nextEdge = edges.find(e => e.source === currentNode?.id && e.sourceHandle === branch);
                }
            } 
            else if (currentNode.type === 'action') {
                const actionType = currentNode.data.actionType;
                if (actionType === 'add_tag') {
                    const tag = currentNode.data.tag;
                    addLog(nodeLabel, 'info', `[SIMULATED] Add tag: ${tag}`);
                } else if (actionType === 'calculate_score') {
                    addLog(nodeLabel, 'info', `[SIMULATED] Trigger AI Lead Score recalculation`);
                } else if (actionType === 'notify_user') {
                    const title = currentNode.data.title || 'Alert';
                    addLog(nodeLabel, 'info', `[SIMULATED] Notify user: ${title}`);
                } else if (actionType === 'update_stage') {
                    const stage = currentNode.data.stage;
                    addLog(nodeLabel, 'info', `[SIMULATED] Update deal stage to: ${stage}`);
                } else if (actionType === 'assign_owner') {
                    const ownerId = currentNode.data.ownerId;
                    addLog(nodeLabel, 'info', `[SIMULATED] Assign owner to: ${ownerId}`);
                } else {
                    addLog(nodeLabel, 'warn', `Unknown action type: ${actionType}`);
                }
                nextEdge = edges.find(e => e.source === currentNode?.id);
            } 
            else {
                addLog(nodeLabel, 'info', `Executed generic step: ${currentNode.type}`);
                nextEdge = edges.find(e => e.source === currentNode?.id);
            }
        }

        if (depth >= maxDepth) {
            addLog('End', 'warn', 'Maximum depth reached. Possible infinite loop detected in workflow layout.');
        } else {
            addLog('End', 'info', 'Workflow simulation finished successfully.');
        }

        return NextResponse.json({ success: true, logs });

    } catch (error: any) {
        console.error('Test run failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
