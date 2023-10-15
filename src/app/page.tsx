"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useSocketContext } from "./context/store";

const Page = () => {
  const { username, setUsername, socket, setUserId } = useSocketContext();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const username = e.currentTarget.username.value;

    setUsername(username);
  };

  useEffect(() => {
    if (!socket) return;

    socket?.on("currentUser", (user: any) => {
      setUserId(user.userId);
    });
  }, [socket]);

  return (
    <div className="">
      <form action="" onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          id="username"
          className="text-black"
        />
        <button type="submit">Connect to socket</button>
      </form>
    </div>
  );
};

export default Page;
