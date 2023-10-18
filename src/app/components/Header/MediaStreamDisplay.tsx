import React, { useState, useEffect, useRef } from "react";
import { useSocketContext } from "@/app/context/store";
import { useRouter } from "next/navigation";

const MediaStreamDisplay = ({ roomId }: { roomId: String }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { socket, username }: { socket: any; username: string } =
    useSocketContext();
  const [room, setRoom] = useState<any>(null);
  const rtcConnectionRef = useRef<any>();
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const peerVideoRef = useRef<HTMLVideoElement>(null);
  const userStreamRef = useRef<MediaStream | null>(null);
  const hostRef = useRef<boolean>(false);
  const router = useRouter();

  // Get room data
  useEffect(() => {
    if (!socket) return;
    socket.emit("get-room", roomId);

    // Get room data
    socket.on("room", (room: any) => {
      setRoom(room);
      // If room is full -> prepare room
      if (room.users.length === room.limit) {
        socket.emit("room-prepare", room);
      }
    });

    socket.on("room-prepared", (room: any) => {
      console.log(room);
      // If user is host -> handleroomcreated
      const host = room.users.find((user: any) => user.role === "host");
      if (host.username === username) {
        hostRef.current = true;
        handleRoomCreated();
      }

      // If user is not host -> handleroomjoined
      const guest = room.users.find((user: any) => user.role === "guest");
      if (guest.username === username) {
        handleRoomJoined();
      }
    });

    socket.on("room-ready", (room: any) => {
      console.log(room);
      initiateCall();
    });

    socket.on("room-left", () => {
      onPeerLeave();
    });

    // Events that are webRTC speccific
    socket.on("offer", handleReceivedOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handlerNewIceCandidateMsg);

    return () => {
      socket.off("room");
      socket.off("room-prepared");
      socket.off("room-ready");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("room-leave");
    };
  }, [socket, roomId]);

  const handleRoomCreated = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        userStreamRef.current = stream;
        userVideoRef.current!.srcObject = stream;
        userVideoRef.current!.onloadedmetadata = () => {
          userVideoRef.current!.play();
        };
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleRoomJoined = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        userStreamRef.current = stream;
        userVideoRef.current!.srcObject = stream;
        userVideoRef.current!.onloadedmetadata = () => {
          userVideoRef.current!.play();
        };
        socket.emit("room-ready", roomId);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const initiateCall = () => {
    if (!hostRef.current) return;
    if (!userStreamRef.current) return;

    rtcConnectionRef.current = createPeerConnection();
    rtcConnectionRef.current.addTrack(
      userStreamRef.current!.getTracks()[0],
      userStreamRef.current
    );

    rtcConnectionRef.current.addTrack(
      userStreamRef.current!.getTracks()[1],
      userStreamRef.current
    );

    rtcConnectionRef.current
      .createOffer()
      .then((offer: any) => {
        rtcConnectionRef.current.setLocalDescription(offer);
        socket.emit("offer", offer, roomId);
      })
      .catch((e: any) => console.log(e));
  };

  const handleReceivedOffer = (offer: any) => {
    if (hostRef.current) return;
    if (!userStreamRef.current) return;

    rtcConnectionRef.current = createPeerConnection();
    rtcConnectionRef.current.addTrack(
      userStreamRef.current.getTracks()[0],
      userStreamRef.current
    );
    rtcConnectionRef.current.addTrack(
      userStreamRef.current.getTracks()[1],
      userStreamRef.current
    );
    rtcConnectionRef.current.setRemoteDescription(offer);

    rtcConnectionRef.current
      .createAnswer()
      .then((answer: any) => {
        rtcConnectionRef.current.setLocalDescription(answer);
        socket.emit("answer", answer, roomId);
      })
      .catch((error: any) => {
        console.log(error);
      });
  };

  const ICE_SERVERS = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  };

  const createPeerConnection = () => {
    // We create a RTC Peer Connection
    const connection = new RTCPeerConnection(ICE_SERVERS);

    // We implement our onicecandidate method for when we received a ICE candidate from the STUN server
    connection.onicecandidate = handleICECandidateEvent;

    // We implement our onTrack method for when we receive tracks
    connection.ontrack = handleTrackEvent;
    return connection;
  };

  const handleICECandidateEvent = (event: any) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate, roomId);
    }
  };

  const handlerNewIceCandidateMsg = (incoming: any) => {
    // We cast the incoming candidate to RTCIceCandidate
    const candidate = new RTCIceCandidate(incoming);
    rtcConnectionRef.current
      .addIceCandidate(candidate)
      .catch((e) => console.log(e));
  };

  const handleTrackEvent = (event: any) => {
    if (!peerVideoRef.current) return;
    peerVideoRef.current.srcObject = event.streams[0];
  };

  const handleAnswer = (answer: any) => {
    rtcConnectionRef.current.setRemoteDescription(answer).catch((e: any) => {
      console.log(e);
    });
  };

  const leaveRoom = () => {
    socket.emit("room-leave", roomId, username);

    if (userVideoRef.current?.srcObject instanceof MediaStream) {
      userVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop()); // Stops receiving all track of User.
    }
    if (peerVideoRef.current?.srcObject instanceof MediaStream) {
      peerVideoRef.current?.srcObject
        .getTracks()
        .forEach((track) => track.stop()); // Stops receiving audio track of Peer.
    }

    // Checks if there is peer on the other side and safely closes the existing connection established with the peer.
    if (rtcConnectionRef.current) {
      rtcConnectionRef.current.ontrack = null;
      rtcConnectionRef.current.onicecandidate = null;
      rtcConnectionRef.current.close();
      rtcConnectionRef.current = null;
    }
    router.push("/");
  };

  const onPeerLeave = () => {
    // This person is now the creator because they are the only person in the room.
    hostRef.current = true;
    if (peerVideoRef.current?.srcObject instanceof MediaStream) {
      peerVideoRef.current?.srcObject
        .getTracks()
        .forEach((track) => track.stop()); // Stops receiving all track of Peer.
    }

    // Safely closes the existing connection established with the peer who left.
    if (rtcConnectionRef.current) {
      rtcConnectionRef.current.ontrack = null;
      rtcConnectionRef.current.onicecandidate = null;
      rtcConnectionRef.current.close();
      rtcConnectionRef.current = null;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="relative aspect-w-16 aspect-h-9">
        <video
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          controls={false}
          ref={userVideoRef}
        />
        <div className="absolute top-0 flex justify-center items-center w-full h-full opacity-75 text-emerald-300">
          {username}
        </div>
      </div>
      <div className="relative aspect-w-16 aspect-h-9">
        <video
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          ref={peerVideoRef}
        />
      </div>
      <button onClick={leaveRoom}>Leave</button>
    </div>
  );
};

export default MediaStreamDisplay;
