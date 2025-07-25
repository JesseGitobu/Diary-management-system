// Upcoming Tasks Card Component
// src/components/health/UpcomingTasksCard.tsx

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Plus, AlertTriangle, Clock } from 'lucide-react'

interface UpcomingTasksCardProps {
  tasks: Array<{
    id: string
    record_type: string
    next_due_date: string
    description: string
    animals: {
      id: string
      tag_number: string
      name?: string
    }
  }>
  onQuickAdd: (animalId: string) => void
}

export function UpcomingTasksCard({ tasks, onQuickAdd }: UpcomingTasksCardProps) {
  const sortedTasks = tasks.sort((a, b) => 
    new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
  )
  
  const overdueTasks = tasks.filter(task => 
    new Date(task.next_due_date) < new Date()
  )
  
  const upcomingTasks = tasks.filter(task => 
    new Date(task.next_due_date) >= new Date()
  )
  
  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return '💉'
      case 'treatment': return '💊'
      case 'checkup': return '🩺'
      default: return '📋'
    }
  }
  
  const getTaskUrgency = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { color: 'text-red-600', label: 'Overdue', urgent: true }
    if (diffDays <= 3) return { color: 'text-orange-600', label: 'Due Soon', urgent: true }
    if (diffDays <= 7) return { color: 'text-yellow-600', label: 'This Week', urgent: false }
    return { color: 'text-green-600', label: 'Upcoming', urgent: false }
  }
  
  return (
    <Card className={overdueTasks.length > 0 ? 'ring-2 ring-red-200 bg-red-50/50' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Upcoming Health Tasks</span>
          {overdueTasks.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {overdueTasks.length} Overdue
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Health tasks and follow-ups that need attention
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No upcoming health tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.slice(0, 5).map((task) => {
              const urgency = getTaskUrgency(task.next_due_date)
              
              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${
                    urgency.urgent 
                      ? 'border-red-200 bg-red-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="text-lg">{getTaskIcon(task.record_type)}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {task.animals.name || `Animal ${task.animals.tag_number}`}
                        </h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {task.record_type}: {task.description.length > 50 
                            ? task.description.substring(0, 50) + '...' 
                            : task.description
                          }
                        </p>
                        <div className={`flex items-center space-x-1 text-sm ${urgency.color}`}>
                          {urgency.urgent && <AlertTriangle className="w-4 h-4" />}
                          <span>
                            {urgency.label}: {new Date(task.next_due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => onQuickAdd(task.animals.id)}
                      className="flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Record</span>
                    </Button>
                  </div>
                </div>
              )
            })}
            
            {tasks.length > 5 && (
              <p className="text-sm text-gray-500 text-center pt-2">
                And {tasks.length - 5} more tasks...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}