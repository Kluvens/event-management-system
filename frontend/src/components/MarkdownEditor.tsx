import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { Bold, Italic, List, ListOrdered, Heading2, Link, Code, Eye, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: boolean
}

type FormatAction = {
  icon: React.ElementType
  label: string
  prefix: string
  suffix?: string
  block?: boolean
}

const ACTIONS: FormatAction[] = [
  { icon: Bold,         label: 'Bold',           prefix: '**',  suffix: '**'  },
  { icon: Italic,       label: 'Italic',          prefix: '_',   suffix: '_'   },
  { icon: Heading2,     label: 'Heading',         prefix: '## ', block: true   },
  { icon: List,         label: 'Bullet list',     prefix: '- ',  block: true   },
  { icon: ListOrdered,  label: 'Ordered list',    prefix: '1. ', block: true   },
  { icon: Code,         label: 'Inline code',     prefix: '`',   suffix: '`'   },
  { icon: Link,         label: 'Link',            prefix: '[',   suffix: '](url)' },
]

export function MarkdownEditor({ id, value, onChange, placeholder, error }: Props) {
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function applyFormat(action: FormatAction) {
    const el = textareaRef.current
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)

    let newText: string
    let newCursorStart: number
    let newCursorEnd: number

    if (action.block) {
      // Insert prefix at start of the line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      newText =
        value.slice(0, lineStart) +
        action.prefix +
        value.slice(lineStart)
      newCursorStart = start + action.prefix.length
      newCursorEnd = end + action.prefix.length
    } else {
      const suffix = action.suffix ?? ''
      if (selected) {
        newText = value.slice(0, start) + action.prefix + selected + suffix + value.slice(end)
        newCursorStart = start + action.prefix.length
        newCursorEnd = end + action.prefix.length
      } else {
        const placeholder = action.label.toLowerCase()
        newText = value.slice(0, start) + action.prefix + placeholder + suffix + value.slice(end)
        newCursorStart = start + action.prefix.length
        newCursorEnd = newCursorStart + placeholder.length
      }
    }

    onChange(newText)
    // Restore focus and selection after React re-render
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newCursorStart, newCursorEnd)
    })
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-background transition-colors',
        error ? 'border-red-500' : 'border-input focus-within:border-ring focus-within:ring-1 focus-within:ring-ring'
      )}
    >
      {/* Tab bar + toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-2 py-1.5">
        {/* Write / Preview tabs */}
        <div className="flex">
          <button
            type="button"
            onClick={() => setTab('write')}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
              tab === 'write'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Pencil className="h-3 w-3" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
              tab === 'preview'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>

        {/* Format toolbar — only visible in write tab */}
        {tab === 'write' && (
          <div className="flex items-center gap-0.5">
            {ACTIONS.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title={action.label}
                onClick={() => applyFormat(action)}
              >
                <action.icon className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Write pane */}
      {tab === 'write' && (
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={10}
          className="w-full resize-y bg-background px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      )}

      {/* Preview pane */}
      {tab === 'preview' && (
        <div className="min-h-[160px] px-3 py-2.5">
          {value.trim() ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground
              prose-headings:text-foreground prose-headings:font-semibold
              prose-p:text-foreground prose-p:leading-relaxed
              prose-strong:text-foreground
              prose-em:text-foreground
              prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-muted prose-pre:text-foreground
              prose-ul:text-foreground prose-ol:text-foreground
              prose-li:text-foreground
              prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-border prose-blockquote:text-muted-foreground
              prose-hr:border-border
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
