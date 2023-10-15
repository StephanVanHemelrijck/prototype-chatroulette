"use client";
import React, { useEffect, useState } from "react";
import { useSocketContext } from "../../context/store";

const Header = () => {
  const [usersOnline, setUsersOnline] = useState(0);
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket) return;

    socket?.on("users-online", (usersCount: any) => {
      setUsersOnline(usersCount);
    });

    return () => {
      socket?.off("users-online");
    };
  }, [socket]);

  return (
    <header className="bg-stone-200 p-4 text-emerald-500 flex justify-between items-center">
      <h1 className="text-3xl font-bold mb-2">SueCam</h1>
      <p className="text-sm font-medium">Users Online: {usersOnline}</p>
    </header>
  );
};

export default Header;
