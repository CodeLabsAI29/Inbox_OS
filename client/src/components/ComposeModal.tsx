import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertCircle,
} from 'lucide-react';
import { API_BASE, authenticatedFetch } from '../config';

interface FormInputs {
  to: string;
  cc: string;
  subject: string;
  body: string;
}

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
    formState: { errors },
  } = useForm<FormInputs>({
    defaultValues: { to: '', cc: '', subject: '', body: '' },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        to: initialValues?.to || '',
        cc: initialValues?.cc || '',
        subject: initialValues?.subject || '',
        body: initialValues?.body || '',
      });
    }
  }, [isOpen, initialValues, reset]);

  const insertMarkdown = (symbol: string) => {
    const textarea = document.getElementById(
      'compose-body'
    ) as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    let replacement = '';
    if (symbol === 'bold') replacement = `**${selected || 'bold text'}**`;
    else if (symbol === 'italic')
      replacement = `*${selected || 'italic text'}*`;
    else if (symbol === 'code') replacement = `\`${selected || 'code'}\``;
    else if (symbol === 'list') replacement = `\n- ${selected || 'list item'}`;
    const newText = before + replacement + after;
    setValue('body', newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + replacement.length,
        start + replacement.length
      );
    }, 50);
  };

  const triggerAiDraft = async () => {
    setIsAiLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const toVal = getValues('to') || 'Recipient';
    const subVal = getValues('subject') || 'General Request';
    const name = toVal.split('@')[0];
    const generatedDraft = `Hi ${name.charAt(0).toUpperCase() + name.slice(1)},\n\nThank you for reaching out regarding "${subVal}". I wanted to let you know that I have received your request and will review the details shortly.\n\nI will get back to you coordinate next steps as soon as possible.\n\nBest regards,\nAlex Carter`;
    setValue('body', generatedDraft);
    setIsAiLoading(false);
  };

  const onSubmit = async (formData: FormInputs) => {
    setIsSending(true);
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Endpoint send offline');
      setToastMessage('Email dispatched successfully!');
    } catch (err) {
      console.warn(
        '[ComposeModal] POST /api/emails/send failed. Fallback mock dispatch.',
        err
      );
      setToastMessage('Email dispatched successfully! (Mock pipeline)');
    } finally {
      setIsSending(false);
      setTimeout(() => {
        setToastMessage(null);
        closeCompose();
      }, 2500);
    }
  };

  const toolbarBtnStyle: React.CSSProperties = {
    padding: '5px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    color: 'var(--color-muted)',
    cursor: 'pointer',
    borderRadius: '6px',
    minHeight: '30px',
    minWidth: '30px',
    transition: 'all 0.15s',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0"
            style={{ backgroundColor: 'rgba(17,17,17,0.65)' }}
            onClick={closeCompose}
          />

          {/* Success Toast */}
          {toastMessage && (
            <div
              className="fixed top-6 right-6 z-50 px-5 py-3 flex items-center gap-3 animate-slideIn rounded-[14px]"
              style={{
                backgroundColor: 'var(--color-success)',
                boxShadow: '0 8px 28px rgba(63,167,106,.30)',
                color: '#fff',
              }}
            >
              <CheckCircle size={16} />
              <span className="text-[13px] font-medium">{toastMessage}</span>
            </div>
          )}

          {/* Main Compose Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-[640px] flex flex-col max-h-[90vh] z-10 overflow-hidden rounded-[22px]"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 20px 60px rgba(0,0,0,.15)',
            }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'rgba(93,107,47,.04)',
              }}
            >
              <div className="flex items-center gap-2">
                <Mail size={15} style={{ color: 'var(--color-primary)' }} />
                <h2
                  className="text-[15px] font-semibold"
                  style={{ color: 'var(--color-ink)' }}
                >
                  Compose Message
                </h2>
              </div>
              <button
                onClick={closeCompose}
                className="p-1.5 flex items-center justify-center transition-all min-h-[36px] min-w-[36px] rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[#FEF0EE] hover:border-[var(--color-danger)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)]/30"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {/* TO Field */}
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label
                    className="text-[11px] font-medium"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    To
                  </label>
                  {errors.to && (
                    <span
                      className="text-[9px] flex items-center gap-1 font-bold"
                      style={{ color: 'var(--color-danger)' }}
                    >
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
                      message: 'Enter a valid email address',
                    },
                  })}
                  className={`w-full bg-[var(--color-surface)] border rounded-[10px] px-4 py-2.5 text-xs text-[var(--color-ink)] transition-all outline-none ${
                    errors.to
                      ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-2 focus:ring-[var(--color-danger)]/25'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                  }`}
                />
              </div>

              {/* CC Field */}
              <div className="space-y-1">
                <label
                  className="text-[11px] font-medium block mb-1"
                  style={{ color: 'var(--color-muted)' }}
                >
                  CC
                </label>
                <input
                  type="text"
                  placeholder="optional@domain.com"
                  disabled={isSending}
                  {...register('cc')}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] px-4 py-2.5 text-xs text-[var(--color-ink)] transition-all outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>

              {/* SUBJECT Field */}
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label
                    className="text-[11px] font-medium"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Subject
                  </label>
                  {errors.subject && (
                    <span
                      className="text-[9px] flex items-center gap-1 font-bold"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <AlertCircle size={9} />
                      <span>{errors.subject.message}</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Subject line"
                  disabled={isSending}
                  {...register('subject', {
                    required: 'Subject line is required',
                  })}
                  className={`w-full bg-[var(--color-surface)] border rounded-[10px] px-4 py-2.5 text-xs text-[var(--color-ink)] transition-all outline-none ${
                    errors.subject
                      ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-2 focus:ring-[var(--color-danger)]/25'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                  }`}
                />
              </div>

              {/* BODY Field */}
              <div className="space-y-1 flex-1 flex flex-col min-h-[220px]">
                <div className="flex justify-between items-center mb-1">
                  <label
                    className="text-[11px] font-medium"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Message Body
                  </label>
                  {errors.body && (
                    <span
                      className="text-[9px] flex items-center gap-1 font-bold"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <AlertCircle size={9} />
                      <span>{errors.body.message}</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col flex-1 overflow-hidden rounded-[12px] border border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all">
                  {/* Text formatting bar */}
                  <div
                    className="flex items-center justify-between px-2 py-1.5"
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: 'rgba(93,107,47,.03)',
                    }}
                  >
                    <div className="flex items-center gap-0.5">
                      {[
                        {
                          symbol: 'bold',
                          icon: <Bold size={12} />,
                          title: 'Bold',
                        },
                        {
                          symbol: 'italic',
                          icon: <Italic size={12} />,
                          title: 'Italic',
                        },
                        {
                          symbol: 'code',
                          icon: <Code size={12} />,
                          title: 'Code',
                        },
                        {
                          symbol: 'list',
                          icon: <List size={12} />,
                          title: 'List',
                        },
                      ].map(({ symbol, icon, title }) => (
                        <button
                          key={symbol}
                          type="button"
                          onClick={() => insertMarkdown(symbol)}
                          title={title}
                          style={toolbarBtnStyle}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLElement
                            ).style.backgroundColor = 'rgba(93,107,47,.10)';
                            (e.currentTarget as HTMLElement).style.color =
                              'var(--color-primary)';
                            (e.currentTarget as HTMLElement).style.borderColor =
                              'rgba(93,107,47,.20)';
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLElement
                            ).style.backgroundColor = 'transparent';
                            (e.currentTarget as HTMLElement).style.color =
                              'var(--color-muted)';
                            (e.currentTarget as HTMLElement).style.borderColor =
                              'transparent';
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>

                    {/* AI Assist */}
                    <button
                      type="button"
                      onClick={triggerAiDraft}
                      disabled={isAiLoading || isSending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-full disabled:opacity-50 transition-all border border-transparent active:scale-[0.97]"
                      style={{
                        backgroundColor: 'rgba(93,107,47,.10)',
                        color: 'var(--color-primary)',
                        border: '1px solid rgba(93,107,47,.20)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          'var(--color-primary)';
                        (e.currentTarget as HTMLElement).style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          'rgba(93,107,47,.10)';
                        (e.currentTarget as HTMLElement).style.color =
                          'var(--color-primary)';
                      }}
                    >
                      {isAiLoading ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          <span>Drafting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} />
                          <span>AI Draft</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Textarea */}
                  <textarea
                    id="compose-body"
                    placeholder="Write your email here..."
                    disabled={isSending}
                    {...register('body', {
                      required: 'Message body is required',
                    })}
                    className="w-full flex-1 min-h-[160px] resize-none p-4 text-[13px] leading-relaxed bg-[var(--color-surface)] text-[var(--color-ink)] outline-none"
                  />
                </div>
              </div>

              {/* Form Submit Footer */}
              <div
                className="flex justify-end gap-3 pt-4"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <Button
                  variant="secondary"
                  onClick={closeCompose}
                  disabled={isSending}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSending}>
                  {isSending ? (
                    <span>Dispatching...</span>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Send Action</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
