"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

const IMAGES = [
  "/assets/auth/fashion-1.webp",
  "/assets/auth/fashion-2.webp",
  "/assets/auth/fashion-3.webp",
  "/assets/auth/fashion-4.webp",
  "/assets/auth/fashion-5.webp",
  "/assets/auth/fashion-6.webp",
  "/assets/auth/fashion-7.webp",
  "/assets/auth/fashion-8.webp",
  "/assets/auth/fashion-9.webp",
  "/assets/auth/fashion-10.webp",
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
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-zinc-900 shadow-2xl">
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

      {/* Decorative Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 flex flex-col justify-between p-8">
        <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-white/60">
          © {new Date().getFullYear()} VENDOFLOW LABS
        </p>
        
        <div>
          <div className="w-8 h-px bg-white/60 mb-4" />
          <p className="font-editorial text-4xl font-bold text-white leading-tight">
            Redefining Fashion<br />
            <em className="italic text-white/80">Tech.</em>
          </p>
          <div className="w-12 h-px bg-white/60 mt-3" />
        </div>
      </div>
    </div>
  )
}
