import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingVoteProps {
  id: string;
  x: number;
  y: number;
}

export default function FloatingVote({ id, x, y }: FloatingVoteProps) {
  return (
    <AnimatePresence>
      <motion.div
        key={id}
        initial={{ opacity: 1, y: 0, scale: 0.5 }}
        animate={{ opacity: 0, y: -40, scale: 1.2 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="pointer-events-none fixed z-50 text-xl font-bold text-yellow-400 drop-shadow-lg"
        style={{ left: x, top: y }}
      >
        +1
      </motion.div>
    </AnimatePresence>
  );
}
