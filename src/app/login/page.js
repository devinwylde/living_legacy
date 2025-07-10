'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center">
      <motion.div
        className="h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 1,
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    setLoading(true);
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/'); // Redirect after login
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-white/60 backdrop-blur-2xl shadow-sm items-center flex flex-col rounded-lg p-8 max-w-sm w-full space-y-6">
        <Image
            src="/logo.png"
            className='w-32'
            width={914}
            height={369}
            alt="logo"
        />

        <div className='w-full'>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            type="email"
            id="email"
            required
            className="w-full px-4 py-2 mt-1 border border-cyan-900 text-cyan-900 focus:outline-none focus:ring-0 focus:border-cyan-400 bg-[#b2e6eb] rounded-xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className='w-full'>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            required
            className="w-full px-4 py-2 mt-1 border border-cyan-900 text-cyan-900 focus:outline-none focus:ring-0 focus:border-cyan-400 bg-[#b2e6eb] rounded-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-cyan-700/70 backdrop-blur-2xl shadow-sm text-white py-2 rounded-2xl hover:bg-cyan-600"
        >
          {loading ? <LoadingSpinner/> : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
