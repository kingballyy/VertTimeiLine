import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { TimelineEvent } from '../types';
import { Edit2, Tag, Trash2, ChevronDown, ChevronRight, Plus, Circle, ExternalLink } from 'lucide-react';

interface TimelineProps {
  events: TimelineEvent[];
  onEdit: (event: TimelineEvent) => void;
  onDelete: (id: string) => void;
  onInsertRequest: (date: string, parentId?: string | null) => void;
  onAddChild: (parentId: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  parentId?: string | null;
}

// Helper: Convert date string to absolute month count for linear interpolation
const dateToMonths = (dateStr: string): number => {
  try {
    const isBC = dateStr.startsWith('-');
    const cleanDate = dateStr.replace(/^-/, '');
    const parts = cleanDate.split('-').map(Number);
    const y = parts[0];
    const m = parts[1] || 1;
    // Simple linear scale: (Year * 12) + Month. 
    // BC years are negative.
    return (isBC ? -y : y) * 12 + (m - 1);
  } catch (e) {
    return 0;
  }
};

const monthsToDate = (totalMonths: number): string => {
  const isBC = totalMonths < 0;
  const abs = Math.abs(totalMonths);
  const y = Math.floor(abs / 12);
  const m = (abs % 12) + 1;
  const d = 15; // default day
  
  const yStr = Math.max(1, y).toString().padStart(isBC ? 6 : 4, '0');
  const mStr = m.toString().padStart(2, '0');
  const dStr = d.toString().padStart(2, '0');
  
  return `${isBC ? '-' : ''}${yStr}-${mStr}-${dStr}`;
};

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
    if (month === 1 && day === 1) {
      return `${prefix}${year}年`;
    }
    return `${prefix}${year}年${month}月${day}日`;
  } catch (e) {
    return dateString;
  }
};

interface TimelineNodeProps {
  event: TimelineEvent;
  nextEvent: TimelineEvent | undefined; // Passed to calculate gap
  level: number;
  isLast: boolean;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (id: string) => void;
  onAddChild: (id: string) => void;
  onInsertRequest: (date: string, parentId?: string | null) => void;
  parentId: string | null;
}

