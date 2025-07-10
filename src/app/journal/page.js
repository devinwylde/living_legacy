"use client";
import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import {VideoCameraIcon, MicrophoneIcon, ChevronLeftIcon, TrashIcon} from '@heroicons/react/24/solid';
import LoadingIndicator from '../LoadingIndicator';
import AudioPlayback from '../AudioPlayback';

export default function Journal() {
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [videoCount, setVideoCount] = useState(999);
  const [audioCount, setAudioCount] = useState(999);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [pastEntries, setPastEntries] = useState([]);
  const [loadingOpenedJournal, setLoadingOpenedJournal] = useState(true);
  const [openedJournal, setOpenedJournal] = useState(null);
  const [openedJournalUri, setOpenedJournalUri] = useState(null);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const router = useRouter();

  

  useEffect(() => {
    const fetchCounts = async () => {
      setLoadingCounts(true);
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) {
          alert("You are no longer logged in.");
          router.push('/login');
          return;
        }

        const result = await fetch('https://livinglegacy.fly.dev/upload_stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const counts = await result.json();
        console.log(counts);

        setVideoCount(counts.videoCount);
        setAudioCount(counts.audioCount);
      } catch (err) {
        console.error('Failed to fetch counts:', err);
      } finally {
        setLoadingCounts(false);
      }
    }

    const fetchPastEntries = async () => {
      setLoadingEntries(true);
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) {
          alert("You are no longer logged in.");
          router.push('/login');
          return;
        }

        const result = await fetch('https://livinglegacy.fly.dev/get_journals', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const { journals } = await result.json();

        const entriesWithThumbs = await Promise.all(journals.map(async (entry) => {
          if (!entry.thumbnail_key) return entry;
          const thumbRes = await fetch('https://livinglegacy.fly.dev/get_thumbnail', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ thumbnailKey: entry.thumbnail_key }),
          });
          const blob = await thumbRes.blob();
          const thumbUrl = URL.createObjectURL(blob);
          return { ...entry, thumbnailUrl: thumbUrl };
        }));

        setPastEntries(entriesWithThumbs);
      } catch (err) {
        console.error('Failed to fetch report:', err);
      } finally {
        setLoadingEntries(false);
      }
    };


    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login');
      } else {
        fetchCounts();
        fetchPastEntries();
      }
    });
  }, [router]);

  const fetchOpenJournal = async (fileKey) => {
    try {
      setLoadingOpenedJournal(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        alert("You are no longer logged in.");
        router.push('/login');
        return;
      }

      const result = await fetch('https://livinglegacy.fly.dev/get_journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileKey }),
      });

      if (result.ok) {
        const blob = await result.blob();
        const url = URL.createObjectURL(blob);
        setOpenedJournalUri(url);
      } else {
        console.log(await result.text());
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoadingOpenedJournal(false);
    }
  }

  const TappableRecord = ({ name, icon, count, maxCount, route, delay = 0 }) => (
    <FadeUp delay={delay}>
        <div className='flex flex-col items-start'>
        <div onClick={() => {
          if (count < maxCount) router.push(route);
          }} className={`rounded-full gap-4 backdrop-blur-2xl shadow-sm px-8 py-5 flex items-center justify-center ${count < maxCount ? 'hover:scale-105 cursor-pointer bg-white/40' : 'cursor-not-allowed bg-red-200/40'} transition-transform`}>
          {icon}
          <p className="text-center font-semibold text-2xl text-cyan-900">{name}</p>
        </div>
        <p className={`ml-3 mt-3 ${count < maxCount ? 'text-cyan-700 font-light italic' : 'text-[#aa5533]'}`}>{count}/{maxCount} credits used this month.</p>
      </div>
    </FadeUp>
  );

  const FadeUp = ({ children, delay = 0 }) => {
    const controls = useAnimation();
    const [ref, inView] = useInView({ triggerOnce: true });

    useEffect(() => {
      if (inView) {
        controls.start({ opacity: 1, y: 0 });
      }
    }, [inView, controls]);

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={controls}
        transition={{ duration: 0.5, delay }}
      >
        {children}
      </motion.div>
    );
  };

  const readableDate = (dateString) => {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  const TappableEntry = ({ entry, delay = 0.15 }) => (
    <FadeUp delay={delay}>
        <div
          onClick={() => {
            setOpenedJournal(entry);
            fetchOpenJournal(entry.file_key);
          }}
          className='w-60 rounded-xl bg-white/40 backdrop-blur-2xl shadow-sm p-4 flex flex-col items-start hover:scale-105 cursor-pointer transition-transform'
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEntryToDelete(entry);
              setShowConfirm(true);
            }}
            className="absolute top-2 right-2 bg-white hover:bg-red-700 p-1 rounded-md  text-red-700 hover:text-white"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          {entry.thumbnailUrl ? (
            <img
              src={entry.thumbnailUrl}
              alt="Thumbnail"
              className="rounded-md mb-2 w-full h-[120px] object-cover"
            />
          ) : entry.type === 0 ? 
          <div className='rounded-md mb-2 w-full h-[120px] bg-cyan-500/40 flex items-center justify-center'><VideoCameraIcon className='w-16 h-16 fill-cyan-900'/></div>
          : <div className='rounded-md mb-2 w-full h-[120px] bg-cyan-500/40 flex items-center justify-center'><MicrophoneIcon className='w-16 h-16 fill-cyan-900'/></div>
          }
          <p className="font-medium text-sm text-cyan-900 mt-1">{readableDate(entry.uploaded_at)}</p>
          <p className="font-bold text-xl text-cyan-900 line-clamp-1">{entry.name}</p>
          <div className='flex gap-1 mt-2'>
            {
              entry.invited_contacts.slice(0, 2).map(name => (
                <div key={name} className="cursor-pointer px-2 py-1 rounded-full border bg-cyan-800 text-[#b2e6eb] text-xs">
                  {name}
                </div>
              ))
            }
            {entry.invited_contacts.length - 2 > 0 && <div className="cursor-pointer px-2 py-1 rounded-full border bg-cyan-800 text-[#b2e6eb] text-xs">
                  +{entry.invited_contacts.length - 2}
            </div>}
          </div>
        </div>
    </FadeUp>
  );

  const Header1 = () => (
    <FadeUp delay={0.05}>
      <h1 className="text-3xl font-semibold mb-6 text-cyan-950">Record a new entry</h1>
    </FadeUp>
  );

  const Header2 = () => (
    <FadeUp delay={0.2}>
      <h1 className="text-3xl font-semibold text-cyan-950 mt-10 mb-6">Past entries</h1>
    </FadeUp>
  );

  const RecordButtons = ({isLoading}) => (
    <>
      { isLoading ? <FadeUp delay={0.2}><LoadingIndicator/></FadeUp> :
        <div className='flex flex-row flex-wrap gap-6'>
          <TappableRecord name="Video Journal" count={videoCount} maxCount={3} delay={0.1} route={'/record-video'} icon={<VideoCameraIcon className='w-10 h-10 fill-cyan-900'/>}/>
          <TappableRecord name="Audio Journal" count={audioCount} maxCount={5} delay={0.15} route={'/record-audio'} icon={<MicrophoneIcon className='w-10 h-10 fill-cyan-900'/>}/>
        </div>
      }
    </>
  );

  const PastEntryTiles = ({isLoading, entries}) => (
    <>
      { isLoading ? <FadeUp delay={0.2}><LoadingIndicator/></FadeUp> :
        <div className='flex flex-row flex-wrap gap-6'>
        {entries.length === 0 ? <FadeUp delay={0.1}><p>You haven&apos;t recorded any journals yet!</p></FadeUp> : entries.map(entry => (
          <TappableEntry key={entry.id} entry={entry}/>
        ))}
        </div>
      }
    </>
  )

  const ConfirmDeleteModal = () => (
  <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black/50 z-50">
    <div className="bg-white p-6 rounded-xl shadow-lg w-96 text-center">
      <h2 className="text-xl font-semibold mb-4">Delete Journal?</h2>
      <p className="mb-6 text-gray-700">Are you sure you want to delete “{entryToDelete?.name}”?</p>
      <div className="flex justify-center gap-4">
        <button onClick={() => setShowConfirm(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded">
          Cancel
        </button>
        <button
          onClick={async () => {
            try {
              const token = (await supabase.auth.getSession()).data.session?.access_token;
              const res = await fetch(`https://livinglegacy.fly.dev/journal/${entryToDelete.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                }
              });
              if (res.ok) {
                setPastEntries(prev => prev.filter(entry => entry.id != entryToDelete.id));
              } else {
                console.error(await res.text());
              }
            } catch (err) {
              console.error('Failed to delete:', err);
            } finally {
              setShowConfirm(false);
            }
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

  const header1 = useMemo(() => <Header1/>, []);
  const recordButtons = useMemo(() => <RecordButtons isLoading={loadingCounts}/>, [loadingCounts]);
  const header2 = useMemo(() => <Header2/>, []);
  const pastEntryTiles = useMemo(() => <PastEntryTiles isLoading={loadingEntries} entries={pastEntries}/>, [loadingEntries, pastEntries]);
  
  
    return (
        <div className=''>
            <div className='absolute p-6 w-full min-h-screen'>
                <span onClick={() => router.push('/')} className='cursor-pointer flex flex-row gap-1 text-lg items-center font-medium'><ChevronLeftIcon className='w-6 h-6'/>Back</span>
            </div>
            <div className="flex min-h-screen flex-col p-10 justify-center">
              
              { header1 }
              { recordButtons }
              { header2 }
              { pastEntryTiles }
              
            </div>
            { openedJournal &&
              <div className='absolute top-0 flex items-center justify-center p-6 w-full min-h-screen'>
                <div className='w-4xl p-4 bg-white/40 backdrop-blur-2xl shadow-sm rounded-3xl'>
                <button onClick={() => setOpenedJournal(null)}>Close</button>
                <h2 className='font-bold text-2xl py-2'>{openedJournal.name}</h2>
                {loadingOpenedJournal ? (
                  <div className='w-full flex justify-center'><LoadingIndicator /></div>
                ) : openedJournal.type === 1 ? (
                  <AudioPlayback url={openedJournalUri} />
                ) : (
                  <video className='rounded-3xl' controls width="100%">
                    <source src={openedJournalUri} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}
                <p className='font-medium text-base mt-2'>{readableDate(openedJournal.uploaded_at)}</p>
                {openedJournal.description && <p className='font-medium text-lg italic'>&quot;{openedJournal.description}&quot;</p>}
                </div>
              </div>
            }
            {showConfirm && <ConfirmDeleteModal />}
        </div>
      
    );
}
