import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { TimelineEvent } from '../types';
import { Edit2, Tag, Trash2, ChevronDown, ChevronRight, Plus } from 'lucide-react';

interface TimelineProps {
  events: TimelineEvent[];
  onEdit: (event: TimelineEvent) => void;
  onDelete: (id: string) => void;
  onInsertRequest: (date: string) => void;
  onAddChild: (parentId: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}

// Helper to format date
const formatDate = (dateString: string) => {
  try {
    const isBC = dateString.startsWith('-');
    const cleanDate = dateString.replace(/^-/, '');
    const [yearStr, monthStr, dayStr] = cleanDate.split('-');
    
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    const prefix = isBC ? '前' : '';
    
    // Heuristic: If month is 1 and day is 1, treat as Year precision only
    if (month === 1 && day === 1) {
      return `${prefix}${year}年`;
    }
    
    return `${prefix}${year}年${month}月${day}日`;
  } catch (e) {
    return dateString;
  }
};

const TimelineNode: React.FC<{
  event: TimelineEvent;
  level: number;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (id: string) => void;
  onAddChild: (id: string) => void;
}> = ({ event, level, expandedIds, toggleExpand, onEdit, onDelete, onAddChild }) => {
  
  const hasChildren = event.children && event.children.length > 0;
  const isExpanded = expandedIds.has(event.id);
  
  // Sort children if they exist
  const sortedChildren = hasChildren 
    ? [...(event.children || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) 
    : [];

  return (
    <div className="relative mb-4 md:mb-6">
      {/* Connector Line to Children */}
      {hasChildren && isExpanded && (
        <div 
          // Calculated to align with the center of the dot in the left column
          // Mobile: w-6 (24px) -> center 12px -> 0.75rem approx left-[11px]
          // Desktop: w-10 (40px) -> center 20px -> 1.25rem approx left-[19px]
          className="absolute border-l-2 border-dashed border-slate-300 top-8 bottom-0 md:top-10 left-[11px] md:left-[19px]"
        ></div>
      )}

      <div className="flex gap-2 md:gap-4 group">
        
        {/* Left Column: Marker & Toggler */}
        <div className="flex flex-col items-center flex-shrink-0 w-6 md:w-10 pt-1 relative z-10">
           {/* The Dot */}
           <div 
            className={`
              rounded-full border-2 shadow-sm transition-colors cursor-pointer flex items-center justify-center
              w-3 h-3 md:w-4 md:h-4
              ${hasChildren ? 'bg-white border-primary' : 'bg-primary border-white'}
            `}
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpand(event.id);
            }}
          >
            {hasChildren && (
              <div className="text-[8px] md:text-[10px] text-primary font-bold flex items-center justify-center">
                 {isExpanded ? <ChevronDown className="w-2 h-2 md:w-3 md:h-3"/> : <ChevronRight className="w-2 h-2 md:w-3 md:h-3 pl-px"/>}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Card Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
             <span className="text-xs md:text-sm font-mono font-bold text-primary bg-blue-50 px-1.5 py-0.5 md:px-2 rounded">
               {formatDate(event.date)}
             </span>
             {level > 0 && (
                <span className="text-[10px] md:text-xs text-slate-400 font-medium border border-slate-200 px-1 rounded">
                  子事件
                </span>
             )}
          </div>

          <div 
            onClick={() => onEdit(event)}
            className={`
              relative bg-white rounded-lg border border-slate-200 p-3 md:p-4 shadow-sm 
              hover:shadow-md hover:border-blue-300 transition-all cursor-pointer
              group-hover:ring-1 ring-primary/10
            `}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-base md:text-lg font-bold text-slate-800 mb-1 md:mb-2 truncate pr-16">{event.title}</h3>
              
              {/* Action Buttons (Visible on Hover) */}
              <div className="absolute top-2 right-2 md:top-3 md:right-3 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-lg p-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddChild(event.id); }}
                  className="p-1 md:p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"
                  title="添加子事件"
                >
                  <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                  className="p-1 md:p-1.5 text-slate-400 hover:text-primary hover:bg-blue-50 rounded"
                  title="编辑"
                >
                  <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`确定要删除“${event.title}”及其所有子事件吗？`)) {
                      onDelete(event.id);
                    }
                  }}
                  className="p-1 md:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
            </div>

            {/* Tags */}
            {event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-3">
                {event.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium bg-slate-100 text-slate-500">
                    <Tag className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1 opacity-50" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Markdown Content */}
            <div className="prose prose-sm prose-slate max-w-none text-slate-600 line-clamp-3 mb-2 text-xs md:text-sm">
              <ReactMarkdown>{event.content}</ReactMarkdown>
            </div>

            {/* Images Preview */}
            {event.images && event.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 mt-2">
                {event.images.slice(0, 3).map((img, i) => (
                  <img key={i} src={img} className="h-10 w-10 md:h-12 md:w-12 rounded object-cover border border-slate-100" alt="" />
                ))}
              </div>
            )}
          </div>
          
          {/* Nested Children Rendering */}
          {hasChildren && isExpanded && (
            <div className="mt-2 md:mt-4 pl-0 md:pl-2">
              {sortedChildren.map(child => (
                <TimelineNode 
                  key={child.id} 
                  event={child} 
                  level={level + 1} 
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Timeline: React.FC<TimelineProps> = ({ 
  events, 
  onEdit, 
  onDelete, 
  onInsertRequest, 
  onAddChild,
  expandedIds,
  onToggleExpand
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort Top Level Events
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const handleLineClick = (e: React.MouseEvent) => {
    // Only allow clicking the main line to add root events
    onInsertRequest(new Date().toISOString().split('T')[0]);
  };

  if (sortedEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="text-4xl font-bold mb-4 opacity-20">暂无事件</div>
        <p>点击右下角 + 按钮创建您的第一个历史时刻。</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative max-w-4xl mx-auto px-2 md:px-4 py-8">
      
      {/* Main Vertical Line (Fixed on Left) */}
      <div 
        className="absolute top-0 bottom-0 w-8 cursor-pointer group left-7 md:left-9"
        onClick={handleLineClick}
        title="点击线条添加根事件"
      >
        <div className="absolute left-1/2 top-4 bottom-4 w-1 bg-slate-200 -translate-x-1/2 group-hover:bg-primary/40 group-hover:w-1.5 transition-all rounded-full"></div>
        
        {/* Add Button at Top */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="bg-primary text-white rounded-full p-1 shadow">
             <Plus className="w-3 h-3" />
           </div>
        </div>
         {/* Add Button at Bottom */}
         <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="bg-primary text-white rounded-full p-1 shadow">
             <Plus className="w-3 h-3" />
           </div>
        </div>
      </div>

      <div className="relative z-10 pl-4">
        {sortedEvents.map(event => (
          <TimelineNode 
            key={event.id}
            event={event}
            level={0}
            expandedIds={expandedIds}
            toggleExpand={onToggleExpand}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
      </div>
    </div>
  );
};

export default Timeline;