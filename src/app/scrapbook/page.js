"use client";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";

export default function Scrapbook() {
    const router = useRouter();

    return (
        <div className="min-h-screen w-full relative p-6">
        <span onClick={() => {router.back()}} className="cursor-pointer flex flex-row gap-1 text-lg items-center font-medium mb-6">
        <ChevronLeftIcon className="w-6 h-6" /> Back
      </span>
      <div className="flex flex-col items-center gap-6 max-w-xl mx-auto text-2xl font-bold">
        Coming soon!
        </div>
        </div>
    );
}