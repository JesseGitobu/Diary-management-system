// Create this file: src/lib/hooks/useAnimalData.ts

import { useState, useEffect } from 'react'

export function useAnimalData(initialAnimal: any, refreshTrigger?: any) {
  const [animalData, setAnimalData] = useState(initialAnimal)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Update when initial animal prop changes
  useEffect(() => {
    setAnimalData(initialAnimal)
  }, [initialAnimal])

  // Force refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger) {
      refreshAnimalData()
    }
  }, [refreshTrigger])

  const refreshAnimalData = async () => {
    if (!initialAnimal?.id) return

    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/animals/${initialAnimal.id}`)
      if (response.ok) {
        const { animal: updatedAnimal } = await response.json()
        setAnimalData(updatedAnimal)
      }
    } catch (error) {
      console.error('Error refreshing animal data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return { animalData, isRefreshing, refreshAnimalData }
}