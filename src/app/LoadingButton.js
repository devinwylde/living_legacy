"use client";
import { motion } from 'framer-motion';

const LoadingButton = ({text, active = true, loading = false, onClick = (() => {})}) => (
    <button
    onClick={onClick}
    className={`mt-4 px-6 py-3 ${active ? 'bg-cyan-800 cursor-pointer' : 'bg-gray-500'} text-white rounded-xl font-semibold w-full flex items-center justify-center`}
    >
    {loading ? <motion.div
      className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{
        repeat: Infinity,
        ease: "easeInOut",
        duration: 1,
      }}
    /> : text}
    </button>

    
);

export default LoadingButton;
