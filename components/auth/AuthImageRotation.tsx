"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

const IMAGES = [
  "/assets/auth/fashion-1.png",
  "/assets/auth/fashion-2.png",
  "/assets/auth/fashion-3.png",
  "/assets/auth/fashion-4.png",
  "/assets/auth/fashion-5.png",
]

const ROTATION_INTERVAL = 10 * 60 * 1000 // 10 minutes

export function AuthImageRotation() {
  const [index, setIndex] = React.useState(0)
  const [imageExists, setImageExists] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    // Check if images exist to avoid showing broken links
    IMAGES.forEach((url) => {
      const img = new Image()
      img.src = url
      img.onload = () => setImageExists((prev) => ({ ...prev, [url]: true }))
    })

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % IMAGES.length)
    }, ROTATION_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  const activeImageUrl = IMAGES[index]
  const doesActiveImageExist = imageExists[activeImageUrl]

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-zinc-950 shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeImageUrl}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {doesActiveImageExist ? (
            <img
              src={activeImageUrl}
              alt="Fashion"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
              <span className="font-editorial text-zinc-800 text-6xl opacity-20 select-none">
                Fashion Design
              </span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
