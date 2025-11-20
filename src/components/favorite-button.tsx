'use client'

import { useState } from 'react'
import { addVideoToFavorites } from '@/app/actions'
import { Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  videoId: string;
  videoTitle: string;
}

export default function FavoriteButton({ videoId, videoTitle }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault() 
    setIsLoading(true)

    const result = await addVideoToFavorites(videoId, videoTitle)
    
    setIsLoading(false)

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      setIsFavorited(true)
      toast({
        title: "Success",
        description: result.message,
      })
    }
  }

  return (
    <button 
      onClick={handleFavorite} 
      disabled={isLoading}
      aria-label="Favorite this video"
      className="p-2 rounded-full hover:bg-muted disabled:opacity-50"
    >
      <Star className={cn(
        "h-5 w-5 transition-colors",
        isFavorited 
          ? "text-yellow-400 fill-yellow-400" 
          : "text-gray-400 hover:text-yellow-400"
      )} />
    </button>
  )
}
