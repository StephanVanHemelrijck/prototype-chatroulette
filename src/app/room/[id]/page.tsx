"use client";
import React, { useEffect, useState } from "react";
import { useSocketContext } from "../../context/store";
import MediaStreamDisplay from "@/app/components/Header/MediaStreamDisplay";

interface RoomProps {
  params: {
    id: string;
  };
}

const Room = ({ params }: RoomProps) => {
  const [users, setUsers] = useState([]);
  const { socket }: any = useSocketContext();

  useEffect(() => {
    if (!socket) return;

    socket?.emit("get-room", params.id);

    socket?.on("room", (room: any) => {
      setUsers(room.users);
    });

    socket?.on("user-left", (user: any) => {
      setUsers((prev: any) => prev.filter((u: any) => u.id !== user.id));
    });

    return () => {
      socket?.off("room");
      socket?.off("user-left");
    };
  }, [socket, params.id]);

  return (
    <>
      <MediaStreamDisplay roomId={params.id} />
    </>
  );
};

export default Room;
