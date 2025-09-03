"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { highlightPlugin } from "@react-pdf-viewer/highlight";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "@/components/ui/context-menu";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender, type ColumnDef, type SortingState, type ColumnSizingState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import type { RowSelectionState } from "@tanstack/react-table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, Info as InfoIcon, StickyNote, Tag, FileText, File as FileIcon } from "lucide-react";
import type { VisibilityState } from "@tanstack/react-table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type Collection = {
    id: string;
    name: string;
    count?: number;
    children?: Collection[];
};

const ALL_COLLECTIONS: Collection[] = [
    { id: "library", name: "Library", count: 124 },
    {
        id: "reading", name: "Reading", count: 17, children: [
            { id: "ml", name: "Machine Learning", count: 8 },
            { id: "nlp", name: "NLP", count: 9 },
        ]
    },
    { id: "trash", name: "Trash", count: 3 },
];

type ItemRow = {
    id: string;
    title: string;
    creators: string;           // first author for table
    authors?: string[];         // all authors for details
    year: string;
    type: string;
    tags: string[];
    collections: string[];

    publication?: string;       // journal/conference
    volume?: string;
    issue?: string;
    pages?: string;
    date?: string;              // formatted MM/YYYY or YYYY
    journalAbbr?: string;
    language?: string;
    doi?: string;
    issn?: string;              // comma-joined
    url?: string;
    pdfUrl?: string;            // direct pdf path or URL
    accessed?: string;          // ISO string
    libraryCatalog?: string;    // e.g. "DOI.org (Crossref)"
    abstract?: string;          // plain text
};

type PageTab = {
    id: string;
    title: string;
    kind: "library" | "pdf";
    pdfUrl?: string;
};

const LIBRARY_ROWS: ItemRow[] = [
    { id: "1", title: "Attention Is All You Need", creators: "Ashish Vaswani", authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit", "Llion Jones", "Aidan N. Gomez", "Łukasz Kaiser", "Illia Polosukhin"], year: "2017", type: "Journal Article", tags: ["transformers", "nlp"], collections: ["library", "reading", "ml"], publication: "NeurIPS", volume: "", issue: "", pages: "", date: "2017", journalAbbr: "NeurIPS", language: "en", doi: "", issn: "", url: "", accessed: "", libraryCatalog: "Sample", abstract: "" },
    { id: "2", title: "The Annotated Transformer", creators: "Alexander Rush", authors: ["Alexander Rush"], year: "2018", type: "Blog Post", tags: ["transformers"], collections: ["library", "reading", "nlp"], publication: "", volume: "", issue: "", pages: "", date: "2018", journalAbbr: "", language: "en", doi: "", issn: "", url: "", accessed: "", libraryCatalog: "Sample", abstract: "" },
    { id: "3", title: "Deep Residual Learning for Image Recognition", creators: "Kaiming He", authors: ["Kaiming He", "Xiangyu Zhang", "Shaoqing Ren", "Jian Sun"], year: "2016", type: "Conference Paper", tags: ["cv", "resnet"], collections: ["library"], publication: "CVPR", volume: "", issue: "", pages: "", date: "2016", journalAbbr: "CVPR", language: "en", doi: "", issn: "", url: "", accessed: "", libraryCatalog: "Sample", abstract: "" },
];

const columns: ColumnDef<ItemRow>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllRowsSelected()}
                onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(v) => row.toggleSelected(!!v)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 32,
    },
    { accessorKey: "title", header: "Title", size: 240, minSize: 100, enableSorting: false },
    { accessorKey: "creators", header: "Creators", size: 180, minSize: 80, enableSorting: false },
    { accessorKey: "year", header: "Year", size: 70, minSize: 50 },
    { accessorKey: "type", header: "Type", size: 140, minSize: 100 },
    { accessorKey: "tags", header: "Tags", size: 160, minSize: 80, enableSorting: false, cell: ({ getValue }) => (getValue<string[]>() ?? []).join(", ") },
];

function filterCollections(nodes: Collection[], q: string): Collection[] {
    if (!q.trim()) return nodes;
    const query = q.toLowerCase();

    const visit = (n: Collection): Collection | null => {
        const selfMatch = n.name.toLowerCase().includes(query);
        const children = n.children?.map(visit).filter(Boolean) as Collection[] | undefined;
        const hasChildMatch = !!children && children.length > 0;
        if (selfMatch || hasChildMatch) {
            return { ...n, children };
        }
        return null;
    };

    return nodes.map(visit).filter(Boolean) as Collection[];
}

