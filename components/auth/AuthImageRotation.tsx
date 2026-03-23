"use client"

import { useState, useEffect } from "react"
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

const ROTATION_INTERVAL = 600000 // 10 minutes

export function AuthImageRotation() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % IMAGES.length)
    }, ROTATION_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-zinc-800">
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={IMAGES[index]}
          alt="Fashion Design"
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      </AnimatePresence>
      
      {/* Overlay for subtle texture and high-end feel */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-12 left-12 right-12">
        <div className="h-0.5 w-12 bg-white/30 mb-6" />
        <h2 className="font-editorial text-2xl text-white/90 leading-tight">
          Redefining Fashion <br />
          Management.
        </h2>
      </div>
    </div>
  )
}
