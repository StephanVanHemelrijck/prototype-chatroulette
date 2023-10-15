"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useSocketContext } from "./context/store";
import { useRouter } from "next/navigation";

const Page = () => {
  const { username, setUsername, socket, setUserId } = useSocketContext();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const username = e.currentTarget.username.value;
    setUsername(username);

    socket?.emit("start-call", username);
  };

  useEffect(() => {
    if (!socket) return;

    socket?.on("started-call", (data: { roomId: any }) => {
      console.log(data);
      router.push(`/room/${data.roomId}`);
    });

    return () => {
      socket?.off("started-call");
    };
  }, [socket]);

  return (
    <div className="w-full h-full flex justify-center items-center ">
      <div className="flex flex-col p-6 lg:w-1/3 md:w-1/2 w-screen font-medium">
        <h1 className="font-bold text-2xl">Meet Strangers</h1>
        <p className="italic mb-6">
          Fill in your username and start meeting strangers.
        </p>
        <form action="" onSubmit={handleSubmit} className="flex flex-col gap-6">
          <label htmlFor="username" className="flex flex-col gap-3">
            Username:
            <input
              type="text"
              name="username"
              id="username"
              className="border border-stone-500 p-2 rounded-md focus:border-orange-300 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="border border-emerald-400 hover:bg-emerald-400 p-2 w-1/3 text-stone-900 rounded-md"
          >
            Start
          </button>
        </form>
      </div>
    </div>
  );
};

export default Page;