function CollectionRow({
    node,
    depth,
    onSelect,
    selectedId,
    onAddSub,
    onRename,
    onDelete,
    onAddPaperHere,
    expandedIds,
    toggleExpand,
}: {
    node: Collection;
    depth: number;
    onSelect: (id: string) => void;
    selectedId?: string;
    onAddSub: (parentId: string, name: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string) => void;
    onAddPaperHere: (collectionId: string) => void;
    expandedIds: Set<string>;
    toggleExpand: (id: string) => void;
}) {
    const hasChildren = !!(node.children && node.children.length);
    const isExpanded = expandedIds.has(node.id);
    const isActive = node.id === selectedId;

    return (
        <div>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        onClick={() => onSelect(node.id)}
                        className={`flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-accent ${isActive ? "bg-accent/50" : ""}`}
                        style={{ paddingLeft: depth * 12 }}
                    >
                        <div className="flex items-center gap-1">
                            {hasChildren ? (
                                <button
                                    className="p-0.5 rounded hover:bg-muted"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpand(node.id);
                                    }}
                                    aria-label={isExpanded ? "Collapse" : "Expand"}
                                >
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                            ) : (
                                <span className="inline-block w-4" />
                            )}
                            <span className="truncate">{node.name}</span>
                        </div>
                        {typeof node.count === "number" ? <Badge variant="secondary">{node.count}</Badge> : null}
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem
                        onSelect={() => {
                            onAddPaperHere(node.id);
                        }}
                    >
                        Add paper here
                    </ContextMenuItem>
                    <ContextMenuItem
                        onSelect={() => {
                            const name = window.prompt("New subcollection name?");
                            if (name?.trim()) onAddSub(node.id, name.trim());
                        }}
                    >
                        New subcollection
                    </ContextMenuItem>
                    <ContextMenuItem
                        onSelect={() => {
                            const name = window.prompt("Rename collection", node.name);
                            if (name?.trim() && name.trim() !== node.name) onRename(node.id, name.trim());
                        }}
                    >
                        Rename
                    </ContextMenuItem>
                    <ContextMenuItem
                        onSelect={() => {
                            const ok = window.confirm(`Delete "${node.name}" and all its subcollections?`);
                            if (ok) onDelete(node.id);
                        }}
                    >
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            {isExpanded && node.children?.map((c) => (
                <CollectionRow
                    key={c.id}
                    node={c}
                    depth={depth + 1}
                    onSelect={onSelect}
                    selectedId={selectedId}
                    onAddSub={onAddSub}
                    onRename={onRename}
                    onDelete={onDelete}
                    onAddPaperHere={onAddPaperHere}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                />
            ))}
        </div>
    );
}

function InfoRow({
    label,
    value,
    editing,
    onChange,
    isLink = false,
    placeholder,
}: {
    label: string;
    value?: string;
    editing: boolean;
    onChange?: (v: string) => void;
    isLink?: boolean;
    placeholder?: string;
}) {
    return (
        <div className="grid grid-cols-[160px_1fr] items-start gap-x-3 gap-y-1">
            <div className="text-sm text-muted-foreground">{label}:</div>
            {editing && onChange ? (
                <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
            ) : isLink && value ? (
                <a className="text-sm underline" href={value} target="_blank" rel="noreferrer">{value}</a>
            ) : (
                <div className="text-sm">{value || "-"}</div>
            )}
        </div>
    );
}

