"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import { supabase } from '@/lib/supabaseClient';
import LoadingIndicator from "../LoadingIndicator";
import LoadingButton from "../LoadingButton";

export default function RecordVideo() {
  const [recording, setRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const [step, setStep] = useState("record");
  const [videoName, setVideoName] = useState("Journal Entry");
  const [description, setDescription] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [uploading, setUploading] = useState(false);

  const maxLen = 10;

  const videoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const router = useRouter();

  useEffect(() => {
    async function initCamera() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }
    initCamera();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = () => {
  chunksRef.current = [];
  const recorder = new MediaRecorder(mediaStream);
  recorderRef.current = recorder;

  recorder.ondataavailable = event => {
    if (event.data.size > 0) {
      chunksRef.current.push(event.data);
    }
  };

  recorder.onstop = () => {
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    setRecordedVideo({ blob, url });
    setStep("preview");
    fetchContacts();
    setSeconds(0); // reset timer
  };

  recorder.start();
  setRecording(true);
  setSeconds(0);

  const timer = setInterval(() => {
    setSeconds(prev => {
      if (prev + 1 >= maxLen) {
        clearInterval(timer);
        stopRecording();
        return maxLen;
      }
      return prev + 1;
    });
  }, 1000);

  // Store timer ref to clear manually if needed
  recorderRef.current._timer = timer;
};


  const stopRecording = () => {
  if (recorderRef.current?._timer) {
    clearInterval(recorderRef.current._timer);
  }
  recorderRef.current.stop();
  setRecording(false);
};


  const handleSave = async () => {
    if (uploading) return;
    setUploading(true);
    if (!recordedVideo?.blob) return alert("No video recorded!");

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
    alert("You must be logged in to upload.");
    return;
    }

    const formData = new FormData();
    formData.append("file", new File([recordedVideo.blob], "video.mp4", { type: "video/mp4" }));
    formData.append('name', videoName);
    formData.append('description', description);
    formData.append("contacts", selectedContacts);

    try {
      const response = await fetch("https://livinglegacy.fly.dev/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        console.error(await response.text());
        throw new Error("Upload failed");
      }
      const result = await response.json();

      console.log("Upload success!");
      alert("Journal entry uploaded successfully.");
      router.push("/journal");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
};

const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) {
          alert("You are no longer logged in.");
          router.push('/login');
          return;
        }

        const result = await fetch('https://livinglegacy.fly.dev/get_contacts', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const ctc = await result.json();
        
        setContacts(ctc);
      } catch (err) {
        console.error('Failed to fetch counts:', err);
      } finally {
        setLoadingContacts(false);
      }
    }

  const toggleContact = id =>
  setSelectedContacts(prev =>
    prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
  );

  const FadeUp = ({ children, delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );

  const [seconds, setSeconds] = useState(0);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60).toString().padStart(1, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
    };


  const Title = ({curStage}) => (
     <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0 }}
    >
      <h1 className="text-3xl font-semibold text-cyan-950">
        {curStage === "record" ? "Record your message" : "Add details and save"}
      </h1>
    </motion.div>
  )

  const title = useMemo(() => <Title curStage={step}/>, [step]);

  return (
    <div className="min-h-screen w-full relative p-6">
      <span onClick={() => {
        if (step === "record") router.back();
        else setStep("record");
      }} className="cursor-pointer flex flex-row gap-1 text-lg items-center font-medium mb-6">
        <ChevronLeftIcon className="w-6 h-6" /> Back
      </span>
      <div className="flex flex-col items-center gap-6 max-w-xl mx-auto">
        { title }

        <div className="relative rounded-2xl overflow-hidden p-6 bg-white/40 backdrop-blur-2xl shadow-sm">
        <div className="relative w-[640px] h-[480px] overflow-hidden rounded-xl">
        { step === 'record' &&
        <>
          <video ref={videoRef} autoPlay muted className="w-[640px] h-[480px] bg-black" />
          {recording && (
              <div className="absolute bottom-2 right-4 bg-black/60 backdrop-blur-sm shadow-sm text-white px-2 py-1 rounded-md font-mono text-xl">
              {formatTime(seconds)} / {formatTime(maxLen)}
              </div>
          )}
        </>
        }
        { step === 'preview' && recordedVideo &&
        <video controls preload="metadata" src={recordedVideo.url} className="w-full rounded-xl border shadow-md" />
        }
        </div>
        </div>

        {step === "record" && (
          <div className="cursor-pointer flex gap-4 mt-4">
            {!recording ? (
              <button onClick={startRecording} className="px-6 py-3 rounded-2xl bg-cyan-600/60 backdrop-blur-2xl shadow-sm text-white font-semibold">
                Start Recording
              </button>
            ) : (
              <button onClick={stopRecording} className="px-6 py-3 rounded-2xl bg-red-600/60 backdrop-blur-2xl shadow-sm text-white font-semibold">
                Stop Recording
              </button>
            )}
          </div>
      )}

      {step === "preview" && recordedVideo && (
        <>
          <div className="w-full flex flex-col gap-1">
        <h1 className=" text-sm text-cyan-900">Entry Name</h1>
          <input
            type="text"
            value={videoName}
            onChange={e => setVideoName(e.target.value)}
            placeholder="Video name"
            className="w-full px-4 py-3 border border-cyan-900 text-cyan-900 focus:outline-none focus:ring-0 focus:border-cyan-400 bg-[#b2e6eb] rounded-xl"
          />
        </div>

        <div className="w-full flex flex-col gap-1">
        <h1 className=" text-sm text-cyan-900">Entry Description</h1>
          <textarea
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full px-4 py-3 border border-cyan-900 text-cyan-900 focus:outline-none focus:ring-0 focus:border-cyan-400 bg-[#b2e6eb] rounded-xl"
          />
        </div>

          <div className="w-full flex flex-col gap-1">
            <h1 className="text-sm text-cyan-900">Video is for:</h1>
            <div className="flex gap-2 flex-wrap">
              {loadingContacts ? <LoadingIndicator/> : contacts.length === 0 ? <p>No contacts present. Go to Settings to add some!</p> : contacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => toggleContact(contact.id)}
                  className={`cursor-pointer px-4 py-2 rounded-full border ${
                    selectedContacts.includes(contact.id)
                      ? "bg-cyan-800 text-[#b2e6eb]"
                      : "bg-[#b2e6eb] text-cyan-900"
                  }`}
                >
                  {contact.name}
                </button>
              ))}
            </div>
          </div>

          <LoadingButton active={selectedContacts.length !== 0 && videoName.length !== 0} loading={uploading} text="Save" onClick={() => {if (selectedContacts.length !== 0 && videoName.length !== 0) handleSave()}}/>
        </>
      )}

      </div> 
    </div>
  );
}
