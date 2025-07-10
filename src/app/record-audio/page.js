"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, PlayIcon, PauseIcon, ForwardIcon, BackwardIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import LoadingIndicator from "../LoadingIndicator";
import { useWavesurfer } from "@wavesurfer/react";
import WaveSurfer from "wavesurfer.js";
import AudioPlayback from "../AudioPlayback";
import LoadingButton from "../LoadingButton";

export default function RecordAudio() {
  const [recording, setRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const [step, setStep] = useState("record");
  const [audioName, setAudioName] = useState("Journal Entry");
  const [description, setDescription] = useState("");
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  const previewWaveformRef = useRef(null);

  const router = useRouter();
  const maxLen = 180;

  useEffect(() => {
    startWaveform();

    return () => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationRef.current);
    };
    }, []);

  const drawWaveform = (analyser, canvasCtx) => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let previousDataArray = new Float32Array(bufferLength).fill(128);

    const SMOOTHING_FACTOR = 0.5; // closer to 1 = smoother

    const draw = () => {
    analyser.getByteTimeDomainData(dataArray);

    // Apply smoothing
    for (let i = 0; i < bufferLength; i++) {
        previousDataArray[i] =
        previousDataArray[i] * SMOOTHING_FACTOR + dataArray[i] * (1 - SMOOTHING_FACTOR);
    }

    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    canvasCtx.lineWidth = 4;
    canvasCtx.strokeStyle = "#075985";

    canvasCtx.beginPath();
    const sliceWidth = canvasRef.current.width / (bufferLength / 2);

    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const v = previousDataArray[i] / 128.0;
        // const b_v = v < 2
        // ? Math.pow(4 * v, 1 / 3)
        // : v;
        const y = (v * canvasRef.current.height) / 2; // b_v
        if (i === 0) {
        canvasCtx.moveTo(x, y);
        } else {
        canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
    }

    canvasCtx.lineTo(canvasRef.current.width, canvasRef.current.height / 2);
    canvasCtx.stroke();

    animationRef.current = requestAnimationFrame(draw);
    };


    draw();
  };

  const startWaveform = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);

      const mediaRecorder = new MediaRecorder(stream);
      recorderRef.current = mediaRecorder;
      chunksRef.current = [];

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // Cancel previous animation
      if (animationRef.current) cancelAnimationFrame(animationRef.current);

      analyserRef.current = audioCtx.createAnalyser();
      analyserRef.current.fftSize = 2048;

      sourceRef.current = audioCtx.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      const canvasCtx = canvasRef.current.getContext("2d");
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      drawWaveform(analyserRef.current, canvasCtx);

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedAudio({ blob, url });
        setStep("preview");
        fetchContacts();
        setSeconds(0);
      };
    } catch (err) {
      alert("Microphone access failed");
      console.error(err);
    }
  };


  const startRecording = async () => {
    setRecording(true);
    setSeconds(0);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setMediaStream(stream);

    const mediaRecorder = new MediaRecorder(stream);
    recorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedAudio({ blob, url });
      setStep("preview");
      fetchContacts();
      setSeconds(0);
    };

    mediaRecorder.start();

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

    mediaRecorder._timer = timer;
  };

  const stopRecording = () => {
    if (recorderRef.current?._timer) clearInterval(recorderRef.current._timer);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    cancelAnimationFrame(animationRef.current);
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

  const handleSave = async () => {
    if (uploading) return;
    setUploading(true);
    if (!recordedAudio?.blob) return alert("No audio recorded!");

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      alert("You must be logged in to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", new File([recordedAudio.blob], "audio.mp3", { type: "audio/mpeg" }));
    formData.append("name", audioName);
    formData.append("description", description);
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
        console.log(await response.text());
        throw new Error("Upload failed");
      }

      alert("Journal entry uploaded successfully.");
      router.push("/journal");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = s => {
    const s_r = Math.floor(s);
    const mins = Math.floor(s_r / 60).toString().padStart(1, "0");
    const secs = (s_r % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const toggleContact = id =>
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );

  const Title = ({ curStage }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-semibold text-cyan-950">
        {curStage === "record" ? "Record your message" : "Add details and save"}
      </h1>
    </motion.div>
  );

  const title = useMemo(() => <Title curStage={step} />, [step]);

  return (
    <div className="min-h-screen w-full relative p-6">
      <span
        onClick={() => {
          if (step === "record") router.back();
          else {
            setRecordedAudio(null);
            setCurrentTime(0);
            setDuration(0);
            setAudioName("Journal Entry");
            setDescription("");
            setSelectedContacts([]);
            
            setStep("record");
          }
        }}
        className="cursor-pointer flex flex-row gap-1 text-lg items-center font-medium mb-6"
      >
        <ChevronLeftIcon className="w-6 h-6" /> Back
      </span>
      <div className="flex flex-col items-center gap-6 max-w-xl mx-auto">
        {title}

        <div className="relative rounded-2xl overflow-hidden p-6 bg-white/40 backdrop-blur-2xl shadow-sm w-[640px]">
          {step === "record" && (
            <div className="flex flex-col items-center">
              <canvas
                ref={canvasRef}
                width={600}
                height={120}
                className="rounded-xl w-full shadow-sm bg-cyan-50"
              />
              {recording && (
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm shadow-sm text-white px-2 py-1 rounded-md font-mono text-xl">
                  {formatTime(seconds)} / {formatTime(maxLen)}
                </div>
              )}
            </div>
          )}
          {step === "preview" && recordedAudio && (
                <AudioPlayback url={recordedAudio.url}/>
          )}
        </div>

        {step === "record" && (
          <div className="cursor-pointer flex gap-4 mt-4">
            {!recording ? (
              <button
                onClick={startRecording}
                className="px-6 py-3 rounded-2xl bg-cyan-600/60 backdrop-blur-2xl shadow-sm text-white font-semibold"
              >
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-6 py-3 rounded-2xl bg-red-600/60 backdrop-blur-2xl shadow-sm text-white font-semibold"
              >
                Stop Recording
              </button>
            )}
          </div>
        )}

        {step === "preview" && recordedAudio && (
          <>
            <div className="w-full flex flex-col gap-1">
              <h1 className="text-sm text-cyan-900">Entry Name</h1>
              <input
                type="text"
                value={audioName}
                onChange={e => setAudioName(e.target.value)}
                placeholder="Audio name"
                className="w-full px-4 py-3 border border-cyan-900 text-cyan-900 focus:outline-none focus:ring-0 focus:border-cyan-400 bg-[#b2e6eb] rounded-xl"
              />
            </div>

            <div className="w-full flex flex-col gap-1">
              <h1 className="text-sm text-cyan-900">Entry Description</h1>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description"
                className="w-full px-4 py-3 border border-cyan-900 text-cyan-900 focus:outline-none focus:ring-0 focus:border-cyan-400 bg-[#b2e6eb] rounded-xl"
              />
            </div>

            <div className="w-full flex flex-col gap-1">
              <h1 className="text-sm text-cyan-900">Audio is for:</h1>
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
            
            <LoadingButton active={selectedContacts.length !== 0 && audioName.length !== 0} loading={uploading} text="Save" onClick={() => {if (selectedContacts.length !== 0 && audioName.length !== 0) handleSave()}}/>
          </>
        )}
      </div>
    </div>
  );
}
