// src/components/support/HelpCenter.tsx
'use client'

import { useState } from 'react'
import { Search, ChevronRight, Zap, Heart, TrendingUp, Rocket, CreditCard, MessageSquare } from 'lucide-react'
import { HELP_ARTICLES, SUPPORT_CATEGORIES } from '@/types/support'
import { Button } from '@/components/ui/Button'

interface HelpCenterProps {
  onContactClick: () => void
}

const iconMap: Record<string, any> = {
  Rocket,
  Heart,
  TrendingUp,
  Zap,
  CreditCard,
  MessageSquare,
}

export function HelpCenter({ onContactClick }: HelpCenterProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredArticles = selectedCategory
    ? HELP_ARTICLES[selectedCategory as keyof typeof HELP_ARTICLES] || []
    : Object.values(HELP_ARTICLES).flat()

  const displayArticles = searchQuery.trim()
    ? filteredArticles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredArticles

  return (
    <div className="p-6 space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
        />
      </div>

      {/* Categories */}
      {!selectedCategory && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Browse by Category</h3>
          <div className="grid grid-cols-2 gap-3">
            {SUPPORT_CATEGORIES.map((category) => {
              const Icon = iconMap[category.icon] || MessageSquare
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-dairy-primary hover:bg-dairy-primary/5 transition-all text-left"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 text-dairy-primary flex-shrink-0" />
                    <span className="font-medium text-sm text-gray-700">{category.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Articles */}
      <div className="space-y-3">
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center space-x-2 text-dairy-primary hover:text-dairy-primary/80 text-sm font-medium mb-4"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Categories
          </button>
        )}

        {displayArticles.length > 0 ? (
          displayArticles.map((article) => (
            <details
              key={article.id}
              className="group border border-gray-200 rounded-lg overflow-hidden hover:border-dairy-primary transition-colors"
            >
              <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50">
                <div className="text-left">
                  <h4 className="font-medium text-gray-900">{article.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{article.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-4" />
              </summary>
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{article.content}</p>
              </div>
            </details>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No articles found. Try a different search or contact support.</p>
          </div>
        )}
      </div>

      {/* Contact Support CTA */}
      <div className="mt-8 p-4 bg-dairy-primary/5 border border-dairy-primary/20 rounded-lg">
        <p className="text-sm text-gray-700 mb-4">
          Can't find what you're looking for? Our support team is here to help!
        </p>
        <Button
          onClick={onContactClick}
          className="w-full bg-dairy-primary hover:bg-dairy-primary/90 text-white"
        >
          Contact Support
        </Button>
      </div>
    </div>
  )
}