import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Header from './components/Header';
import Timeline from './components/Timeline';
import EventModal from './components/EventModal';
import { TimelineData, TimelineEvent } from './types';
import { INITIAL_DATA } from './initialData';
import { downloadJson } from './utils/fileHelpers';

const App: React.FC = () => {
  // Helper: Get initial data with safe fallback
  const getInitialData = (): TimelineData => {
    const saved = localStorage.getItem('vertiline_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse local storage data", e);
      }
    }
    return INITIAL_DATA;
  };

  // Helper: Find parent ID of a specific event ID
  const findParentId = (events: TimelineEvent[], targetId: string): string | null => {
    for (const event of events) {
      if (event.children && event.children.some(child => child.id === targetId)) {
        return event.id;
      }
      if (event.children) {
        const found = findParentId(event.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper: Flatten events for the search dropdown
  const flattenEvents = (events: TimelineEvent[]): { id: string, title: string }[] => {
    let result: { id: string, title: string }[] = [];
    events.forEach(event => {
      result.push({ id: event.id, title: event.title });
      if (event.children) {
        result = result.concat(flattenEvents(event.children));
      }
    });
    return result;
  };

  // Helper: Check if an event ID exists in the tree
  const findEvent = (events: TimelineEvent[], id: string): boolean => {
    return events.some(e => e.id === id || (e.children && findEvent(e.children, id)));
  };

  // Initialize state
  const [data, setData] = useState<TimelineData>(getInitialData);
  
  // Initialize expansion state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const recurse = (nodes: TimelineEvent[]) => {
      nodes.forEach(e => {
        if (e.children && e.children.length > 0) initial.add(e.id);
      });
    }
    recurse(getInitialData().events);
    return initial;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [createDate, setCreateDate] = useState<string | null>(null);
  // targetParentId is used as the "Initial" parent when opening the modal
  const [targetParentId, setTargetParentId] = useState<string | null>(null);

  useEffect(() => {
    if (data.events.length > 0) {
       localStorage.setItem('vertiline_data', JSON.stringify(data));
    }
  }, [data]);

  // --- Recursive Data Operations ---

  // 1. Delete an event by ID from the tree
  const deleteEventRecursive = (events: TimelineEvent[], targetId: string): TimelineEvent[] => {
    return events
      .filter(event => event.id !== targetId)
      .map(event => ({
        ...event,
        children: event.children ? deleteEventRecursive(event.children, targetId) : []
      }));
  };

  // 2. Insert an event into a specific parent ID (or root if parentId is null)
  const insertEventRecursive = (events: TimelineEvent[], newEvent: TimelineEvent, parentId: string | null): TimelineEvent[] => {
    if (!parentId) {
      // Insert at root
      return [...events, newEvent];
    }
    
    return events.map(event => {
      if (event.id === parentId) {
        return {
          ...event,
          children: [...(event.children || []), newEvent]
        };
      }
      if (event.children) {
        return {
          ...event,
          children: insertEventRecursive(event.children, newEvent, parentId)
        };
      }
      return event;
    });
  };

  // 3. Update an event in place (without moving it)
  const updateEventDataRecursive = (events: TimelineEvent[], updatedEvent: TimelineEvent): TimelineEvent[] => {
    return events.map(event => {
      if (event.id === updatedEvent.id) {
        // Keep existing children, only update data fields
        return {
          ...updatedEvent,
          children: event.children 
        };
      }
      if (event.children) {
        return {
          ...event,
          children: updateEventDataRecursive(event.children, updatedEvent)
        };
      }
      return event;
    });
  };

  // --- Handlers ---

  const handleDeleteEvent = (id: string) => {
    setData(prev => ({
      ...prev,
      events: deleteEventRecursive(prev.events, id)
    }));
  };

  const handleSaveEvent = (event: TimelineEvent, selectedParentId: string | null) => {
    setData(prev => {
      const isExisting = findEvent(prev.events, event.id);

      if (isExisting) {
        // --- EDIT MODE ---
        const currentParentId = findParentId(prev.events, event.id);
        
        // Case A: Parent didn't change -> Simple Update
        if (currentParentId === selectedParentId) {
          return {
            ...prev,
            events: updateEventDataRecursive(prev.events, event)
          };
        } 
        
        // Case B: Parent Changed -> Move (Delete then Insert)
        let preservedChildren: TimelineEvent[] = [];
        const findChildren = (nodes: TimelineEvent[]) => {
           for(const n of nodes) {
             if(n.id === event.id) {
               preservedChildren = n.children || [];
               return;
             }
             if(n.children) findChildren(n.children);
           }
        }
        findChildren(prev.events);
        
        const eventToInsert = { ...event, children: preservedChildren };
        const dataAfterDelete = deleteEventRecursive(prev.events, event.id);
        
        // Expand the new parent so user sees the moved event
        if (selectedParentId) {
            setExpandedIds(s => new Set(s).add(selectedParentId));
        }

        return {
          ...prev,
          events: insertEventRecursive(dataAfterDelete, eventToInsert, selectedParentId)
        };

      } else {
        // --- CREATE MODE ---
        // Expand the parent so user sees the new event
        if (selectedParentId) {
            setExpandedIds(s => new Set(s).add(selectedParentId));
        }
        return {
          ...prev,
          events: insertEventRecursive(prev.events, event, selectedParentId)
        };
      }
    });
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setCreateDate(null);
    setTargetParentId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event: TimelineEvent) => {
    setEditingEvent(event);
    setCreateDate(null);
    // Find current parent to pre-fill the modal
    const parentId = findParentId(data.events, event.id);
    setTargetParentId(parentId);
    setIsModalOpen(true);
  };

  // Updated to support parentId
  const handleInsertRequest = (date: string, parentId?: string | null) => {
    setEditingEvent(null);
    setCreateDate(date);
    setTargetParentId(parentId || null); 
    setIsModalOpen(true);
  }

  const handleAddChildRequest = (parentId: string) => {
    setEditingEvent(null);
    setCreateDate(null);
    setTargetParentId(parentId);
    setIsModalOpen(true);
  };

  // Misc handlers
  const handleExport = () => downloadJson(data, `vertiline-${new Date().toISOString().slice(0,10)}.json`);
  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.events) setData(json);
      } catch (e) { alert('Import failed'); }
    };
    reader.readAsText(file);
  };
  const handleClear = () => { if(confirm('Clear all?')) setData(prev => ({...prev, events: []})); };
  const getAllExpandableIds = (nodes: TimelineEvent[]): string[] => {
    let ids: string[] = [];
    nodes.forEach(node => {
      if (node.children?.length) { ids.push(node.id); ids = ids.concat(getAllExpandableIds(node.children)); }
    });
    return ids;
  };
  const handleExpandAll = () => setExpandedIds(new Set(getAllExpandableIds(data.events)));
  const handleCollapseAll = () => setExpandedIds(new Set());
  const handleToggleExpand = (id: string) => setExpandedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
      <Header 
        onExport={handleExport} 
        onImport={handleImport}
        onClear={handleClear}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
      />

      <main className="flex-1 container mx-auto px-4 pb-24">
        <div className="mt-8 mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-2">
            中华上下五千年
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto">
             Create, visualize, and share your timeline events with ease.
          </p>
        </div>

        <Timeline 
          events={data.events} 
          onEdit={openEditModal} 
          onDelete={handleDeleteEvent}
          onInsertRequest={handleInsertRequest}
          onAddChild={handleAddChildRequest}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
        />
      </main>

      <button
        onClick={openCreateModal}
        className="fixed bottom-8 right-8 p-4 bg-primary text-white rounded-full shadow-lg shadow-blue-500/40 hover:bg-blue-600 hover:scale-110 active:scale-95 transition-all z-30"
        aria-label="Add Event"
      >
        <Plus className="w-8 h-8" />
      </button>

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        initialData={editingEvent}
        defaultDate={createDate}
        availableParents={flattenEvents(data.events)}
        initialParentId={targetParentId}
      />
    </div>
  );
};

export default App;