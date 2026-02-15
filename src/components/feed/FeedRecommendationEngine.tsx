// src/components/feed/FeedRecommendationEngine.tsx

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AlertCircle, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react'

interface AnimalFeedingProfile {
  id: string
  tag_number: string
  production_status: string
  health_status: string
  days_in_milk: number | null
  lactation_number: number | null
  birth_date: string | null
  weight: number | null
  expected_calving_date: string | null
}

interface SuggestedFeed {
  feed_type_id: string
  feed_name: string
  quantity_kg_per_day: number
  notes?: string
}

interface FeedMixRecommendation {
  id: string
  trigger_reason: string
  confidence_score: number
  suggested_feeds: SuggestedFeed[]
  expected_benefits: string[]
  potential_risks: string[]
  alternative_recipes: string[]
  status: 'pending' | 'accepted' | 'rejected' | 'implemented'
}

interface FeedRecommendationEngineProps {
  animalId: string
  farmId: string
  animalProfile: AnimalFeedingProfile
  onRecommendationSelected?: (recommendation: FeedMixRecommendation) => void
  isLoading?: boolean
}

interface NutritionalNeeds {
  daily_dry_matter_kg: number
  daily_protein_kg: number
  daily_energy_mj: number
  daily_milk_production_target: number
}

export function FeedRecommendationEngine({
  animalId,
  farmId,
  animalProfile,
  onRecommendationSelected,
  isLoading = false,
}: FeedRecommendationEngineProps) {
  const [recommendations, setRecommendations] = useState<FeedMixRecommendation[]>([])
  const [nutritionalNeeds, setNutritionalNeeds] = useState<NutritionalNeeds | null>(null)
  const [isLoadingRecs, setIsLoadingRecs] = useState(false)
  const [acceptedRecommationId, setAcceptedRecommationId] = useState<string | null>(null)

  useEffect(() => {
    calculateNeeds()
    loadRecommendations()
  }, [animalId, animalProfile])

  function calculateNeeds(): NutritionalNeeds {
    const {
      production_status,
      days_in_milk,
      birth_date,
      weight,
      expected_calving_date,
      lactation_number,
    } = animalProfile

    // Calculate age in days
    const ageMs = birth_date ? Date.now() - new Date(birth_date).getTime() : 0
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))

    // Calculate pregnancy weeks if applicable
    let pregnancyWeeks = 0
    if (expected_calving_date) {
      const calvingMs = new Date(expected_calving_date).getTime() - Date.now()
      const calvingDays = Math.floor(calvingMs / (1000 * 60 * 60 * 24))
      pregnancyWeeks = Math.max(0, 280 - calvingDays) / 7
    }

    // Default weight if not available
    const currentWeight = weight || 600

    // Estimate daily milk production
    let dailyMilkTarget = 0
    if (production_status === 'lactating' && lactation_number) {
      dailyMilkTarget = 15 + (lactation_number > 3 ? 5 : lactation_number * 1.5)
    }

    // Base metabolic requirement (Mcal)
    const maintenanceKcal = 0.04 * Math.pow(currentWeight, 0.75) * 1000 * 4.184
    let additionalNeeds = 0

    // Lactation needs
    if (production_status === 'lactating' && days_in_milk && days_in_milk > 0) {
      const lactationFactor = getLactationFactor(days_in_milk)
      additionalNeeds += dailyMilkTarget * 3 * lactationFactor
    }

    // Growth needs
    if (ageDays < 730) {
      const dailyGainTarget = 0.7
      additionalNeeds += dailyGainTarget * 6
    }

    // Pregnancy needs
    if (production_status === 'served' && pregnancyWeeks > 0) {
      if (pregnancyWeeks >= 24 && pregnancyWeeks < 35) {
        additionalNeeds += 2
      } else if (pregnancyWeeks >= 35) {
        additionalNeeds += 4
      }
    }

    const totalEnergyMJ = maintenanceKcal + additionalNeeds

    // Protein requirement
    let proteinKg = 0.058 * currentWeight
    if (production_status === 'lactating') {
      const lactationFactor = getLactationFactor(days_in_milk || 0)
      proteinKg += dailyMilkTarget * 0.032 * lactationFactor
    }
    if (ageDays < 730) {
      proteinKg += 0.08
    }

    // Dry matter intake
    let dmiPercent = 2.8
    if (production_status === 'dry') dmiPercent = 1.8
    if (production_status === 'heifer') dmiPercent = 2.5

    const dryMatterKg = (currentWeight * dmiPercent) / 100

    const needs = {
      daily_dry_matter_kg: dryMatterKg,
      daily_protein_kg: proteinKg,
      daily_energy_mj: totalEnergyMJ,
      daily_milk_production_target: dailyMilkTarget,
    }

    setNutritionalNeeds(needs)
    return needs
  }

  async function loadRecommendations() {
    try {
      setIsLoadingRecs(true)
      const response = await fetch(
        `/api/farms/${farmId}/feed-recommendations?animalId=${animalId}`
      )
      if (!response.ok) throw new Error('Failed to load recommendations')
      
      const data = await response.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setIsLoadingRecs(false)
    }
  }

  async function acceptRecommendation(recommendationId: string) {
    try {
      const response = await fetch(
        `/api/farms/${farmId}/feed-recommendations/${recommendationId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'accepted' }),
        }
      )
      if (!response.ok) throw new Error('Failed to accept recommendation')
      setAcceptedRecommationId(recommendationId)

      const rec = recommendations.find((r) => r.id === recommendationId)
      if (rec) {
        onRecommendationSelected?.({ ...rec, status: 'accepted' })
      }
    } catch (error) {
      console.error('Error accepting recommendation:', error)
    }
  }

  function getLactationFactor(daysInMilk: number): number {
    if (daysInMilk <= 60) return 1.2
    if (daysInMilk <= 150) return 1.0
    if (daysInMilk <= 250) return 0.85
    return 0.7
  }

  function getTriggerReasons(): string[] {
    const reasons: string[] = []
    const { production_status, days_in_milk, health_status } = animalProfile

    if (production_status === 'lactating' && days_in_milk === 1) {
      reasons.push('Fresh cow - Just calved')
    } else if (production_status === 'lactating' && days_in_milk && days_in_milk <= 60) {
      reasons.push('Early lactation - High concentrate needs')
    } else if (production_status === 'lactating' && days_in_milk && days_in_milk <= 150) {
      reasons.push('Peak lactation - Optimize milk production')
    } else if (production_status === 'served' && animalProfile.expected_calving_date) {
      const daysToCalving = 
        (new Date(animalProfile.expected_calving_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      
      if (daysToCalving > 56) {
        reasons.push('Early pregnancy - Maintenance focus')
      } else if (daysToCalving <= 21) {
        reasons.push('Close-up period - Pre-calving ration')
      }
    }

    if (health_status === 'sick') {
      reasons.push('Health issue - Therapeutic adjustment')
    } else if (health_status === 'recovering') {
      reasons.push('Recovering - Support nutrition')
    }

    return reasons.length > 0 ? reasons : ['Regular feeding']
  }

  return (
    <div className="space-y-6">
      {/* Nutritional Needs Summary */}
      {nutritionalNeeds && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3">Daily Nutritional Requirements</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-600">Dry Matter</div>
              <div className="text-lg font-bold text-blue-600">
                {nutritionalNeeds.daily_dry_matter_kg.toFixed(1)} kg
              </div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-600">Crude Protein</div>
              <div className="text-lg font-bold text-blue-600">
                {nutritionalNeeds.daily_protein_kg.toFixed(2)} kg
              </div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-600">Energy</div>
              <div className="text-lg font-bold text-blue-600">
                {nutritionalNeeds.daily_energy_mj.toFixed(0)} MJ
              </div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-600">Milk Target</div>
              <div className="text-lg font-bold text-blue-600">
                {nutritionalNeeds.daily_milk_production_target} L
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Trigger Reasons */}
      <div className="space-y-2">
        <h4 className="font-semibold">Why These Recommendations</h4>
        <div className="space-y-2">
          {getTriggerReasons().map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2 bg-amber-50 rounded border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-amber-900">{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        <h4 className="font-semibold">
          Recommended Recipes {recommendations.length > 0 && `(${recommendations.length})`}
        </h4>

        {isLoadingRecs ? (
          <div className="text-center py-8 text-gray-500">Loading recommendations...</div>
        ) : recommendations.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded text-center text-gray-600 text-sm">
            No matching recipes found for this animal's current condition.
            <br />
            <span className="text-xs text-gray-500">
              Create recipes with matching conditions in Feed Mix Recipes
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <Card
                key={rec.id}
                className={`p-4 transition-colors ${
                  rec.status === 'accepted' || acceptedRecommationId === rec.id
                    ? 'bg-green-50 border-green-300'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-semibold flex items-center gap-2">
                        {rec.status === 'accepted' || acceptedRecommationId === rec.id ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        )}
                        {rec.trigger_reason}
                      </h5>
                      <p className="text-xs text-gray-600">
                        {rec.suggested_feeds?.length || 0} ingredients • Confidence:{' '}
                        <span className="font-semibold text-amber-600">{rec.confidence_score}%</span>
                      </p>
                    </div>
                    {rec.status !== 'accepted' && acceptedRecommationId !== rec.id && (
                      <Button
                        size="sm"
                        onClick={() => acceptRecommendation(rec.id)}
                        disabled={isLoading}
                      >
                        Apply
                      </Button>
                    )}
                  </div>

                  {/* Suggested feeds */}
                  {rec.suggested_feeds && rec.suggested_feeds.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded space-y-2">
                      <div className="text-xs font-semibold text-blue-900">Feed Mix:</div>
                      <div className="space-y-1">
                        {rec.suggested_feeds.map((feed, idx) => (
                          <div key={idx} className="flex justify-between text-sm text-blue-800">
                            <span>{feed.feed_name || feed.feed_type_id}</span>
                            <span className="font-semibold">{feed.quantity_kg_per_day.toFixed(1)} kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Benefits & Risks */}
                  <div className="grid grid-cols-2 gap-3">
                    {rec.expected_benefits && rec.expected_benefits.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-green-700 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Benefits
                        </div>
                        <ul className="text-xs text-green-600 space-y-0.5">
                          {rec.expected_benefits.map((benefit, idx) => (
                            <li key={idx}>• {benefit}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rec.potential_risks && rec.potential_risks.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Risks
                        </div>
                        <ul className="text-xs text-orange-600 space-y-0.5">
                          {rec.potential_risks.map((risk, idx) => (
                            <li key={idx}>• {risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Alternative recipes */}
                  {rec.alternative_recipes && rec.alternative_recipes.length > 0 && (
                    <div className="text-xs text-gray-600 pt-2 border-t">
                      <span className="font-semibold">Alternatives: </span>
                      {rec.alternative_recipes.map((alt: string | { name: string }, idx) => (
                        <span key={idx}>
                          {idx > 0 && ' • '}
                          {typeof alt === 'string' ? alt : alt.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
