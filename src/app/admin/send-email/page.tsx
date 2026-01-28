'use client';

import { useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import './editor-styles.css';

interface EmailAttachment {
  filename: string;
  content: string; // base64
  contentType: string;
  size: number;
}

export default function SendEmailPage() {
  const [subject, setSubject] = useState('');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [result, setResult] = useState<{ total: number; successful: number; failed: number; results?: { status: string; email: string; error?: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none p-4 focus:outline-none min-h-[300px]',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          // Handle image paste
          if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                if (editor) {
                  editor.chain().focus().setImage({ src: base64 }).run();
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const files = event.dataTransfer.files;
          
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
              event.preventDefault();
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                if (editor) {
                  const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                  if (coordinates) {
                    editor.chain().focus().insertContentAt(coordinates.pos, {
                      type: 'image',
                      attrs: { src: base64 },
                    }).run();
                  } else {
                    editor.chain().focus().setImage({ src: base64 }).run();
                  }
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ font: [] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean'],
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _formats = [
    'header',
    'font',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'script',
    'list',
    'bullet',
    'indent',
    'align',
    'blockquote',
    'code-block',
    'link',
    'image',
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: EmailAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      await new Promise((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          newAttachments.push({
            filename: file.name,
            content: base64,
            contentType: file.type,
            size: file.size,
          });
          resolve(true);
        };
        reader.readAsDataURL(file);
      });
    }

    setAttachments([...attachments, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        editor?.chain().focus().setImage({ src: base64 }).run();
      };
      reader.readAsDataURL(file);
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleSendEmail = async () => {
    const body = editor?.getHTML() || '';
    
    if (!subject || !body || body === '<p></p>') {
      alert('Please fill in subject and body');
      return;
    }

    if (!confirm('Are you sure you want to send this email to all registered users?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/send-bulk-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          htmlBody: body,
          attachments: attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        alert(`Email sent successfully to ${data.successful} users!`);
        // Reset form
        setSubject('');
        editor?.commands.setContent('');
        setAttachments([]);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    const testEmail = prompt('Enter your email address to receive a test email:');
    if (!testEmail) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setTestLoading(true);

    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`✅ Test email sent successfully to ${testEmail}!\n\nCheck your inbox (and spam folder). Message ID: ${data.messageId}`);
      } else {
        alert(`❌ Failed to send test email:\n\n${data.error}\n\nDetails: ${data.details || 'No additional details'}`);
        console.error('Test email error:', data);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Failed to send test email. Check console for details.');
    } finally {
      setTestLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Send Email to All Users</h1>
        <button
          onClick={handleTestEmail}
          disabled={testLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {testLoading ? '⏳ Sending...' : '🧪 Test Email Configuration'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
            Subject *
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter email subject"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Body *
          </label>
          
          {/* Toolbar */}
          <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('bold') ? 'bg-blue-200' : 'bg-white'} border hover:bg-gray-100`}
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('italic') ? 'bg-blue-200' : 'bg-white'} border hover:bg-gray-100`}
            >
              <em>I</em>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('underline') ? 'bg-blue-200' : 'bg-white'} border hover:bg-gray-100`}
            >
              <u>U</u>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('strike') ? 'bg-blue-200' : 'bg-white'} border hover:bg-gray-100`}
            >
              <s>S</s>
            </button>
            <div className="w-px bg-gray-300 mx-1"></div>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`px-3 py-1 rounded ${editor?.isActive('heading', { level: 1 }) ? 'bg-blue-200' : 'bg-white'} border hover:bg-gray-100`}
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-3 py-1 rounded ${editor?.isActive('heading', { level: 2 }) ? 'bg-blue-200' : 'bg-white'} border hover:bg-gray-100`}
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`px-3 py-1 rounded ${editor?.isActive('heading', { level: 3 }) ? 'bg-blue-200' : 'bg-white'} border hover:bg-gray-100`}
            >
              H3
            </button>
            <div className="w-px bg-gray-300 mx-1"></div>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('bulletList') ? 'bg-blue-200' : 'bg-white'} border hover:bg-gray-100`}
            >
              • List
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('orderedList') ? 'bg-blue-200' : 'bg-white'} border hover:bg-gray-100`}
            >
              1. List
            </button>
            <div className="w-px bg-gray-300 mx-1"></div>
            <button
              type="button"
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) {
                  editor?.chain().focus().setLink({ href: url }).run();
                }
              }}
              className={`px-3 py-1 rounded ${editor?.isActive('link') ? 'bg-blue-200' : 'bg-white'} border hover:bg-gray-100`}
            >
              🔗 Link
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="px-3 py-1 rounded bg-white border hover:bg-gray-100"
            >
              🖼️ Image
            </button>
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <div className="w-px bg-gray-300 mx-1"></div>
            <input
              type="color"
              onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
              className="w-10 h-8 border rounded cursor-pointer"
              title="Text Color"
            />
          </div>

          {/* Editor */}
          <div className="border border-t-0 border-gray-300 rounded-b-lg bg-white relative">
            <EditorContent editor={editor} />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
              💡 Paste (Ctrl+V) or Drag & Drop images
            </div>
          </div>
          
          <p className="mt-2 text-sm text-gray-500">
            <strong>✨ Image Support:</strong> Copy and paste images directly from your clipboard, or drag & drop image files into the editor.
            <br />
            <strong>🔤 Placeholders:</strong> Use {'{'}{'{'} firstName {'}'}{'}'},  {'{'}{'{'} lastName {'}'}{'}'},  {'{'}{'{'} fullName {'}'}{'}'} to personalize emails.
          </p>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attachments
          </label>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              📎 Add Attachment
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Attachment List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{att.filename}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Send Button */}
        <div className="pt-4">
          <button
            onClick={handleSendEmail}
            disabled={loading || !subject || !editor?.getHTML()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Sending...' : 'Send Email to All Users'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Email Sent Successfully!</h3>
            <p className="text-sm text-green-700">
              Total users: {result.total} | Successful: {result.successful} | Failed: {result.failed}
            </p>
            {result.failed > 0 && (
              <details className="mt-2">
                <summary className="text-sm text-red-600 cursor-pointer">
                  View failed emails
                </summary>
                <div className="mt-2 space-y-1">
                  {result.results
                    ?.filter((r) => r.status === 'failed')
                    .map((r, i: number) => (
                      <p key={i} className="text-xs text-red-600">
                        {r.email}: {r.error}
                      </p>
                    ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