export default function DocumentsPage() {
    const [q, setQ] = useState("");
    const [collections, setCollections] = useState<Collection[]>(ALL_COLLECTIONS);
    const filtered = useMemo(() => filterCollections(collections, q), [collections, q]);
    const [selectedId, setSelectedId] = useState<string | null>(LIBRARY_ROWS[0]?.id ?? null);
    const [rows, setRows] = useState<ItemRow[]>(LIBRARY_ROWS);
    const [pageTabs, setPageTabs] = useState<PageTab[]>([
        { id: "tab-1", title: "Library", kind: "library" },
    ]);
    const [activePageTab, setActivePageTab] = useState<string>("tab-1");

    const selected = useMemo(
        () => rows.find((r) => r.id === selectedId) ?? null,
        [rows, selectedId]
    );

    const [selectedCollectionId, setSelectedCollectionId] = useState<string>("library");
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["library"]));

    const [doiOpen, setDoiOpen] = useState(false);
    const [doi, setDoi] = useState("");
    const [doiLoading, setDoiLoading] = useState(false);
    const [doiError, setDoiError] = useState<string | null>(null);
    const [doiTargetCollectionId, setDoiTargetCollectionId] = useState<string>("library");
    const [newSubName, setNewSubName] = useState<string>("");
    const [bulkAddOpen, setBulkAddOpen] = useState(false);
    const [bulkTargetCollectionId, setBulkTargetCollectionId] = useState<string>("library");
    const [bulkNewSubName, setBulkNewSubName] = useState<string>("");

    const [editingInfo, setEditingInfo] = useState(false);

    const PdfViewer = useMemo(
        () => dynamic(async () => (await import("@react-pdf-viewer/core")).Viewer, { ssr: false }),
        []
    );
    const defaultLayout = defaultLayoutPlugin();
    const highlight = highlightPlugin();
    const workerUrl = useMemo(
        () => `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`,
        []
    );

    function openPdfTab(url: string, title?: string) {
        const id = `pdf-${Date.now()}`;
        const t: PageTab = { id, title: title || "PDF", kind: "pdf", pdfUrl: url };
        setPageTabs((prev) => [...prev, t]);
        setActivePageTab(id);
    }

    function closeTab(id: string) {
        setPageTabs((prev) => {
            const updated = prev.filter((t) => t.id !== id);
            if (activePageTab === id) {
                setActivePageTab(updated.length ? updated[updated.length - 1].id : "tab-1");
            }
            return updated;
        });
    }

    function toggleExpand(id: string) {
        setExpandedIds(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    }

    function addSubCollection(parentId: string, name: string) {
        setCollections(prev => {
            const add = (nodes: Collection[]): Collection[] =>
                nodes.map(n => {
                    if (n.id === parentId) {
                        const children = [...(n.children || []), { id: genId(), name, count: 0, children: [] }];
                        return { ...n, children };
                    }
                    if (n.children) return { ...n, children: add(n.children) };
                    return n;
                });
            return add(prev);
        });
        setExpandedIds(prev => {
            const s = new Set(prev);
            s.add(parentId);
            return s;
        });
    }
    function addSubCollectionWithId(parentId: string, child: Collection) {
        setCollections(prev => {
            const add = (nodes: Collection[]): Collection[] =>
                nodes.map(n => {
                    if (n.id === parentId) {
                        const children = [...(n.children || []), child];
                        return { ...n, children };
                    }
                    if (n.children) return { ...n, children: add(n.children) };
                    return n;
                });
            return add(prev);
        });
        setExpandedIds(prev => {
            const s = new Set(prev);
            s.add(parentId);
            return s;
        });
    }
    function genId() {
        return (typeof crypto !== "undefined" && "randomUUID" in crypto)
            ? crypto.randomUUID()
            : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function addRootCollection(name: string) {
        setCollections(prev => [...prev, { id: genId(), name, count: 0, children: [] }]);
    }

    function renameCollection(id: string, name: string) {
        setCollections(prev => {
            const rec = (nodes: Collection[]): Collection[] =>
                nodes.map(n =>
                    n.id === id
                        ? { ...n, name }
                        : { ...n, children: n.children ? rec(n.children) : undefined }
                );
            return rec(prev);
        });
    }

    function deleteCollection(id: string) {
        setCollections(prev => {
            const rec = (nodes: Collection[]): Collection[] =>
                nodes
                    .filter(n => n.id !== id)
                    .map(n => ({ ...n, children: n.children ? rec(n.children) : undefined }));
            return rec(prev);
        });
        setExpandedIds(prev => {
            const s = new Set(prev);
            s.delete(id);
            return s;
        });
        setSelectedCollectionId(prev => (prev === id ? "library" : prev));
    }

    function updateSelected<K extends keyof ItemRow>(key: K, val: ItemRow[K]) {
        setRows((prev) => prev.map((r) => (r.id === selectedId ? { ...r, [key]: val } : r)));
    }

    const tableRows = useMemo(() => {
        if (!selectedCollectionId || selectedCollectionId === "library") return rows;
        return rows.filter(r => r.collections.includes(selectedCollectionId));
    }, [rows, selectedCollectionId]);

    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

    const table = useReactTable({
        data: tableRows, // CHANGED
        columns,
        state: { sorting, globalFilter, rowSelection, columnVisibility, columnSizing },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onRowSelectionChange: setRowSelection,
        onColumnVisibilityChange: setColumnVisibility,
        onColumnSizingChange: setColumnSizing,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        enableRowSelection: true,
        columnResizeMode: "onChange",
    });

    async function handleAddDOI() {
        setDoiError(null);
        const val = doi.trim().replace(/^doi:/i, "");
        if (!val) { setDoiError("Enter a DOI"); return; }
        setDoiLoading(true);
        try {
            const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(val)}`);
            if (!res.ok) throw new Error("DOI not found");
            const { message } = await res.json();

            const title = message?.title?.[0] ?? val;

            // authors
            const authorsArr = (message?.author ?? [])
                .map((a: any) => [a.given, a.family].filter(Boolean).join(" "));
            const creators = authorsArr[0] ?? "";

            // date fields
            const dp: number[] = message?.issued?.["date-parts"]?.[0] ?? [];
            const year = String(dp?.[0] ?? "");
            const date =
                dp.length >= 2 ? `${String(dp[1]).padStart(2, "0")}/${dp[0]}` :
                    dp.length >= 1 ? `${dp[0]}` : "";

            // venue/journal
            const publication = message?.["container-title"]?.[0] ?? "";
            const journalAbbr = message?.["short-container-title"]?.[0] ?? "";

            // misc
            const volume = message?.volume ? String(message.volume) : "";
            const issue = message?.issue ? String(message.issue) : "";
            const pages = message?.page ?? "";
            const language = message?.language ?? "";
            const doiStr = message?.DOI ?? "";
            const issn = Array.isArray(message?.ISSN) ? message.ISSN.join(", ") : "";
            const url = message?.URL ?? "";
            const accessed = new Date().toISOString();
            const libraryCatalog = "DOI.org (Crossref)";
            const abstract = (message?.abstract ?? "").replace(/<[^>]+>/g, "").trim();

            const newItem: ItemRow = {
                id: (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `id-${Date.now()}`,
                title,
                creators,
                authors: authorsArr,
                year,
                type: String((message?.type ?? "article-journal")).replace(/[-_]/g, " "),
                tags: [],
                collections: (() => {
                    let targetId = doiTargetCollectionId || "library";
                    const sub = newSubName.trim();
                    if (sub) {
                        const childId = genId();
                        addSubCollectionWithId(targetId, { id: childId, name: sub, count: 0, children: [] });
                        targetId = childId;
                    }
                    return ["library", ...(targetId !== "library" ? [targetId] : [])];
                })(),

                publication,
                volume,
                issue,
                pages,
                date,
                journalAbbr,
                language,
                doi: doiStr,
                issn,
                url,
                accessed,
                libraryCatalog,
                abstract,
            };
            setRows((prev) => [newItem, ...prev]);
            setSelectedId(newItem.id);
            setDoiOpen(false);
            setDoi("");
            setNewSubName("");
        } catch (e: any) {
            setDoiError(e?.message || "Failed to fetch DOI");
        } finally {
            setDoiLoading(false);
        }
    }
    function flattenCollections(nodes: Collection[], depth = 0): { id: string; label: string }[] {
        const pad = (n: number) => (n > 0 ? `${"\u00A0".repeat(n * 2)}› ` : "");
        const out: { id: string; label: string }[] = [];
        for (const n of nodes) {
            out.push({ id: n.id, label: `${pad(depth)}${n.name}` });
            if (n.children && n.children.length) {
                out.push(...flattenCollections(n.children, depth + 1));
            }
        }
        return out;
    }

    function applyBulkAddToCollection() {
        let targetId = bulkTargetCollectionId || "library";
        const sub = bulkNewSubName.trim();
        if (sub) {
            const childId = genId();
            addSubCollectionWithId(targetId, { id: childId, name: sub, count: 0, children: [] });
            targetId = childId;
        }
        const selectedIds = new Set(table.getSelectedRowModel().rows.map((r) => r.original.id));
        setRows((prev) => prev.map((r) => {
            if (!selectedIds.has(r.id)) return r;
            const nextCollections = Array.from(new Set([...(r.collections || []), "library", ...(targetId !== "library" ? [targetId] : [])]));
            return { ...r, collections: nextCollections };
        }));
        setBulkAddOpen(false);
        setBulkNewSubName("");
    }

    return (
        <div className="h-screen w-full">
            <Tabs value={activePageTab} onValueChange={setActivePageTab} className="flex h-full flex-col">
                <div className="border-b px-3 py-2">
                    <TabsList>
                        {pageTabs.map((t) => (
                            <TabsTrigger key={t.id} value={t.id} className="px-2">
                                <span className="mr-2 truncate max-w-[14rem] inline-block align-middle">{t.title}</span>
                                {t.kind === "pdf" ? (
                                    <button
                                        className="ml-1 inline-flex items-center justify-center rounded px-1 text-xs hover:bg-accent"
                                        title="Close"
                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeTab(t.id); }}
                                    >
                                        ×
                                    </button>
                                ) : null}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                {pageTabs.map((t) => (
                    <TabsContent key={t.id} value={t.id} forceMount className="flex-1 min-h-0 p-0">
                        <div className="h-full w-full">
                            {t.kind === "library" ? (
                                <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                                    <ResizablePanel defaultSize={20} minSize={15}>
                                        <div className="flex h-full flex-col overflow-hidden">
                                            <div className="p-3">
                                                <Input
                                                    placeholder="Filter collections"
                                                    value={q}
                                                    onChange={(e) => setQ(e.target.value)}

                                                />
                                            </div>
                                            <Separator />
                                            <ScrollArea className="flex-1 p-2" rootClassName="h-full" hideScrollbar>
                                                <Accordion type="multiple" defaultValue={["collections"]} className="w-full">
                                                    <AccordionItem value="collections">
                                                        <AccordionTrigger>Collections</AccordionTrigger>
                                                        <AccordionContent>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        const name = window.prompt("New collection name?");
                                                                        if (name?.trim()) addRootCollection(name.trim());
                                                                    }}
                                                                >
                                                                    New collection
                                                                </Button>
                                                                <Input
                                                                    placeholder="Filter collections"
                                                                    value={q}
                                                                    onChange={(e) => setQ(e.target.value)}
                                                                    className="h-8"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                {filtered.map((node) => (
                                                                    <CollectionRow
                                                                        key={node.id}
                                                                        node={node}
                                                                        depth={0}
                                                                        onSelect={setSelectedCollectionId}
                                                                        selectedId={selectedCollectionId}
                                                                        onAddSub={addSubCollection}
                                                                        onRename={renameCollection}
                                                                        onDelete={deleteCollection}
                                                                        onAddPaperHere={(id) => { setDoiTargetCollectionId(id); setNewSubName(""); setDoiOpen(true); }}
                                                                        expandedIds={expandedIds}
                                                                        toggleExpand={toggleExpand}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                </Accordion>
                                            </ScrollArea>
                                        </div>
                                    </ResizablePanel>

                                    <ResizableHandle withHandle />

                                    <ResizablePanel defaultSize={45} minSize={30}>
                                        <div className="flex h-full flex-col overflow-hidden">
                                            <div className="flex items-center gap-2 p-3">
                                                <Input
                                                    placeholder="Search library"
                                                    className="md:w-96"
                                                    value={globalFilter}
                                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                                />
                                                <div className="ml-auto flex items-center gap-2">
                                                    <Button size="sm" variant="outline">New</Button>
                                                    <Button size="sm">Import</Button>

                                                    <Dialog open={doiOpen} onOpenChange={setDoiOpen}>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" variant="outline" className="neon-border bg-background/70 backdrop-blur-sm rounded-sm px-3">
                                                                Add via DOI
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="bg-background/80 backdrop-blur-sm shadow-xl">
                                                            <DialogHeader>
                                                                <DialogTitle>Add paper via DOI</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="space-y-2">
                                                                <Input
                                                                    placeholder="10.1145/3377811.3380362"
                                                                    value={doi}
                                                                    onChange={(e) => setDoi(e.target.value)}
                                                                />
                                                                {doiError ? <div className="text-sm text-destructive">{doiError}</div> : null}
                                                                <div className="pt-2 space-y-2">
                                                                    <div className="text-xs text-muted-foreground">Add to collection</div>
                                                                    <Select value={doiTargetCollectionId} onValueChange={setDoiTargetCollectionId}>
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue placeholder="Select collection" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="max-h-64 overflow-auto">
                                                                            {flattenCollections(collections).map((c) => (
                                                                                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Input
                                                                        placeholder="New subcollection name (optional)"
                                                                        value={newSubName}
                                                                        onChange={(e) => setNewSubName(e.target.value)}
                                                                        className="h-8"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button variant="outline" onClick={() => setDoiOpen(false)} disabled={doiLoading}>Cancel</Button>
                                                                <Button onClick={handleAddDOI} disabled={doiLoading}>
                                                                    {doiLoading ? "Adding..." : "Add"}
                                                                </Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </div>
                                            <Separator />
                                            <ScrollArea className="flex-1" rootClassName="h-full">
                                                <div className="p-3">
                                                    {table.getSelectedRowModel().rows.length > 0 && (
                                                        <div className="px-3 py-2 text-sm flex items-center gap-2 flex-wrap">
                                                            <span>{table.getSelectedRowModel().rows.length} selected</span>
                                                            <Button size="sm" variant="outline">Delete</Button>
                                                            <Button size="sm" onClick={() => { setBulkTargetCollectionId("library"); setBulkNewSubName(""); setBulkAddOpen(true); }}>Add to Collection</Button>
                                                        </div>
                                                    )}
                                                    <Table className="table-fixed w-full">
                                                        <TableHeader>
                                                            {table.getHeaderGroups().map((hg) => (
                                                                <TableRow key={hg.id}>
                                                                    {hg.headers.map((header) => (
                                                                        <TableHead
                                                                            key={header.id}
                                                                            onClick={header.column.getToggleSortingHandler()}
                                                                            className="select-none cursor-pointer relative"
                                                                            title="Click to sort"
                                                                            style={{ width: header.getSize() }}
                                                                        >
                                                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                                                            {header.column.getIsSorted() === "asc" ? " ▲" : header.column.getIsSorted() === "desc" ? " ▼" : ""}
                                                                            {header.column.getCanResize() && (
                                                                                <div
                                                                                    onMouseDown={header.getResizeHandler()}
                                                                                    onTouchStart={header.getResizeHandler()}
                                                                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-transparent hover:bg-foreground/20"
                                                                                />
                                                                            )}
                                                                        </TableHead>
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                        </TableHeader>
                                                        <TableBody>
                                                            {table.getRowModel().rows.map((row) => {
                                                                const isSelected = row.original.id === selectedId;
                                                                const effectivePdf = (row.original.pdfUrl && row.original.pdfUrl.trim()) || (row.original.url && /\.pdf(\?|#|$)/i.test(row.original.url) ? row.original.url : "");
                                                                return (
                                                                    <TableRow
                                                                        key={row.id}
                                                                        onClick={() => setSelectedId(row.original.id)}
                                                                        className={cn("cursor-pointer hover:bg-accent", isSelected && "bg-accent/50")}
                                                                        aria-selected={isSelected}
                                                                    >
                                                                        {row.getVisibleCells().map((cell) => {
                                                                            const isTitleCell = cell.column.id === "title";
                                                                            return (
                                                                                <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                                                                                    <div className="truncate flex items-center gap-2">
                                                                                        <span className="truncate">{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                                                                                        {isTitleCell && effectivePdf ? (
                                                                                            <button
                                                                                                className="shrink-0 inline-flex items-center rounded px-1 py-0.5 text-xs hover:bg-accent"
                                                                                                title="Open PDF in new tab"
                                                                                                onClick={(e) => { e.stopPropagation(); openPdfTab(effectivePdf!, row.original.title); }}
                                                                                            >
                                                                                                <FileIcon className="h-3.5 w-3.5 text-red-500" />
                                                                                            </button>
                                                                                        ) : null}
                                                                                    </div>
                                                                                </TableCell>
                                                                            );
                                                                        })}
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                Columns <ChevronDown className="ml-1 h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-44">
                                                            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                                                            {table.getAllLeafColumns()
                                                                .filter((col) => col.getCanHide?.())
                                                                .map((col) => (
                                                                    <DropdownMenuCheckboxItem
                                                                        key={col.id}
                                                                        checked={col.getIsVisible()}
                                                                        onCheckedChange={(v) => col.toggleVisibility(!!v)}
                                                                    >
                                                                        {String(col.columnDef.header)}
                                                                    </DropdownMenuCheckboxItem>
                                                                ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </ScrollArea>
                                            <Dialog open={bulkAddOpen} onOpenChange={setBulkAddOpen}>
                                                <DialogContent className="bg-background/80 backdrop-blur-sm shadow-xl">
                                                    <DialogHeader>
                                                        <DialogTitle>Add selected to collection</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-2">
                                                        <div className="text-xs text-muted-foreground">Target collection</div>
                                                        <Select value={bulkTargetCollectionId} onValueChange={setBulkTargetCollectionId}>
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue placeholder="Select collection" />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-64 overflow-auto">
                                                                {flattenCollections(collections).map((c) => (
                                                                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Input
                                                            placeholder="New subcollection name (optional)"
                                                            value={bulkNewSubName}
                                                            onChange={(e) => setBulkNewSubName(e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <DialogFooter>
                                                        <Button variant="outline" onClick={() => setBulkAddOpen(false)}>Cancel</Button>
                                                        <Button onClick={applyBulkAddToCollection}>Add</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </ResizablePanel>

                                    <ResizableHandle withHandle />

                                    <ResizablePanel defaultSize={35} minSize={25}>
                                        <div className="flex h-full flex-col overflow-hidden">
                                            <div className="p-3 font-medium">Details</div>
                                            <Separator />
                                            <div className="flex-1 p-3 min-h-0 overflow-hidden">
                                                {selected ? (
                                                    <Tabs defaultValue="info" className="flex h-full min-h-0 flex-col">
                                                        <TabsList>
                                                            <TabsTrigger value="info" className="gap-2">
                                                                <InfoIcon className="h-4 w-4 text-sky-500" />
                                                                <span>Info</span>
                                                            </TabsTrigger>
                                                            <TabsTrigger value="notes" className="gap-2">
                                                                <StickyNote className="h-4 w-4 text-amber-500" />
                                                                <span>Notes</span>
                                                            </TabsTrigger>
                                                            <TabsTrigger value="tags" className="gap-2">
                                                                <Tag className="h-4 w-4 text-emerald-500" />
                                                                <span>Tags</span>
                                                            </TabsTrigger>
                                                            <TabsTrigger value="abstract" className="gap-2">
                                                                <FileIcon className="h-4 w-4 text-violet-500" />
                                                                <span>Abstract</span>
                                                            </TabsTrigger>
                                                        </TabsList>

                                                        <div className="mt-3 flex-1 min-h-0">
                                                            <TabsContent value="info" className="h-full p-2">
                                                                <div className="h-full overflow-y-auto no-scrollbar scroll-container">
                                                                    <div className="mb-2 flex items-center justify-between">
                                                                        <div className="text-sm font-medium">Info</div>
                                                                        <Button size="sm" variant="outline" onClick={() => setEditingInfo((v) => !v)}>
                                                                            {editingInfo ? "Done" : "Edit"}
                                                                        </Button>
                                                                    </div>

                                                                    <div className="space-y-2">
                                                                        <InfoRow label="Item Type" value={selected.type} editing={editingInfo} onChange={(v) => updateSelected("type", v)} />
                                                                        <InfoRow label="Title" value={selected.title} editing={editingInfo} onChange={(v) => updateSelected("title", v)} />
                                                                        {/* First author for creators (table field) */}
                                                                        <InfoRow label="Creator" value={selected.creators} editing={editingInfo} onChange={(v) => updateSelected("creators", v)} />

                                                                        {/* All authors listed (read-only here). Make editable later if you want */}
                                                                        {selected.authors?.map((a, i) => (
                                                                            <div key={i} className="grid grid-cols-[160px_1fr] items-start gap-x-3">
                                                                                <div className="text-sm text-muted-foreground">Author:</div>
                                                                                <div className="text-sm">{a}</div>
                                                                            </div>
                                                                        ))}

                                                                        <InfoRow label="Publication" value={selected.publication} editing={editingInfo} onChange={(v) => updateSelected("publication", v)} />
                                                                        <InfoRow label="Volume" value={selected.volume} editing={editingInfo} onChange={(v) => updateSelected("volume", v)} />
                                                                        <InfoRow label="Issue" value={selected.issue} editing={editingInfo} onChange={(v) => updateSelected("issue", v)} />
                                                                        <InfoRow label="Pages" value={selected.pages} editing={editingInfo} onChange={(v) => updateSelected("pages", v)} />
                                                                        <InfoRow label="Date" value={selected.date} editing={editingInfo} onChange={(v) => updateSelected("date", v)} />
                                                                        <InfoRow label="Journal Abbr" value={selected.journalAbbr} editing={editingInfo} onChange={(v) => updateSelected("journalAbbr", v)} />
                                                                        <InfoRow label="Language" value={selected.language} editing={editingInfo} onChange={(v) => updateSelected("language", v)} />
                                                                        <InfoRow label="DOI" value={selected.doi} editing={editingInfo} onChange={(v) => updateSelected("doi", v)} />
                                                                        <InfoRow label="ISSN" value={selected.issn} editing={editingInfo} onChange={(v) => updateSelected("issn", v)} />
                                                                        <InfoRow label="URL" value={selected.url} editing={editingInfo} onChange={(v) => updateSelected("url", v)} isLink />
                                                                        <div className="grid grid-cols-[160px_1fr] items-start gap-x-3 gap-y-1">
                                                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                                                <span>PDF URL</span>
                                                                                {selected.pdfUrl ? (
                                                                                    <button
                                                                                        className="inline-flex items-center rounded px-1 py-0.5 text-xs border hover:bg-accent"
                                                                                        title="Open PDF in new tab"
                                                                                        onClick={() => openPdfTab(selected.pdfUrl!, selected.title)}
                                                                                    >
                                                                                        Open
                                                                                    </button>
                                                                                ) : null}
                                                                            </div>
                                                                            {editingInfo ? (
                                                                                <Input value={selected.pdfUrl ?? ""} onChange={(e) => updateSelected("pdfUrl", e.target.value)} placeholder="/sample.pdf or https://.../paper.pdf" />
                                                                            ) : (
                                                                                <div className="text-sm">{selected.pdfUrl ? <a className="underline" href={selected.pdfUrl} target="_blank" rel="noreferrer">{selected.pdfUrl}</a> : "-"}</div>
                                                                            )}
                                                                        </div>
                                                                        <InfoRow label="Accessed" value={selected.accessed ? new Date(selected.accessed).toLocaleString() : ""} editing={false} />
                                                                        <InfoRow label="Library Catalog" value={selected.libraryCatalog} editing={editingInfo} onChange={(v) => updateSelected("libraryCatalog", v)} />
                                                                    </div>
                                                                </div>
                                                            </TabsContent>

                                                            <TabsContent value="notes" className="h-full">
                                                                <div className="h-full overflow-y-auto no-scrollbar scroll-container">
                                                                    <Textarea placeholder="Add notes..." rows={10} />
                                                                </div>
                                                            </TabsContent>

                                                            <TabsContent value="abstract" className="h-full">
                                                                <div className="h-full overflow-y-auto no-scrollbar scroll-container">
                                                                    {selected.abstract ? (
                                                                        <div className="space-y-2 text-sm">
                                                                            <div className="font-medium">Abstract</div>
                                                                            <div className="whitespace-pre-wrap text-muted-foreground">{selected.abstract}</div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-sm text-muted-foreground">No abstract available</div>
                                                                    )}
                                                                </div>
                                                            </TabsContent>
                                                        </div>
                                                    </Tabs>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground">Select an item to view details</div>
                                                )}
                                            </div>
                                        </div>
                                    </ResizablePanel>
                                </ResizablePanelGroup>
                            ) : null}
                            {t.kind === "pdf" ? (
                                <div className="h-full w-full p-0">
                                    <div className="h-full">
                                        {t.pdfUrl ? (
                                            <Worker workerUrl={workerUrl}>
                                                <PdfViewer fileUrl={t.pdfUrl} plugins={[defaultLayout, highlight]} />
                                            </Worker>
                                        ) : (
                                            <div className="p-4 text-sm text-muted-foreground">No PDF URL</div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
