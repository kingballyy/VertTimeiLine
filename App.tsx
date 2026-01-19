import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Header from './components/Header';
import Timeline from './components/Timeline';
import EventModal from './components/EventModal';
import { TimelineData, TimelineEvent } from './types';
import { EMPTY_DATA } from './constants';
import { downloadJson } from './utils/fileHelpers';

const App: React.FC = () => {
  const [data, setData] = useState<TimelineData>(EMPTY_DATA);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Helper: Collect all IDs recursively that have children
  const getAllExpandableIds = (nodes: TimelineEvent[]): string[] => {
    let ids: string[] = [];
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        ids = ids.concat(getAllExpandableIds(node.children));
      }
    });
    return ids;
  };

  // Helper: Set expanded state for root items
  const getRootExpandedIds = (events: TimelineEvent[]): Set<string> => {
     const initial = new Set<string>();
     events.forEach(e => {
       if (e.children && e.children.length > 0) initial.add(e.id);
     });
     return initial;
  };

  // Load Data on Mount
  useEffect(() => {
    const initData = async () => {
      // 1. Try Local Storage
      const saved = localStorage.getItem('vertiline_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setData(parsed);
          setExpandedIds(getRootExpandedIds(parsed.events || []));
          return;
        } catch (e) {
          console.error("Failed to load local storage data", e);
        }
      }

      // 2. Fetch Default Data
      try {
        const response = await fetch('/DefaultData.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const json = await response.json();
        setData(json);
        setExpandedIds(getRootExpandedIds(json.events || []));
      } catch (error) {
        console.error("Failed to load default data", error);
      }
    };

    initData();
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    // Only save if we have data (avoid overwriting with empty state on initial load race condition)
    if (data.events.length > 0) {
       localStorage.setItem('vertiline_data', JSON.stringify(data));
    }
  }, [data]);

  // Handlers
  const handleExport = () => {
    const filename = `vertiline-backup-${new Date().toISOString().split('T')[0]}.json`;
    downloadJson(data, filename);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.events && Array.isArray(json.events)) {
          setData(json);
          // Reset expansion on import
          setExpandedIds(getRootExpandedIds(json.events));
          alert('Timeline imported successfully!');
        } else {
          alert('Invalid JSON file format.');
        }
      } catch (error) {
        alert('Error parsing JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (confirm('确定要清空整个时间轴吗？此操作不可撤销（建议先导出备份）。')) {
      setData(prev => ({ ...prev, events: [] }));
      setExpandedIds(new Set());
    }
  };

  const handleExpandAll = () => {
    setExpandedIds(new Set(getAllExpandableIds(data.events)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Recursive delete function
  const deleteEventRecursive = (events: TimelineEvent[], targetId: string): TimelineEvent[] => {
    return events
      .filter(event => event.id !== targetId)
      .map(event => ({
        ...event,
        children: event.children ? deleteEventRecursive(event.children, targetId) : []
      }));
  };

  const handleDeleteEvent = (id: string) => {
    setData(prev => ({
      ...prev,
      events: deleteEventRecursive(prev.events, id)
    }));
  };

  // Recursive update/insert function
  const updateEventRecursive = (
    events: TimelineEvent[], 
    savedEvent: TimelineEvent, 
    targetParentId: string | null
  ): TimelineEvent[] => {
    // 1. If we are editing an existing event (ID matches)
    const existingIndex = events.findIndex(e => e.id === savedEvent.id);
    if (existingIndex !== -1) {
      const newEvents = [...events];
      newEvents[existingIndex] = {
        ...savedEvent,
        children: events[existingIndex].children
      };
      return newEvents;
    }

    // 2. Insert into children
    return events.map(event => {
      if (event.id === targetParentId) {
        // Expand the parent when adding a child so user sees it
        setExpandedIds(prev => {
          const next = new Set(prev);
          next.add(event.id);
          return next;
        });
        return {
          ...event,
          children: [...(event.children || []), savedEvent]
        };
      }
      if (event.children) {
        return {
          ...event,
          children: updateEventRecursive(event.children, savedEvent, targetParentId)
        };
      }
      return event;
    });
  };

  const handleSaveEvent = (event: TimelineEvent) => {
    setData(prev => {
      const isRootAdd = !targetParentId && !prev.events.some(e => e.id === event.id);
      
      if (isRootAdd) {
        return { ...prev, events: [...prev.events, event] };
      }
      
      return {
        ...prev,
        events: updateEventRecursive(prev.events, event, targetParentId)
      };
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
    setTargetParentId(null);
    setIsModalOpen(true);
  };

  const handleInsertRequest = (date: string) => {
    setEditingEvent(null);
    setCreateDate(date);
    setTargetParentId(null);
    setIsModalOpen(true);
  }

  const handleAddChildRequest = (parentId: string) => {
    setEditingEvent(null);
    setCreateDate(null);
    setTargetParentId(parentId);
    setIsModalOpen(true);
  };

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
      />
    </div>
  );
};

export default App;