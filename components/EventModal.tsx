import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Save, Eye, Edit3, Calendar, Link as LinkIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import { TimelineEvent, EventFormData } from '../types';
import { fileToBase64, generateId } from '../utils/fileHelpers';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: TimelineEvent) => void;
  initialData: TimelineEvent | null;
  defaultDate?: string | null;
}

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, initialData, defaultDate }) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  
  // Date State
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [day, setDay] = useState<number>(new Date().getDate());
  const [isBC, setIsBC] = useState<boolean>(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EventFormData>();
  const descriptionValue = watch('content');

  // Parse date string into components
  const parseDateToState = (dateString: string) => {
    try {
      let cleanDate = dateString;
      let isBcDate = false;

      if (dateString.startsWith('-')) {
        isBcDate = true;
        cleanDate = dateString.substring(1);
      }

      const parts = cleanDate.split('-');
      if (parts.length >= 1) setYear(parseInt(parts[0], 10));
      if (parts.length >= 2) setMonth(parseInt(parts[1], 10));
      if (parts.length >= 3) setDay(parseInt(parts[2], 10));
      setIsBC(isBcDate);
    } catch (e) {
      console.error("Date parsing error", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit Mode
        parseDateToState(initialData.date);
        setValue('title', initialData.title);
        setValue('content', initialData.content);
        setValue('tags', initialData.tags.join(', '));
        setValue('link', initialData.link || '');
        setImages(initialData.images);
      } else {
        // Create Mode
        if (defaultDate) {
          parseDateToState(defaultDate);
        } else {
          const now = new Date();
          setYear(now.getFullYear());
          setMonth(now.getMonth() + 1);
          setDay(now.getDate());
          setIsBC(false);
        }
        
        reset({
          title: '',
          content: '',
          tags: '',
          link: ''
        });
        setImages([]);
      }
      setIsPreviewMode(false);
    }
  }, [isOpen, initialData, defaultDate, reset, setValue]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        setImages(prev => [...prev, base64]);
      } catch (error) {
        console.error("Failed to convert file", error);
        alert("Failed to upload image. Please try another file.");
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: EventFormData) => {
    // Construct Date String manually
    // Format: -002000-01-01 for BC, 2000-01-01 for AD
    const yStr = Math.abs(year).toString().padStart(isBC ? 6 : 4, '0');
    const mStr = Math.min(Math.max(month, 1), 12).toString().padStart(2, '0');
    const dStr = Math.min(Math.max(day, 1), 31).toString().padStart(2, '0');
    
    const finalDateStr = `${isBC ? '-' : ''}${yStr}-${mStr}-${dStr}`;

    const newEvent: TimelineEvent = {
      id: initialData ? initialData.id : generateId(),
      date: finalDateStr,
      title: data.title,
      content: data.content,
      images: images,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [],
      link: data.link
    };
    onSave(newEvent);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? '编辑事件' : '新建事件'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <form id="event-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Input (Custom Composite) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  发生时间
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Era Toggle */}
                  <div className="relative">
                    <select
                      value={isBC ? 'BC' : 'AD'}
                      onChange={(e) => setIsBC(e.target.value === 'BC')}
                      className={`appearance-none pl-3 pr-8 py-2 rounded-lg border font-medium outline-none transition-colors cursor-pointer ${
                        isBC ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50 border-slate-300 text-slate-700'
                      }`}
                    >
                      <option value="AD">公元 (AD)</option>
                      <option value="BC">公元前 (BC)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>

                  {/* Year */}
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-right"
                      placeholder="Year"
                    />
                    <span className="bg-slate-100 border-y border-r border-slate-300 px-2 py-2 text-slate-500 rounded-r-lg text-sm">年</span>
                  </div>

                  {/* Month */}
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={month}
                      onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
                      className="w-16 px-3 py-2 border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-right"
                    />
                    <span className="bg-slate-100 border-y border-r border-slate-300 px-2 py-2 text-slate-500 rounded-r-lg text-sm">月</span>
                  </div>

                  {/* Day */}
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={day}
                      onChange={(e) => setDay(parseInt(e.target.value) || 1)}
                      className="w-16 px-3 py-2 border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-right"
                    />
                    <span className="bg-slate-100 border-y border-r border-slate-300 px-2 py-2 text-slate-500 rounded-r-lg text-sm">日</span>
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">标题</label>
                <input
                  type="text"
                  {...register('title', { required: '请输入标题' })}
                  placeholder="例如：秦灭六国"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

              {/* Link Input */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                   <LinkIcon className="w-4 h-4" />
                   关联链接 (URL)
                </label>
                <input
                  type="url"
                  {...register('link')}
                  placeholder="https://example.com/history/qin"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Tags Input */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">标签 (用逗号分隔)</label>
                <input
                  type="text"
                  {...register('tags')}
                  placeholder="例如：朝代, 战争, 改革..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">图片附件</label>
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 group border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <img src={img} alt="Uploaded" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-slate-400 hover:text-primary">
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-medium">添加</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
            </div>

            {/* Description / Markdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">详细描述 (支持 Markdown)</label>
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-blue-700 transition-colors"
                >
                  {isPreviewMode ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {isPreviewMode ? '切换编辑' : '预览'}
                </button>
              </div>
              
              {isPreviewMode ? (
                <div className="w-full h-48 px-3 py-2 border border-slate-200 bg-white rounded-lg overflow-y-auto prose prose-sm max-w-none">
                  <ReactMarkdown>{descriptionValue || '*暂无内容*'}</ReactMarkdown>
                </div>
              ) : (
                <textarea
                  {...register('content')}
                  placeholder="## 在这里输入详细历史背景..."
                  className="w-full h-48 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
                />
              )}
            </div>

          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            form="event-form"
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            保存事件
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;