import ReactFlow, {
    addEdge,
    Background,
    Controls,
    MiniMap,
    applyEdgeChanges,
    applyNodeChanges,
    Edge,
    Node,
    OnConnect,
    OnNodesChange,
    OnEdgesChange,
    Panel,
    ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Trash2, X, ChevronLeft, Save, Play } from 'lucide-react';
import Link from 'next/link';
import { useUpdateWorkflow } from '@/hooks/use-workflows';
import { useEmailTemplates } from '@/hooks/use-email';
import { toast } from 'sonner';
import { Workflow } from '@/types';
import { TriggerNode, ActionNode, DelayNode, ConditionNode } from './custom-nodes';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { getTestContacts } from "@/actions/contacts";
import { Loader2 } from "lucide-react";

const nodeTypes = {
    trigger: TriggerNode,
    email: ActionNode,
    sms: ActionNode,
    whatsapp: ActionNode,
    action: ActionNode,
    delay: DelayNode,
    condition: ConditionNode,
};

interface WorkflowBuilderProps {
    workflow: Workflow;
}

function BuilderInternal({ workflow }: WorkflowBuilderProps) {
    const [prevWorkflowId, setPrevWorkflowId] = useState(workflow.id);
    const [nodes, setNodes] = useState<Node[]>(workflow.nodes as Node[] || []);
    const [edges, setEdges] = useState<Edge[]>(workflow.edges as Edge[] || []);

    if (workflow.id !== prevWorkflowId) {
        setPrevWorkflowId(workflow.id);
        setNodes(workflow.nodes as Node[] || []);
        setEdges(workflow.edges as Edge[] || []);
    }

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const { trigger: updateWorkflow, isMutating: isSaving } = useUpdateWorkflow();
    const { data: templates } = useEmailTemplates();

    const [testDialogOpen, setTestDialogOpen] = useState(false);
    const [contacts, setContacts] = useState<any[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string>("");
    const [testRunning, setTestRunning] = useState(false);
    const [testLogs, setTestLogs] = useState<Array<{ step: string; level: 'info' | 'warn' | 'error'; message: string; timestamp: string }>>([]);
    const [contactsLoading, setContactsLoading] = useState(false);

    useEffect(() => {
        if (testDialogOpen && contacts.length === 0) {
            const fetchContacts = async () => {
                setContactsLoading(true);
                try {
                    const data = await getTestContacts(20);
                    if (data) {
                        setContacts(data);
                        if (data.length > 0) setSelectedContactId(data[0].id);
                    }
                } catch (err) {
                    console.error("Failed to load test contacts", err);
                } finally {
                    setContactsLoading(false);
                }
            };
            fetchContacts();
        }
    }, [testDialogOpen, contacts.length]);

    const handleRunTest = async () => {
        if (!selectedContactId) {
            toast.error("Please select a test contact first");
            return;
        }
        setTestRunning(true);
        setTestLogs([]);
        try {
            const res = await fetch("/api/automation/test-run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contactId: selectedContactId,
                    nodes,
                    edges
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTestLogs(data.logs);
                toast.success("Simulation finished");
            } else {
                toast.error(data.error || "Simulation failed");
            }
        } catch (err) {
            console.error("Failed to run test", err);
            toast.error("Network error running simulation");
        } finally {
            setTestRunning(false);
        }
    };

    const selectedNode = useMemo(() =>
        nodes.find(n => n.id === selectedNodeId),
        [nodes, selectedNodeId]
    );

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const onConnect: OnConnect = useCallback(
        (connection) => setEdges((eds) => addEdge(connection, eds)),
        []
    );

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const onSave = async () => {
        try {
            await updateWorkflow({
                id: workflow.id,
                updates: { nodes, edges }
            });
            toast.success("Workflow saved successfully");
        } catch {
            toast.error("Failed to save workflow");
        }
    };

    const onAddNode = (type: string) => {
        const defaultData: Record<string, unknown> = { label: `${type} Node` };

        if (type === 'trigger') {
            defaultData.triggerType = 'contact_created';
            defaultData.description = 'When a new contact is added';
        } else if (type === 'email') {
            defaultData.actionType = 'email';
            defaultData.label = 'Send Welcome Email';
        } else if (type === 'sms') {
            defaultData.actionType = 'sms';
            defaultData.label = 'Send SMS Message';
        } else if (type === 'whatsapp') {
            defaultData.actionType = 'whatsapp';
            defaultData.label = 'Send WhatsApp Message';
        }

        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type,
            position: { x: 250, y: 50 },
            data: defaultData,
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(newNode.id);
    };

    const updateNodeData = (id: string, newData: Record<string, unknown>) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, ...newData } };
                }
                return node;
            })
        );
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Builder Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b bg-background z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/automations">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div className="space-y-0.5">
                        <h1 className="text-xl font-bold">{workflow.name}</h1>
                        <p className="text-xs text-muted-foreground">{workflow.description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setTestDialogOpen(true)}>
                        <Play className="w-4 h-4" />
                        Test Run
                    </Button>
                    <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save Workflow"}
                    </Button>
                </div>
            </header>

            {/* Main Builder Canvas and Sidebar */}
            <div className="flex-1 flex overflow-hidden">
                {/* React Flow Canvas */}
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                    >
                        <Background />
                        <Controls />
                        <MiniMap />

                        <Panel position="top-left" className="bg-background border p-2 rounded-lg shadow-md space-y-2 z-10 pointer-events-auto">
                            <div className="text-xs font-semibold text-muted-foreground mb-2 px-1 uppercase tracking-wider">Add Step</div>
                            <div className="grid grid-cols-1 gap-1">
                                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => onAddNode('trigger')}>
                                    <div className="w-2 h-2 rounded-full bg-blue-500" /> Trigger
                                </Button>
                                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => onAddNode('email')}>
                                    <div className="w-2 h-2 rounded-full bg-green-500" /> Send Email
                                </Button>
                                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => onAddNode('sms')}>
                                    <div className="w-2 h-2 rounded-full bg-blue-500" /> Send SMS
                                </Button>
                                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => onAddNode('whatsapp')}>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Send WhatsApp
                                </Button>
                                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => onAddNode('delay')}>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" /> Delay
                                </Button>
                                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => onAddNode('condition')}>
                                    <div className="w-2 h-2 rounded-full bg-purple-500" /> Condition
                                </Button>
                            </div>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Properties Panel */}
                <aside className={cn(
                    "w-80 border-l bg-background transition-all duration-300 overflow-y-auto z-20",
                    selectedNodeId ? "translate-x-0" : "translate-x-full absolute right-0 h-screen"
                )}>
                    {selectedNode && (
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">Node Settings</h3>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedNodeId(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {/* Trigger Config */}
                                {selectedNode.type === 'trigger' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Trigger Type</Label>
                                            <Select
                                                value={selectedNode.data.triggerType}
                                                onValueChange={(val) => updateNodeData(selectedNode.id, { triggerType: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="contact_created">Contact Created</SelectItem>
                                                    <SelectItem value="deal_stage_changed">Deal Stage Changed</SelectItem>
                                                    <SelectItem value="email_opened">Email Opened</SelectItem>
                                                    <SelectItem value="email_clicked">Email Clicked</SelectItem>
                                                    <SelectItem value="tag_added">Tag Added</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {/* Email Config */}
                                {selectedNode.type === 'email' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Step Label</Label>
                                            <Input
                                                value={selectedNode.data.label}
                                                onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email Template</Label>
                                            <Select
                                                value={selectedNode.data.templateId}
                                                onValueChange={(val) => updateNodeData(selectedNode.id, { templateId: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Template" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {templates?.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {/* SMS/WhatsApp Config */}
                                {(selectedNode.type === 'sms' || selectedNode.type === 'whatsapp') && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Step Label</Label>
                                            <Input
                                                value={selectedNode.data.label as string}
                                                onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Message Content</Label>
                                            <textarea
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder={`Enter ${selectedNode.type} message...`}
                                                value={selectedNode.data.messageContent as string || ''}
                                                onChange={(e) => updateNodeData(selectedNode.id, { messageContent: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Delay Config */}
                                {selectedNode.type === 'delay' && (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <div className="flex-1 space-y-2">
                                                <Label>Duration</Label>
                                                <Input
                                                    type="number"
                                                    value={selectedNode.data.duration || 1}
                                                    onChange={(e) => updateNodeData(selectedNode.id, { duration: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Label>Unit</Label>
                                                <Select
                                                    value={selectedNode.data.unit || 'days'}
                                                    onValueChange={(val) => updateNodeData(selectedNode.id, { unit: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="minutes">Minutes</SelectItem>
                                                        <SelectItem value="hours">Hours</SelectItem>
                                                        <SelectItem value="days">Days</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Condition Config */}
                                {selectedNode.type === 'condition' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Field to Check</Label>
                                            <Select
                                                value={selectedNode.data.field as string}
                                                onValueChange={(val) => updateNodeData(selectedNode.id, { field: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Field" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="lead_score">Lead Score</SelectItem>
                                                    <SelectItem value="tags">Tags</SelectItem>
                                                    <SelectItem value="email">Email Address</SelectItem>
                                                    <SelectItem value="status">Status</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Operator</Label>
                                            <Select
                                                value={selectedNode.data.operator as string}
                                                onValueChange={(val) => updateNodeData(selectedNode.id, { operator: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Operator" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="equals">Equals (===)</SelectItem>
                                                    <SelectItem value="contains">Contains / Includes</SelectItem>
                                                    <SelectItem value="exists">Exists (Is Not Empty)</SelectItem>
                                                    <SelectItem value="greater_than">Greater Than (\&gt;)</SelectItem>
                                                    <SelectItem value="less_than">Less Than (\&lt;)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {selectedNode.data.operator !== 'exists' && (
                                            <div className="space-y-2">
                                                <Label>Value</Label>
                                                <Input
                                                    placeholder="Target value..."
                                                    value={selectedNode.data.value as string || ''}
                                                    onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* General Action Config */}
                                {selectedNode.type === 'action' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Action Type</Label>
                                            <Select
                                                value={selectedNode.data.actionType as string || 'add_tag'}
                                                onValueChange={(val) => updateNodeData(selectedNode.id, { actionType: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Action" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="add_tag">Add Tag</SelectItem>
                                                    <SelectItem value="calculate_score">Assign AI Lead Score</SelectItem>
                                                    <SelectItem value="update_stage">Update Deal Stage</SelectItem>
                                                    <SelectItem value="assign_owner">Assign Owner</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        {selectedNode.data.actionType === 'add_tag' && (
                                            <div className="space-y-2">
                                                <Label>Tag Name</Label>
                                                <Input
                                                    placeholder="e.g. VIP, Hot Lead"
                                                    value={selectedNode.data.tag as string || ''}
                                                    onChange={(e) => updateNodeData(selectedNode.id, { tag: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        
                                        <div className="space-y-2">
                                            <Label>Step Label</Label>
                                            <Input
                                                placeholder="e.g. Mark as VIP"
                                                value={selectedNode.data.label as string || ''}
                                                onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <Button
                                    variant="destructive"
                                    className="w-full gap-2 mt-8"
                                    onClick={() => {
                                        setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
                                        setSelectedNodeId(null);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Node
                                </Button>
                            </div>
                        </div>
                    )}
                </aside>
            </div>

            <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col overflow-hidden bg-background text-foreground border border-white/10">
                    <DialogHeader>
                        <DialogTitle>Workflow Simulation (Test Run)</DialogTitle>
                        <DialogDescription>
                            Simulate the visual execution of your workflow nodes against a selected contact.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 flex-1 flex flex-col min-h-0">
                        <div className="space-y-2">
                            <Label>Select Test Contact</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={selectedContactId}
                                    onValueChange={setSelectedContactId}
                                    disabled={contactsLoading || testRunning}
                                >
                                    <SelectTrigger className="flex-1 bg-muted/20 border-white/5 h-10">
                                        <SelectValue placeholder="Choose a contact..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contacts.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.first_name} {c.last_name || ""} ({c.email || "no email"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button 
                                    className="bg-primary hover:bg-primary/95 text-white h-10 px-5 rounded-xl font-medium shrink-0 flex items-center justify-center gap-1.5"
                                    onClick={handleRunTest}
                                    disabled={testRunning || !selectedContactId}
                                >
                                    {testRunning ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Running...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            Run Simulation
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 border border-white/5 bg-muted/10 rounded-2xl overflow-hidden p-4">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block pl-1">Simulation Execution Logs</span>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs scrollbar-hide">
                                {testLogs.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-center p-8">
                                        Select a contact and click "Run Simulation" to see step-by-step traces here.
                                    </div>
                                ) : (
                                    testLogs.map((log, index) => {
                                        const isError = log.level === 'error';
                                        const isWarn = log.level === 'warn';
                                        return (
                                            <div 
                                                key={index}
                                                className={cn(
                                                    "p-2.5 rounded-xl border flex flex-col gap-1 text-left",
                                                    isError 
                                                        ? "bg-red-500/10 border-red-500/20 text-red-400" 
                                                        : isWarn 
                                                            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                                                            : "bg-background/40 border-white/5 text-foreground"
                                                )}
                                            >
                                                <div className="flex justify-between items-center gap-4 text-[10px] text-muted-foreground">
                                                    <span className="font-bold uppercase tracking-wider">{log.step}</span>
                                                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                </div>
                                                <span className="leading-relaxed whitespace-pre-wrap">{log.message}</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t border-white/5">
                        <Button
                            variant="outline"
                            onClick={() => setTestDialogOpen(false)}
                            className="rounded-xl"
                            disabled={testRunning}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function WorkflowBuilder(props: WorkflowBuilderProps) {
    return (
        <ReactFlowProvider>
            <BuilderInternal {...props} />
        </ReactFlowProvider>
    );
}
