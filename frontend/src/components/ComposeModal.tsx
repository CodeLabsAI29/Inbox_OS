import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCompose } from '../context/ComposeContext';
import { Button } from './Button';
import { 
  X, 
  Send, 
  Sparkles, 
  Loader2, 
  Bold, 
  Italic, 
  Code, 
  List, 
  Mail, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface FormInputs {
  to: string;
  cc: string;
  subject: string;
  body: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const ComposeModal: React.FC = () => {
  const { isOpen, initialValues, closeCompose } = useCompose();
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { 
    register, 
    handleSubmit, 
    setValue, 
    getValues, 
    reset, 
    formState: { errors } 
  } = useForm<FormInputs>({
    defaultValues: {
      to: '',
      cc: '',
      subject: '',
      body: ''
    }
  });

  // Load initial values (e.g. if replying)
  useEffect(() => {
    if (isOpen) {
      reset({
        to: initialValues?.to || '',
        cc: initialValues?.cc || '',
        subject: initialValues?.subject || '',
        body: initialValues?.body || ''
      });
    }
  }, [isOpen, initialValues, reset]);

  if (!isOpen) return null;

  // Insert markdown symbols into body text area
  const insertMarkdown = (symbol: string) => {
    const textarea = document.getElementById('compose-body') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    let replacement = '';
    if (symbol === 'bold') replacement = `**${selected || 'bold text'}**`;
    else if (symbol === 'italic') replacement = `*${selected || 'italic text'}*`;
    else if (symbol === 'code') replacement = `\`${selected || 'code'}\``;
    else if (symbol === 'list') replacement = `\n- ${selected || 'list item'}`;

    const newText = before + replacement + after;
    setValue('body', newText);
    
    // Restore selection focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  // AI Draft Assistance Handler
  const triggerAiDraft = async () => {
    setIsAiLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const toVal = getValues('to') || 'Recipient';
    const subVal = getValues('subject') || 'General Request';
    const name = toVal.split('@')[0];

    const generatedDraft = `Hi ${name.charAt(0).toUpperCase() + name.slice(1)},\n\nThank you for reaching out regarding "${subVal}". I wanted to let you know that I have received your request and will review the details shortly.\n\nI will get back to you coordinate next steps as soon as possible.\n\nBest regards,\nAlex Carter`;
    
    setValue('body', generatedDraft);
    setIsAiLoading(false);
  };

  // Form submit handler
  const onSubmit = async (formData: FormInputs) => {
    setIsSending(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/emails/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Endpoint send offline');
      }

      setToastMessage('Email dispatched successfully!');
    } catch (err) {
      console.warn('[ComposeModal] POST /api/emails/send failed. Performing fallback mock dispatch.', err);
      
      // Fallback local success toast (for offline demo capability)
      setToastMessage('Email dispatched successfully! (Mock pipeline)');
    } finally {
      setIsSending(false);
      
      // Keep toast visible for 2.5 seconds, then close modal
      setTimeout(() => {
        setToastMessage(null);
        closeCompose();
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      {/* ── Backdrop Overlay ────────────────────────────────────────────────────── */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeCompose}
      />

      {/* ── Success Toast Notification ────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 glass bg-emerald-500/10 border-emerald-500/20 text-emerald-400 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xl animate-slideIn">
          <CheckCircle size={18} />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ── Main Compose Card Container ────────────────────────────────────────── */}
      <div className="relative w-full max-w-[640px] glass rounded-3xl border border-white/5 shadow-2xl flex flex-col max-h-[90vh] z-10 overflow-hidden bg-bg-base/95 backdrop-blur-3xl animate-scaleUp">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-indigo-400" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Compose Outbound Action
            </h2>
          </div>
          <button 
            onClick={closeCompose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body wrapper */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TO Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">To</label>
              {errors.to && (
                <span className="text-[9px] text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle size={9} />
                  <span>{errors.to.message}</span>
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="recipient@domain.com"
              disabled={isSending}
              {...register('to', { 
                required: 'Recipient is required', 
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: 'Enter a valid email address'
                }
              })}
              className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-xs text-gray-200 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-1 ${
                errors.to 
                  ? 'border-rose-500/50 focus:ring-rose-500/10' 
                  : 'border-white/5 hover:border-white/10 focus:border-indigo-500/40 focus:ring-indigo-500/10'
              }`}
            />
          </div>

          {/* CC Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">CC</label>
            <input
              type="text"
              placeholder="optional@domain.com"
              disabled={isSending}
              {...register('cc')}
              className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/10 rounded-xl px-4 py-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-all duration-200"
            />
          </div>

          {/* SUBJECT Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Subject</label>
              {errors.subject && (
                <span className="text-[9px] text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle size={9} />
                  <span>{errors.subject.message}</span>
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="Subject line"
              disabled={isSending}
              {...register('subject', { required: 'Subject line is required' })}
              className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-xs text-gray-200 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-1 ${
                errors.subject 
                  ? 'border-rose-500/50 focus:ring-rose-500/10' 
                  : 'border-white/5 hover:border-white/10 focus:border-indigo-500/40 focus:ring-indigo-500/10'
              }`}
            />
          </div>

          {/* Editor Helper bar & Textarea BODY Field */}
          <div className="space-y-1.5 flex-1 flex flex-col min-h-[220px]">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Message Body</label>
              {errors.body && (
                <span className="text-[9px] text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle size={9} />
                  <span>{errors.body.message}</span>
                </span>
              )}
            </div>

            <div className="border border-white/5 rounded-2xl overflow-hidden flex flex-col flex-1 bg-white/[0.02]">
              
              {/* Text formatting bar */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-1">
                  <button 
                    type="button" 
                    onClick={() => insertMarkdown('bold')}
                    title="Bold"
                    className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                  >
                    <Bold size={13} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => insertMarkdown('italic')}
                    title="Italic"
                    className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                  >
                    <Italic size={13} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => insertMarkdown('code')}
                    title="Code block"
                    className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                  >
                    <Code size={13} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => insertMarkdown('list')}
                    title="Bullet List"
                    className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                  >
                    <List size={13} />
                  </button>
                </div>

                {/* AI Assist helper */}
                <button
                  type="button"
                  onClick={triggerAiDraft}
                  disabled={isAiLoading || isSending}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all text-[10px] font-bold border border-indigo-500/20 disabled:opacity-50"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 size={10} className="animate-spin" />
                      <span>Drafting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={10} />
                      <span>AI Draft Assist</span>
                    </>
                  )}
                </button>
              </div>

              {/* Input Textarea */}
              <textarea
                id="compose-body"
                placeholder="Write your email here... Use formatting bar above to write markdown."
                disabled={isSending}
                {...register('body', { required: 'Message body is required' })}
                className="w-full flex-1 min-h-[160px] bg-transparent resize-none p-4 text-xs text-gray-200 placeholder-gray-500 focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Form Submit Footer */}
          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <Button
              variant="secondary"
              onClick={closeCompose}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSending}
            >
              {isSending ? (
                <span>Dispatched...</span>
              ) : (
                <>
                  <Send size={13} />
                  <span>Send Action</span>
                </>
              )}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
};
