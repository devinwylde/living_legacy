"use client";
import { motion } from 'framer-motion';

export default function LoadingIndicator() {
  return (
    <motion.div
      className="h-12 w-12 border-4 border-blue-400 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{
        repeat: Infinity,
        ease: "easeInOut",
        duration: 1,
      }}
    />
  );
}
