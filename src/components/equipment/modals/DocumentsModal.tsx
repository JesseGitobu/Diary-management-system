'use client'

import { Button } from '@/components/ui/Button'
import { FileText } from 'lucide-react'
import { Modal } from './shared'

export function DocumentsModal({ open, onClose, equipment }: { open: boolean; onClose: () => void; equipment: any }) {
  const mockDocs = [
    { name: 'Purchase Receipt.pdf', type: 'Receipt', date: '2021-03-15', size: '142 KB' },
    { name: 'Service Report — Jan 2024.pdf', type: 'Service Report', date: '2024-01-10', size: '380 KB' },
    { name: 'Insurance Certificate.pdf', type: 'Insurance', date: '2024-06-01', size: '215 KB' },
    { name: 'Operator Manual.pdf', type: 'Manual', date: '2021-03-15', size: '8.2 MB' },
  ]
  const typeColors: { [key: string]: string } = { Receipt:'bg-emerald-50 text-emerald-700', 'Service Report':'bg-blue-50 text-blue-700', Insurance:'bg-violet-50 text-violet-700', Manual:'bg-slate-100 text-slate-600', Photo:'bg-amber-50 text-amber-700' }
  return (
    <Modal open={open} onClose={onClose} title="Documents & Attachments" icon={FileText} accentColor="slate"
      footer={<Button size="sm" className="bg-slate-700 hover:bg-slate-800 text-white">+ Upload Document</Button>}>
      <div className="space-y-2">
        {mockDocs.map(doc => (
          <div key={doc.name} className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors">
            <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{doc.name}</p>
              <p className="text-xs text-slate-400">{doc.date} · {doc.size}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[doc.type] || 'bg-slate-100 text-slate-600'}`}>{doc.type}</span>
            <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">View</button>
          </div>
        ))}
      </div>
      <div className="border-2 border-dashed border-slate-200 rounded-xl py-8 text-center text-slate-400 text-sm hover:border-slate-300 transition-colors cursor-pointer">
        <FileText className="mx-auto h-6 w-6 mb-2" />
        Drop files here or <span className="text-blue-500 font-medium">browse</span>
      </div>
    </Modal>
  )
}
