"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext({
  username: "",
  setUsername: (username) => username,
  userId: "",
  setUserId: (userId) => userId,
  socket: null,
});

export const SocketContextProvider = ({ children }) => {
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket
    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    // Clean up socket
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{ username, setUsername, socket, userId, setUserId }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