const TimelineNode: React.FC<TimelineNodeProps> = ({ 
  event, 
  nextEvent,
  level, 
  isLast,
  expandedIds, 
  toggleExpand, 
  onEdit, 
  onDelete, 
  onAddChild,
  onInsertRequest,
  parentId
}) => {
  const spineRef = useRef<HTMLDivElement>(null);
  const [hoverDate, setHoverDate] = useState<{ date: string, top: number } | null>(null);

  const hasChildren = event.children && event.children.length > 0;
  const isExpanded = expandedIds.has(event.id);
  const isRoot = level === 0;
  
  // Sort children
  const sortedChildren = hasChildren 
    ? [...(event.children || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) 
    : [];

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!spineRef.current || !nextEvent) return;
    
    const rect = spineRef.current.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;
    
    // Calculate percentage down the line (0 to 1)
    const percentage = Math.max(0, Math.min(1, offsetY / height));
    
    const startMonths = dateToMonths(event.date);
    const endMonths = dateToMonths(nextEvent.date);
    
    // Interpolate months
    const targetMonths = Math.floor(startMonths + (endMonths - startMonths) * percentage);
    
    setHoverDate({
      date: monthsToDate(targetMonths),
      top: offsetY
    });
  };

  const handleMouseLeave = () => {
    setHoverDate(null);
  };

  const handleSpineClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hoverDate) {
      onInsertRequest(hoverDate.date, parentId);
    }
  };

  // Determine top offset for spine to avoid marker overlap
  // Root marker is roughly 40px (h-10), Child is 16px (h-4)
  // We start the interactive spine a bit below the center of the marker
  const spineTopClass = isRoot ? 'top-10' : 'top-6';

  return (
    <div className="relative group">
      <div className="flex gap-3 md:gap-4">
        
        {/* LEFT COLUMN: Marker & Line Spine */}
        <div className={`flex flex-col items-center relative flex-shrink-0 ${isRoot ? 'w-8 md:w-10' : 'w-6'}`}>
           
           {/* Visual Spine (Background Line) */}
           <div 
             className={`
               absolute top-0 bottom-0 left-1/2 -translate-x-1/2
               ${isRoot ? 'w-1 bg-blue-100' : 'w-px border-l-2 border-dashed border-blue-200'}
               ${isLast ? 'h-6' : ''} 
               transition-colors duration-300
             `}
           ></div>

           {/* --- INTERACTIVE SPINE LAYER --- */}
           {!isLast && nextEvent && (
              <div 
                ref={spineRef}
                className={`absolute left-1/2 -translate-x-1/2 bottom-0 w-8 md:w-10 z-10 cursor-crosshair group/spine ${spineTopClass}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleSpineClick}
                title="点击此处插入事件"
              >
                 {/* Visual Feedback on Hover (The highlighted line segment) */}
                 <div className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-primary/50 h-full opacity-0 group-hover/spine:opacity-100 transition-opacity pointer-events-none rounded-full"></div>

                 {/* Hover Ghost Dot */}
                 {hoverDate && (
                    <div 
                        className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-sm pointer-events-none z-20"
                        style={{ top: hoverDate.top - 6 }} // Center vertically on cursor
                    />
                 )}
                 
                 {/* Tooltip */}
                 {hoverDate && (
                    <div 
                        className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none z-50 animate-in fade-in zoom-in duration-100 origin-left"
                        style={{ top: hoverDate.top - 12 }}
                    >
                        <div className="font-bold text-amber-300 mb-0.5">+ 插入新事件</div>
                        <div className="opacity-90">{formatDate(hoverDate.date)}</div>
                        <div className="absolute top-1/2 right-full -mt-1 -mr-1 border-4 border-transparent border-r-slate-800"></div>
                    </div>
                 )}
              </div>
           )}

           {/* MARKER */}
           <div 
             className={`
               relative z-20 flex items-center justify-center rounded-full transition-all cursor-pointer box-border
               ${isRoot 
                 ? 'w-8 h-8 md:w-10 md:h-10 bg-primary text-white shadow-md border-4 border-white mt-1 ring-2 ring-blue-100' 
                 : 'w-4 h-4 bg-white border-2 border-blue-400 mt-2 hover:border-primary hover:scale-125'}
               ${hasChildren ? 'hover:ring-4 ring-primary/20' : ''}
             `}
             onClick={(e) => {
               if (hasChildren) {
                 e.stopPropagation();
                 toggleExpand(event.id);
               }
             }}
           >
             {hasChildren ? (
                // Expand/Collapse Icon
                isRoot 
                  ? (isExpanded ? <ChevronDown size={20} className="stroke-[3]" /> : <ChevronRight size={20} className="stroke-[3]" />)
                  : (isExpanded ? <ChevronDown size={10} className="text-primary stroke-[3]"/> : <ChevronRight size={10} className="text-primary stroke-[3]"/>)
             ) : (
                // Simple Dot
                isRoot 
                  ? <Circle size={12} fill="currentColor" className="text-white"/> 
                  : null
             )}
           </div>

        </div>

        {/* RIGHT COLUMN: Content */}
        <div className="flex-1 min-w-0 pb-10">
          
          {/* Header / Date */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`
               font-mono font-bold rounded px-2 py-0.5
               ${isRoot 
                 ? 'text-sm bg-blue-50 text-primary border border-blue-200' 
                 : 'text-xs bg-slate-100 text-slate-500'}
             `}>
               {formatDate(event.date)}
            </span>
            {hasChildren && (
              <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full border border-blue-100 font-bold">
                {event.children?.length}
              </span>
            )}
          </div>

          {/* Card */}
          <div 
            onClick={() => onEdit(event)}
            className={`
              relative rounded-xl border transition-all cursor-pointer overflow-hidden group/card
              ${isRoot 
                ? 'bg-white border-blue-100 shadow-sm hover:shadow-md hover:border-primary/40 p-4 md:p-5' 
                : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:border-blue-300 hover:shadow-sm p-3 md:p-4'}
            `}
          >
            {/* Action Buttons */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/95 backdrop-blur rounded-lg p-1 shadow-sm border border-slate-200 z-20">
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddChild(event.id); }}
                  className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"
                  title="添加子事件"
                >
                  <Plus size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-blue-50 rounded"
                  title="编辑"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`确定要删除“${event.title}”及其所有子事件吗？`)) {
                      onDelete(event.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
            </div>

            <h3 className={`font-bold text-slate-800 mb-2 truncate pr-16 ${isRoot ? 'text-lg' : 'text-base'}`}>
              {event.link ? (
                <a 
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline decoration-2 underline-offset-2 flex items-center gap-1 inline-flex"
                  onClick={(e) => e.stopPropagation()}
                  title={event.link}
                >
                  {event.title}
                  <ExternalLink size={14} className="opacity-50" />
                </a>
              ) : (
                event.title
              )}
            </h3>

            {/* Tags */}
            {event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {event.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                    <Tag size={10} className="mr-1 opacity-50" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Content */}
            <div className={`prose prose-sm prose-slate max-w-none text-slate-600 line-clamp-3 ${isRoot ? '' : 'text-xs'}`}>
              <ReactMarkdown>{event.content}</ReactMarkdown>
            </div>

             {/* Images Preview */}
             {event.images && event.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 mt-3">
                {event.images.slice(0, 3).map((img, i) => (
                  <img key={i} src={img} className="h-12 w-12 rounded-lg object-cover border border-slate-100" alt="" />
                ))}
              </div>
            )}
          </div>

          {/* Nested Children */}
          {hasChildren && isExpanded && (
            <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
              {sortedChildren.map((child, idx) => (
                <TimelineNode 
                  key={child.id} 
                  event={child}
                  nextEvent={sortedChildren[idx + 1]} // Pass next sibling
                  level={level + 1} 
                  isLast={idx === sortedChildren.length - 1}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                  onInsertRequest={onInsertRequest}
                  parentId={event.id} // Pass current ID as parent for children
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
  onToggleExpand,
  parentId = null
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort Top Level Events
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const handleGlobalAdd = () => {
    // Default to current date if global add
    onInsertRequest(new Date().toISOString().split('T')[0], null);
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
    <div ref={containerRef} className="max-w-4xl mx-auto px-4 py-8 relative">
      
      {/* Global Add Button Area at Top */}
      <div 
        className="group flex items-center gap-4 mb-2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
        onClick={() => {
           // Insert before first event, approximately 50 years prior? Or just today.
           // Let's use first event - 1 year
           const firstDate = sortedEvents[0]?.date;
           // Simple calc for demo
           onInsertRequest(firstDate, parentId);
        }}
      >
         <div className="w-8 md:w-10 flex justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-400 group-hover:border-primary group-hover:text-primary transition-colors bg-white">
              <Plus size={16} />
            </div>
         </div>
         <div className="text-sm font-medium text-blue-400 group-hover:text-primary">
            添加起始事件
         </div>
      </div>

      <div className="relative">
        {sortedEvents.map((event, index) => (
          <TimelineNode 
            key={event.id}
            event={event}
            nextEvent={sortedEvents[index + 1]} // Pass next sibling
            level={0}
            isLast={index === sortedEvents.length - 1}
            expandedIds={expandedIds}
            toggleExpand={onToggleExpand}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            onInsertRequest={onInsertRequest}
            parentId={parentId} // Root has no parent (or whatever is passed)
          />
        ))}
      </div>
      
       {/* Global Add Button Area at Bottom */}
       <div 
        className="group flex items-center gap-4 mt-[-30px] cursor-pointer opacity-60 hover:opacity-100 transition-opacity z-10 relative"
        onClick={handleGlobalAdd}
      >
         <div className="w-8 md:w-10 flex justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-400 group-hover:border-primary group-hover:text-primary transition-colors bg-white shadow-sm">
              <Plus size={16} />
            </div>
         </div>
         <div className="text-sm font-medium text-blue-400 group-hover:text-primary">
            添加后续事件
         </div>
      </div>
    </div>
  );
};

export default Timeline;