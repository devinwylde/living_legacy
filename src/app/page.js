"use client";
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import {VideoCameraIcon, PhotoIcon, FolderIcon, CogIcon} from '@heroicons/react/24/solid';
import LoadingIndicator from './LoadingIndicator';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [checkInButtonLoading, setCheckInButtonLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [firstName, setFirstName] = useState(null);
  
  const router = useRouter();

  const pushCheckIn = async () => {
    setCheckInButtonLoading(true);

      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) {
          alert("You are no longer logged in.");
          router.push('/login');
          return;
        }

        const result = await fetch('https://livinglegacy.fly.dev/check_in',{
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!result.ok) throw new Error("Push failed"); 

        setLastCheckIn(0);
        setProgress(100);
      } catch (err) {
        console.error('Failed to fetch check in:', err);
      } finally {
        setCheckInButtonLoading(false);
      }
  }

  useEffect(() => {
    const fetchCheckIn = async () => {
      setLoading(true);

      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) {
          alert("You are no longer logged in.");
          router.push('/login');
          return;
        }

        const result = await fetch('https://livinglegacy.fly.dev/user_details', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!result.ok) {
          console.log(await result.text());
          throw Error('Failed to fetch data');
        }
        
        const data = await result.json();

        const millisecondsPerDay = 1000 * 60 * 60 * 24;
        const daysPassed = Math.max(Math.floor((new Date() - new Date(data.checked_in)) / millisecondsPerDay), 0);

        const totalTime = 60;

        setLastCheckIn(daysPassed);
        setProgress((totalTime - daysPassed) * 100 / totalTime);
        setFirstName(data.first_name);
      } catch (err) {
        console.error('Failed to fetch check in:', err);
      } finally {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login');
      } else {
        fetchCheckIn();
      }
    });
  }, [router]);

  const Tappable = ({ name, icon, route, delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className='flex flex-col gap-4 items-center'>
        <div onClick={() => router.push(route)} className='px-4 sm:px-0 rounded-4xl gap-4 bg-white/40 backdrop-blur-2xl shadow-sm w-full sm:w-48 h-24 sm:h-48 flex items-center justify-between sm:justify-center hover:scale-105 cursor-pointer transition-transform'>
          {icon}
          <p className="flex sm:hidden text-center font-semibold text-3xl text-cyan-900">{name}</p>
        </div>
        <p className="hidden sm:flex text-center font-semibold text-3xl text-cyan-900">{name}</p>
      </div>
    </motion.div>
  );

  const Header = ({name}) => (
        <h1 className="text-4xl sm:text-5xl w-full text-center font-semibold mb-12 text-cyan-950">{ name ? "Welcome, " + name : "Welcome back"}</h1>
  )

    const UpperPortion = () => (
      <>
        <div className='flex flex-col sm:flex-row gap-8 flex-wrap justify-center w-full'>
          <Tappable name="Journal" delay={0.05} route={'/journal'} icon={<VideoCameraIcon className='w-12 h-12 sm:w-32 sm:h-32 fill-cyan-900'/>}/>
          <Tappable name="Scrapbook" delay={0.1} route={'/scrapbook'} icon={<PhotoIcon className='w-12 h-12 sm:w-32 sm:h-32 fill-cyan-900'/>}/>
          <Tappable name="Folder" delay={0.15} route={'/folder'} icon={<FolderIcon className='w-12 h-12 sm:w-32 sm:h-32 fill-cyan-900'/>}/>
          <Tappable name="Settings" delay={0.2} route={'/settings'} icon={<CogIcon className='w-12 h-12 sm:w-32 sm:h-32 fill-cyan-900'/>}/>
        </div>
      </>
    );

    const upperPortion = useMemo(() => <UpperPortion/>, []);
    const header = useMemo(() => <Header name={firstName}/>, [firstName]);
  
    return (
      <div className="w-full min-h-screen flex flex-col p-6 pt-10 items-center justify-center">
      { loading ? <LoadingIndicator/> : 
      <>
        {header}
        { upperPortion }

        <div className="w-full max-w-4xl flex flex-col items-center gap-4 mt-20">
          <div className="w-full h-6 bg-cyan-200 rounded-full overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-500"
          />
        </div>
        <div className="flex w-full justify-between items-start text-cyan-900">
          <p className="text-xl font-medium">{lastCheckIn ?? 'N/A'} days since your last check-in</p>
          <button
            onClick={pushCheckIn}
            className="cursor-pointer bg-cyan-900 text-white px-6 py-2 rounded-xl font-semibold hover:bg-cyan-800 transition-colors"
          >
            { checkInButtonLoading ? <LoadingIndicator/> : 'Check in'}
          </button>
        </div>
      </div>
        </>
        }
      </div>
    );
}
