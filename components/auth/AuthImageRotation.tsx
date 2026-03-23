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
    <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-zinc-900 shadow-2xl">
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
              alt="Fashion Inspiration"
              className="h-full w-full object-cover opacity-60 brightness-75 grayscale-[0.2]"
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      
      <div className="absolute bottom-12 left-12 right-12 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          <div className="h-0.5 w-12 bg-zinc-400 mb-6" />
          <h3 className="font-editorial text-4xl lg:text-5xl text-white leading-tight tracking-tight">
            Redefining Fashion <br />
            <span className="italic opacity-80 decoration-zinc-500 underline underline-offset-8">Management.</span>
          </h3>
        </motion.div>
      </div>

      <div className="absolute top-12 left-12">
         <span className="text-[0.65rem] font-bold uppercase tracking-[0.4em] text-white/40 vertical-text">
            © {new Date().getFullYear()} VendoFlow Labs
         </span>
      </div>
    </div>
  )
}
