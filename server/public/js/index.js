const pcConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

const log = (value) => console.log(value);
const $ = (target, base = document) => base.querySelector(target);
const emitSignerEvent = (data) => socket.emit("message", data);

const room_name = "foo";
const join_btn = $("#join");
const local_video = $("#local-video");
const remote_video = $("#remote-video");

let socket;
let isOffer = false;
let isReady = false;
let isStarted = false;
let pc;
let local_track;
let remote_track;

join_btn.addEventListener("click", () => {
  socket.emit("join");
  emitSignerEvent("start");
  if (isOffer) {
    startConnection();
  }
});

function goTrack(track) {
  local_track = track.getTracks()[0];
  local_video.srcObject = track;
}

navigator.mediaDevices
  .getUserMedia({ video: true, audio: false })
  .then(goTrack);

function connectSocket() {
  socket = io("http://localhost:8080");

  socket.on("master", () => {
    log("i am master");
    isOffer = true;
  });

  socket.on("joined", () => {
    console.log("joined");
    isReady = true;
  });

  socket.on("message", (message) => {
    if (message === "start") {
      startConnection();
      return;
    }

    switch (message.type) {
      case "offer": {
        if (!isOffer && !isStarted) {
          startConnection();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message)).then(() =>
          doAnswer()
        );

        break;
      }
      case "answer": {
        if (isStarted)
          pc.setRemoteDescription(new RTCSessionDescription(message));
        break;
      }
      case "candidate": {
        if (!isStarted) break;
        const candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate,
        });

        pc.addIceCandidate(candidate);
        break;
      }
    }
  });
}

function startConnection() {
  console.log(isStarted, isReady, typeof local_track);
  if (!isStarted && typeof local_track !== "undefined" && isReady) {
    createConnection();
    pc.addTrack(local_track);
    isStarted = true;

    if (isOffer) {
      doCall();
    }
  }
}

function createConnection() {
  pc = new RTCPeerConnection(pcConfig);
  pc.onicecandidate = icecandidateHandler;
  pc.ontrack = remoteTrackHandler;
}

function icecandidateHandler({ candidate }) {
  if (!candidate) return;

  const message = {
    type: "candidate",
    label: candidate.sdpMLineIndex,
    id: candidate.sdpMid,
    candidate: candidate.candidate,
  };

  emitSignerEvent(message);
}

async function remoteTrackHandler(event) {
  const remoteStream = new MediaStream();
  remote_video.srcObject = remoteStream;
  remoteStream.addTrack(event.track, remoteStream);
}

function doCall() {
  pc.createOffer(setLocalAndSendMessage, (e) => log(e + "\n call"));
}

function doAnswer() {
  pc.createAnswer(setLocalAndSendMessage, (e) => log(e + "\n answer"));
}

function setLocalAndSendMessage(description) {
  pc.setLocalDescription(description);
  emitSignerEvent(description);
}

connectSocket();
