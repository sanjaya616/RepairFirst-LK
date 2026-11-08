import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Laptop,
  Smartphone,
  RefreshCw,
  Info
} from 'lucide-react';
import { SAMPLE_CONVERSATIONS } from '../lib/demoData';
import { ChatMessage } from '../types';

interface MiraChatProps {
  onOpenCompare: (prefill?: { repairCost?: number; replacementPrice?: number }) => void;
  onOpenServices: (searchArea?: string, deviceType?: string) => void;
}

export const MiraChat: React.FC<MiraChatProps> = ({ onOpenCompare, onOpenServices }) => {
  const [activeSampleId, setActiveSampleId] = useState('sample-1');
  const activeConversation = SAMPLE_CONVERSATIONS.find((c) => c.id === activeSampleId) || SAMPLE_CONVERSATIONS[0];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'guide',
      text: "Hi, I'm Mira. Tell me what's happening with your laptop or smartphone. I can suggest safe first checks and help you weigh repair against replacement.",
      timestamp: '09:41',
    },
    {
      id: 'm2',
      sender: 'user',
      text: activeConversation.initialUserMessage,
      timestamp: '09:42',
    },
    {
      id: 'm3',
      sender: 'guide',
      text: activeConversation.guideResponse,
      timestamp: '09:42',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);

  // Multimodal image attachments state
  const [attachedPhotos, setAttachedPhotos] = useState<Array<{
    id: string;
    name: string;
    size: number;
    mimeType: string;
    dataUrl: string;
  }>>([]);
  const [activePhotoZoom, setActivePhotoZoom] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active inspection visual (updates to user's photo when uploaded)
  const [activeInspectionVisual, setActiveInspectionVisual] = useState<string | null>(null);

  // Micro compare widget state
  const [quickRepairQuote, setQuickRepairQuote] = useState('18000');
  const [quickReplacementPrice, setQuickReplacementPrice] = useState('95000');

  // Search area quick state
  const [quickSearchArea, setQuickSearchArea] = useState('Colombo');
  const [showAttachmentTip, setShowAttachmentTip] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // When switching active sample, reset messages to match that sample's storyline
    setMessages([
      {
        id: 'm1',
        sender: 'guide',
        text: "Hi, I'm Mira. Tell me what's happening with your laptop or smartphone. I can suggest safe first checks and help you weigh repair against replacement.",
        timestamp: '09:41',
      },
      {
        id: 'm2',
        sender: 'user',
        text: activeConversation.initialUserMessage,
        timestamp: '09:42',
      },
      {
        id: 'm3',
        sender: 'guide',
        text: activeConversation.guideResponse,
        timestamp: '09:42',
      },
    ]);
  }, [activeSampleId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAttachmentError(null);

    if (attachedPhotos.length + files.length > 4) {
      setAttachmentError('Maximum 4 photos allowed per message.');
      return;
    }

    Array.from(files).forEach((file) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setAttachmentError(`"${file.name}" is not supported. Use JPG, PNG, or WebP.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setAttachmentError(`"${file.name}" exceeds the 5 MB file size limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        if (dataUrl) {
          const newPhoto = {
            id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            dataUrl,
          };
          setAttachedPhotos((prev) => [...prev, newPhoto]);
          setActiveInspectionVisual(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    setAttachedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if ((!text.trim() && attachedPhotos.length === 0) || isSending) return;

    const currentPhotos = [...attachedPhotos];
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: text.trim() || (currentPhotos.length > 0 ? 'Attached device photo(s) for visual inspection.' : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      images: currentPhotos.map((p) => ({
        id: p.id,
        name: p.name,
        dataUrl: p.dataUrl,
      })),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setAttachedPhotos([]);
    setIsSending(true);
    setAttachmentError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ sender: m.sender, text: m.text })),
          deviceContext: {
            device: activeConversation.device,
            category: activeConversation.category,
          },
          images: currentPhotos.map((p) => ({
            id: p.id,
            name: p.name,
            mimeType: p.mimeType,
            base64: p.dataUrl,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Chat service unavailable');
      }

      const data = await response.json();
      const guideMsg: ChatMessage = {
        id: `g_${Date.now()}`,
        sender: 'guide',
        text: data.reply || "I'm reviewing your inquiry. Please consider requesting an itemized written quote from a certified technician.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: data.suggestedActions,
        isWarning: data.isWarning,
      };

      setMessages((prev) => [...prev, guideMsg]);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `g_${Date.now()}`,
          sender: 'guide',
          text: "I can't diagnose hardware over the internet, but if your device shows severe heat, battery swelling, or smoke, please disconnect power immediately. For standard issues, consider comparing repair cost against replacement value below.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Title & Introduction matching mockup */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-stone-500 tracking-wider uppercase">
          Your device decision companion
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight">
          A clearer next step starts here.
        </h2>
        <p className="text-base text-stone-600 font-light max-w-2xl">
          Talk through a laptop or smartphone problem, then explore your repair options.
        </p>
      </div>

      {/* 3-Column Layout matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Conversations list */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="font-semibold text-base text-stone-900">Conversations</h3>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              03
            </span>
          </div>

          <div className="text-xs text-stone-500 font-medium">Explore a sample assessment</div>

          <div className="space-y-2">
            {SAMPLE_CONVERSATIONS.map((sample) => {
              const isActive = sample.id === activeSampleId;
              return (
                <button
                  key={sample.id}
                  onClick={() => setActiveSampleId(sample.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                      : 'bg-white border-stone-200/70 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-medium text-sm text-stone-900">{sample.title}</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {sample.device} {isActive && '· Active'}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-stone-400 font-light pt-2 leading-relaxed">
            Sample conversations help illustrate possible next steps. Your messages stay on this page during this visit.
          </p>
        </div>

        {/* Middle Column: Chat Guide */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200/90 shadow-sm flex flex-col h-[640px]">
          {/* Guide Header */}
          <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100/80 text-emerald-800 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900 text-base leading-tight">
                  Mira · RepairFirst Guide
                </h3>
                <p className="text-xs text-stone-500">Automated, rule-based guidance · Not a live expert</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-md bg-stone-100 text-stone-600 uppercase">
              Repair First
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-2 ${
                    m.sender === 'user'
                      ? 'bg-[#234b3d] text-white rounded-br-xs'
                      : m.isWarning
                      ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-xs'
                      : 'bg-stone-100 text-stone-800 rounded-bl-xs'
                  }`}
                >
                  {/* Attached images in user message */}
                  {m.images && m.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1 pb-1">
                      {m.images.map((img, idx) => (
                        <button
                          key={img.id || idx}
                          type="button"
                          onClick={() => setActivePhotoZoom(img.dataUrl || img.url || null)}
                          className="relative rounded-lg overflow-hidden border border-white/20 aspect-video bg-black/10 group cursor-pointer"
                        >
                          <img
                            src={img.dataUrl || img.url}
                            alt={img.name || 'Device inspection photo'}
                            className="w-full h-full object-cover transition transform group-hover:scale-105"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-xs">
                            🔍 Zoom
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div>{m.text}</div>
                </div>
                <span className="text-[10px] text-stone-400 mt-1 px-1">
                  {m.timestamp} · {m.sender === 'user' ? 'You' : 'Guide'}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts & Safety Warning Strip */}
          <div className="p-4 bg-stone-50/60 border-t border-stone-100 space-y-3">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                Try Asking
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'My laptop is overheating',
                  'Is this worth repairing?',
                  'Find a repair service',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendMessage(chip)}
                    disabled={isSending}
                    className="text-xs px-2.5 py-1 rounded-full border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Safety notice banner */}
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-900 text-[11px] leading-tight flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Safety first: This guide offers general advice, not a confirmed hardware diagnosis. Stop using and charging a device with smoke, swelling, exposed wiring, severe heat or liquid damage; seek qualified help.
              </span>
            </div>

            {/* Staged photos preview strip before sending */}
            {attachedPhotos.length > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-emerald-950">
                  <span>Attached Photos for Gemini Vision ({attachedPhotos.length}/4)</span>
                  <span className="text-[10px] text-emerald-800">JPG, PNG, WebP &bull; Max 5MB</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {attachedPhotos.map((photo) => (
                    <div key={photo.id} className="relative rounded-lg overflow-hidden border border-emerald-300 bg-white aspect-square group">
                      <img
                        src={photo.dataUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold shadow hover:bg-red-700 cursor-pointer"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-emerald-800 font-light leading-tight">
                  Privacy note: Photos are analyzed in memory for hardware assessment. Avoid capturing faces or confidential paperwork.
                </p>
              </div>
            )}

            {attachmentError && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
                <span>{attachmentError}</span>
                <button type="button" onClick={() => setAttachmentError(null)} className="text-red-800 font-bold ml-2">✕</button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={attachedPhotos.length > 0 ? "Add note about attached photo(s)..." : "Ask about your device..."}
                  disabled={isSending}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
                <button
                  type="button"
                  title="Attach device photos (up to 4)"
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition p-1 rounded-md cursor-pointer ${
                    attachedPhotos.length > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-stone-400 hover:text-stone-700'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && attachedPhotos.length === 0)}
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white text-sm font-medium transition cursor-pointer disabled:opacity-40"
              >
                {isSending ? 'Analyzing...' : 'Send ↗'}
              </button>
            </form>

            <div className="text-[10px] text-stone-400 text-center font-light flex items-center justify-center gap-2">
              <span>MIRA VISION &bull; Multimodal Device Diagnostic Guide</span>
              <span>&bull;</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-emerald-700 hover:underline cursor-pointer font-medium"
              >
                Attach device photos (max 4)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Device Inspection Panel matching screenshot */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900 text-lg">Device inspection</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 uppercase tracking-wider">
              {activeInspectionVisual ? 'Multimodal' : 'Assessment'}
            </span>
          </div>

          {/* Illustrative or live inspection visual */}
          <div className="relative rounded-xl overflow-hidden bg-stone-100 aspect-16/9 border border-stone-200">
            <img
              src={activeInspectionVisual || "/assets/aistudio/RepairFirst_LK_website_7b96146a.png"}
              alt="Device inspection visual"
              className="w-full h-full object-cover object-center cursor-pointer"
              onClick={() => {
                if (activeInspectionVisual) setActivePhotoZoom(activeInspectionVisual);
              }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs text-[10px] font-medium text-stone-800 px-2 py-0.5 rounded-md border border-stone-200">
              {activeInspectionVisual ? 'Uploaded device inspection photo' : 'Illustrative inspection visual'}
            </div>
          </div>

          {/* Device details */}
          <div className="space-y-1 border-b border-stone-100 pb-3">
            <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Device in this conversation
            </div>
            <div className="font-semibold text-stone-800 text-base">
              {activeConversation.device} · {activeConversation.id === 'sample-2' ? 'Smartphone' : 'Laptop'}
            </div>
            <button
              onClick={() => setShowDeviceDetails(!showDeviceDetails)}
              className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 font-medium transition cursor-pointer pt-1"
            >
              {showDeviceDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showDeviceDetails ? 'Hide details' : 'View device details'}
            </button>
            {showDeviceDetails && (
              <div className="p-3 mt-2 rounded-xl bg-stone-50 text-xs text-stone-600 space-y-1 border border-stone-200/70">
                <div><strong>Category:</strong> {activeConversation.category}</div>
                <div><strong>Status:</strong> {activeConversation.status}</div>
                <div><strong>Initial issue:</strong> {activeConversation.initialUserMessage}</div>
              </div>
            )}
          </div>

          {/* Status & Possible category */}
          <div className="space-y-3 text-xs">
            <div>
              <div className="font-semibold text-stone-400 uppercase tracking-wider text-[10px]">
                Assessment Status
              </div>
              <div className="font-semibold text-stone-800 text-sm mt-0.5">
                {activeConversation.status}
              </div>
            </div>

            <div>
              <div className="font-semibold text-stone-400 uppercase tracking-wider text-[10px]">
                Possible Issue Category
              </div>
              <div className="text-stone-700 text-sm mt-0.5">
                {activeConversation.category}
              </div>
            </div>

            <div>
              <div className="font-semibold text-stone-400 uppercase tracking-wider text-[10px]">
                Safe Checks
              </div>
              <p className="text-stone-600 leading-relaxed mt-0.5 font-light">
                {activeConversation.safeChecks}
              </p>
            </div>
          </div>

          {/* Recommended next step box matching screenshot */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
              Recommended Next Step
            </div>
            <p className="text-xs sm:text-sm font-medium leading-snug">
              {activeConversation.recommendedNextStep}
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => onOpenCompare({ repairCost: 18000, replacementPrice: 95000 })}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white font-medium text-sm transition cursor-pointer shadow-2xs"
            >
              Repair or replace? ↗
            </button>
            <button
              onClick={() => onOpenServices('Colombo', activeConversation.id === 'sample-2' ? 'smartphone' : 'laptop')}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 font-medium text-sm transition cursor-pointer"
            >
              Find a repair service ↗
            </button>
          </div>
        </div>
      </div>

      {/* Two Micro-Cards Below Section matching screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Left Card: Quick Compare */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Make an informed decision
            </div>
            <h3 className="text-xl sm:text-2xl font-serif text-stone-900 tracking-tight">
              Repair or replace?
            </h3>
            <p className="text-xs text-stone-500 font-light">
              Compare a real repair quotation with the cost of a suitable replacement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Repair quote (LKR)
              </label>
              <input
                type="number"
                value={quickRepairQuote}
                onChange={(e) => setQuickRepairQuote(e.target.value)}
                placeholder="e.g. 18000"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Replacement price (LKR)
              </label>
              <input
                type="number"
                value={quickReplacementPrice}
                onChange={(e) => setQuickReplacementPrice(e.target.value)}
                placeholder="e.g. 95000"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <button
            onClick={() =>
              onOpenCompare({
                repairCost: Number(quickRepairQuote) || 18000,
                replacementPrice: Number(quickReplacementPrice) || 95000,
              })
            }
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white font-medium text-sm transition cursor-pointer"
          >
            Compare costs
          </button>
        </div>

        {/* Right Card: Quick Find Service */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Find qualified help
            </div>
            <h3 className="text-xl sm:text-2xl font-serif text-stone-900 tracking-tight">
              Find a repair service.
            </h3>
            <p className="text-xs text-stone-500 font-light">
              Search for nearby laptop or smartphone repair options. Listings in search results are not verified by RepairFirst LK.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Search area</label>
            <select
              value={quickSearchArea}
              onChange={(e) => setQuickSearchArea(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            >
              <option value="Colombo">Colombo</option>
              <option value="Gampaha">Gampaha</option>
              <option value="Kandy">Kandy</option>
              <option value="Galle">Galle</option>
              <option value="Kurunegala">Kurunegala</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => onOpenServices(quickSearchArea, 'laptop')}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-medium transition cursor-pointer"
            >
              Laptop repair ↗
            </button>
            <button
              onClick={() => onOpenServices(quickSearchArea, 'smartphone')}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-medium transition cursor-pointer"
            >
              Phone repair ↗
            </button>
          </div>

          <p className="text-[11px] text-stone-400 leading-tight pt-1">
            Check credentials, reviews, written quotations and repair warranties independently before visiting.
          </p>
      </div>

      {/* Multimodal Photo Zoom Lightbox Modal */}
      {activePhotoZoom && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-stone-900 rounded-2xl overflow-hidden shadow-2xl border border-stone-800">
            <div className="p-3 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between text-white">
              <span className="text-xs font-mono font-medium text-stone-300">
                Inspection Photograph &bull; Gemini Multimodal Vision
              </span>
              <button
                type="button"
                onClick={() => setActivePhotoZoom(null)}
                className="w-7 h-7 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-xs font-bold text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/60 max-h-[80vh] overflow-hidden">
              <img
                src={activePhotoZoom}
                alt="Enlarged inspection view"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-3 text-center text-stone-400 text-xs bg-stone-900">
              Examined for physical impacts, port debris, chassis warping, and visible hardware safety indicators.
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
