"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeftIcon, PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/lib/supabaseClient";
import LoadingIndicator from "../LoadingIndicator";

export default function Settings() {
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const FadeUp = ({ children, delay = 0 }) => {
    const controls = useAnimation();
    const [ref, inView] = useInView({ triggerOnce: true });

    useEffect(() => {
      if (inView) controls.start({ opacity: 1, y: 0 });
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

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        alert("You are no longer logged in.");
        router.push("/login");
        return;
      }

      const res = await fetch("https://livinglegacy.fly.dev/get_contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const contacts = await res.json();
      setContacts(contacts);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (newContact) => {
    if (!newContact.name || !newContact.email) return;
    console.log(newContact);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch("https://livinglegacy.fly.dev/add_contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newContact),
      });
      if (res.ok) return await res.json();
    } catch (err) {
        console.error("Add failed:", err);
    }
    
    return null;
  };

  const handleDeleteContact = async (id) => {
    try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch(`https://livinglegacy.fly.dev/contact/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        }
        });
        if (res.ok) {
        setContacts(prev => prev.filter(entry => entry.id != id));
        } else {
        console.error(await res.text());
        }
    } catch (err) {
        console.error('Failed to delete:', err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const Header = () => (
    <FadeUp delay={0.05}>
      <h1 className="text-3xl font-semibold mb-6 text-cyan-950">Contacts</h1>
    </FadeUp>
  );

  const Adder = ({ isAdding }) => {
  const nameRef = useRef("");
  const emailRef = useRef("");
  const phoneRef = useRef("");

  const onSave = async () => {
    const contact = {
      name: nameRef.current.value,
      email: emailRef.current.value,
      phone: phoneRef.current.value,
    };

    const result = await handleAddContact(contact);
    if (result) {
        setContacts(prev => [...prev, result])
        onCancel();
    }
  };

  const onCancel = () => {
    setAdding(false);
    nameRef.current.value = "";
    emailRef.current.value = "";
    phoneRef.current.value = "";
  };

  return (
    <FadeUp>
      <div className="mt-8">
        {!isAdding ? (
          <button
            onClick={() => {
              setAdding(true);
              console.log("wee!");
            }}
            className="cursor-pointer flex gap-2 items-center bg-cyan-700 hover:bg-cyan-800 text-white px-6 py-2 rounded-full"
          >
            <PlusIcon className="w-5 h-5" /> Add Contact
          </button>
        ) : (
          <div className="flex flex-col gap-3 max-w-md mt-4">
            <input
              className="w-full px-4 py-2 mt-1 border border-cyan-900 text-cyan-900 focus:outline-none focus:ring-0 focus:border-cyan-400 bg-[#b2e6eb] rounded-xl"
              placeholder="Name"
              ref={nameRef}
            />
            <input
              className="w-full px-4 py-2 mt-1 border border-cyan-900 text-cyan-900 focus:outline-none focus:ring-0 focus:border-cyan-400 bg-[#b2e6eb] rounded-xl"
              placeholder="Email"
              ref={emailRef}
            />
            <input
              className="w-full px-4 py-2 mt-1 border border-cyan-900 text-cyan-900 focus:outline-none focus:ring-0 focus:border-cyan-400 bg-[#b2e6eb] rounded-xl"
              placeholder="Phone"
              ref={phoneRef}
            />
            <div className="flex gap-3 mt-2">
              <button
                onClick={onSave}
                className="cursor-pointer bg-cyan-800 hover:bg-cyan-700 text-white px-4 py-2 rounded-md"
              >
                Save
              </button>
              <button
                onClick={onCancel}
                className="cursor-pointer bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </FadeUp>
  );
};

const ContactTable = ({isLoading, contact_list}) => (
    <>{isLoading ? (
          <FadeUp delay={0.2}>
            <LoadingIndicator />
          </FadeUp>
        ) : (
          <FadeUp delay={0.2}>
            <div className="overflow-x-auto">
              <table className="w-full max-w-5xl text-cyan-900 text-left border-collapse bg-white/40 backdrop-blur-2xl rounded-xl shadow-sm">
                <thead>
                  <tr className="text-sm font-semibold">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Edit</th>
                    <th className="px-4 py-3">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {contact_list.map((contact) => (
                    <tr key={contact.id} className="border-t border-cyan-200">
                      <td className="px-4 py-2">{contact.name}</td>
                      <td className="px-4 py-2">{contact.email}</td>
                      <td className="px-4 py-2">{contact.phone}</td>
                      <td className="px-4 py-2">
                        <button className="hover:scale-110 transition-transform">
                          <PencilIcon className="w-5 h-5 fill-cyan-900" />
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="hover:scale-110 transition-transform"
                        >
                          <TrashIcon className="w-5 h-5 fill-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>
        )}</>
);

  const header = useMemo(() => <Header/>, []);
  const adder = useMemo(() => <Adder isAdding={adding}/>, [adding]);
  const table = useMemo(() => <ContactTable isLoading={loading} contact_list={contacts}/>, [loading, contacts]);

  return (
    <div className="relative min-h-screen">

      <div className="flex min-h-screen flex-col p-6 justify-start">
       <span
          onClick={() => router.back()}
          className="cursor-pointer flex flex-row gap-1 text-lg items-center font-medium"
        >
          <ChevronLeftIcon className="w-6 h-6" /> Back
        </span>

        <div className="p-4 pt-20">
            {header}
            {table}
            {adder}
        
        </div>
      </div>
    </div>
  );
}
