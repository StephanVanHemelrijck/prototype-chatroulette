import React, { useState, useEffect, useRef } from "react";
import { useSocketContext } from "@/app/context/store";

const MediaStreamDisplay = ({ roomId }: { roomId: String }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { socket, username }: { socket: any; username: string } =
    useSocketContext();
  const localRef = useRef<any>();
  const remoteRef = useRef<any>();
  const [room, setRoom] = useState<any>(null);

  // Get room data
  useEffect(() => {
    if (!socket) return;
    socket.emit("get-room", roomId);

    socket.on("room", (room: any) => {
      setRoom(room);
    });

    return () => {
      socket.off("room");
    };
  }, [socket, roomId]);

  // Prepare room for call only if room is full
  useEffect(() => {
    if (!socket || !room) return;

    if (room.users.length === room.limit) {
      socket.emit("room-prepare", roomId);
    }
  }, [room, socket]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        localVideoRef.current!.srcObject = currentStream;
      });
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="relative aspect-w-16 aspect-h-9">
        <video
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          controls={false}
          ref={localVideoRef}
        />
        <div className="absolute top-0 flex justify-center items-center w-full h-full opacity-75 text-emerald-300">
          {username}
        </div>
      </div>
      <div className="relative aspect-w-16 aspect-h-9">
        <video className="w-full h-full object-cover" autoPlay playsInline />
      </div>
    </div>
  );
};

export default MediaStreamDisplay;
