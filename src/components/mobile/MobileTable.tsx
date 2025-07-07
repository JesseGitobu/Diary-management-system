'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Column {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
}

interface MobileTableProps {
  data: any[]
  columns: Column[]
  keyExtractor: (item: any) => string
  expandable?: boolean
}

export function MobileTable({ data, columns, keyExtractor, expandable = false }: MobileTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const primaryColumn = columns[0]
  const secondaryColumns = columns.slice(1, 3) // Show max 2 additional columns on mobile
  const hiddenColumns = columns.slice(3)

  return (
    <div className="space-y-2">
      {data.map((row) => {
        const id = keyExtractor(row)
        const isExpanded = expandedRows.has(id)
        
        return (
          <div
            key={id}
            className="bg-white rounded-lg border p-4 shadow-sm"
          >
            {/* Main Row */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {primaryColumn.render 
                    ? primaryColumn.render(row[primaryColumn.key], row)
                    : row[primaryColumn.key]
                  }
                </div>
                <div className="flex space-x-4 mt-1">
                  {secondaryColumns.map((column) => (
                    <div key={column.key} className="text-sm text-gray-500">
                      <span className="font-medium">{column.label}: </span>
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </div>
                  ))}
                </div>
              </div>
              
              {expandable && hiddenColumns.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRow(id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Expanded Content */}
            {isExpanded && hiddenColumns.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {hiddenColumns.map((column) => (
                    <div key={column.key} className="text-sm">
                      <span className="font-medium text-gray-700">{column.label}: </span>
                      <span className="text-gray-600">
                        {column.render 
                          ? column.render(row[column.key], row)
                          : row[column.key]
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}