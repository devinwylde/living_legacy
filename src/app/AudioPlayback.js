"use client";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon } from "@heroicons/react/24/solid";

export default function AudioPlayback({ url }) {
  const previewRef = useRef(null);
  const waveformRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!url) return;

    if (previewRef.current) {
      previewRef.current.destroy();
    }

    previewRef.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#0d8994",
      progressColor: "#075985",
      cursorColor: "#1b7fb5",
      height: 120,
      barWidth: 6,
      barRadius: 6,
      barGap: 1.5,
      barHeight: 0.8,
      normalize: true,
    });

    previewRef.current.load(url);

    const ws = previewRef.current;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onReady = () => setDuration(ws.getDuration());
    const onProcess = () => setCurrentTime(ws.getCurrentTime());
    const onSeek = () => setCurrentTime(ws.getCurrentTime());

    ws.on("play", onPlay);
    ws.on("pause", onPause);
    ws.on("ready", onReady);
    ws.on("audioprocess", onProcess);
    ws.on("seek", onSeek);

    return () => {
        if (previewRef.current && previewRef.current.destroy) {
            try {
            previewRef.current.destroy();
            } catch (err) {
            console.warn("WaveSurfer destroy failed:", err);
            }
        }
        previewRef.current = null;
    };
  }, [url]);

  const formatTime = (s) => {
    const s_r = Math.floor(s);
    const mins = Math.floor(s_r / 60).toString().padStart(1, "0");
    const secs = (s_r % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <div className="w-full h-full bg-cyan-50 rounded-xl p-4">
      <div className="w-full flex justify-center">
        <div ref={waveformRef} className="rounded-xl w-full py-2" />
      </div>

      <div className="w-full flex justify-between text-sm text-cyan-900 font-mono px-1">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-center gap-6 mt-3">
        <button
          onClick={() => {
            const ws = previewRef.current;
            if (ws) ws.seekTo(Math.max(0, ws.getCurrentTime() - 10) / ws.getDuration());
          }}
          className="p-3 rounded-full bg-cyan-100 hover:bg-cyan-200 text-cyan-900"
        >
          <BackwardIcon className="w-6 h-6" />
        </button>

        <button
          onClick={() => {
            const ws = previewRef.current;
            if (ws) ws.playPause();
          }}
          className="p-4 rounded-full bg-cyan-700 hover:bg-cyan-800 text-white"
        >
          {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
        </button>

        <button
          onClick={() => {
            const ws = previewRef.current;
            if (ws) ws.seekTo(Math.min(1, (ws.getCurrentTime() + 10) / ws.getDuration()));
          }}
          className="p-3 rounded-full bg-cyan-100 hover:bg-cyan-200 text-cyan-900"
        >
          <ForwardIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
