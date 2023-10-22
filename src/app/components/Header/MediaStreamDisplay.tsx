import React, { useState, useEffect, useRef } from "react";
import { useSocketContext } from "@/app/context/store";
import { useRouter } from "next/navigation";

const MediaStreamDisplay = ({ roomId }: { roomId: String }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { socket, username }: { socket: any; username: string } =
    useSocketContext();
  const [guestUser, setGuestUser] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const rtcConnectionRef = useRef<any>();
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const peerVideoRef = useRef<HTMLVideoElement>(null);
  const userStreamRef = useRef<MediaStream | null>(null);
  const hostRef = useRef<boolean>(false);
  const router = useRouter();
  const tempVideoRef = useRef<HTMLVideoElement>(null);
  const [tempVideoRefActive, setTempVideoRefActive] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);

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
      // Set guest user (the user where username != username of instance)
      const guestUser = room.users.find(
        (user: any) => user.username !== username
      );
      setGuestUser(guestUser);

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
      // Set loading to true when peer disconnects
      setLoading(true);
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

  // Initiate Web RTC
  useEffect(() => {
    // TEMP WEB RTC SETUP
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        userStreamRef.current = stream;
        tempVideoRef.current!.srcObject = stream;
        tempVideoRef.current!.onloadedmetadata = () => {
          tempVideoRef.current!.play();
          setTempVideoRefActive(true);
        };
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

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

    // Set loading to false when peer connects and delete tempVideoRef
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === "connected") {
        setLoading(false);
        tempVideoRef.current?.remove();
        setTempVideoRefActive(false);
      }
    };

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
    <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-4 p-3">
      <div
        className="relative aspect-w-16 aspect-h-9 min-w-[20rem] max-w-md sm:max-w-lg md:max-w-xl lg:max-w-full "
        style={{ display: tempVideoRefActive ? "block" : "none" }}
      >
        <video
          className="w-full h-full "
          autoPlay
          playsInline
          muted
          controls={false}
          ref={tempVideoRef}
        />
        <div className="absolute bottom-[20px] left-[20px] bg-stone-200 text-stone-900 py-1 px-2 rounded-md text-sm">
          {username}
        </div>
      </div>
      <div
        className="relative aspect-w-16 aspect-h-9 min-w-[20rem] max-w-md sm:max-w-lg md:max-w-xl lg:max-w-full "
        style={{ display: tempVideoRefActive ? "none" : "block" }}
      >
        <video
          className="w-full h-full "
          autoPlay
          playsInline
          muted
          controls={false}
          ref={userVideoRef}
        />
        <div className="absolute bottom-[20px] left-[20px] bg-stone-200 text-stone-900 py-1 px-2 rounded-md text-sm">
          {username}
        </div>
      </div>
      <div className="relative aspect-w-16 aspect-h-9 min-w-[20rem] max-w-md sm:max-w-lg md:max-w-xl lg:max-w-full ">
        <video
          className="w-full h-full "
          autoPlay
          playsInline
          ref={peerVideoRef}
        />
        <div className="absolute bottom-[20px] left-[20px] bg-stone-200 text-stone-900 py-1 px-2 rounded-md text-sm">
          {guestUser?.username}
        </div>
        {loading && (
          <div className="w-full h-full absolute top-0 z-10 bg-black text-emerald-500 flex justify-center items-center ">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-emerald-500 motion-reduce:animate-[spin_1.5s_linear_infinite]"
              role="status"
            >
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                Loading...
              </span>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={leaveRoom}
        className="border border-emerald-400 hover:bg-emerald-400 p-2 w-1/3 text-stone-900 rounded-md"
      >
        Leave
      </button>
    </div>
  );
};

export default MediaStreamDisplay;
