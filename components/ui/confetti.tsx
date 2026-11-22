"use client"

import React, { useSyncExternalStore } from 'react'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'

// false on the server and during hydration, true afterwards — renders only on the client without
// a hydration mismatch (and without a setState-in-effect re-render).
const subscribe = () => () => {}
const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false)

export function SuccessConfetti() {
    const { width, height } = useWindowSize()
    const isClient = useIsClient()

    if (!isClient) return null

    return (
        <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={600}
            gravity={0.15}
            colors={['#849b87', '#d4c5b9', '#e0d5ce', '#bc9c82', '#9faca2']} // Muted sage greens, warm blush, taupe, and subtle gold for an elegant floral palette
        />
    )
}
