/**
 * TODO
 * [x] 소켓연결
 * 소켓 커넥트, user 구독
 * 해시 태그 보내는 이벤트
 * 방구독
 * RTC 통신
 * disconnect 시에 flag 초기화
 */
let socket;
let stompClient;
let myName;
let isOffer = false;
let isReady = false;
let localStream;
let isStarted = false;
let pc;
let roomId = "";

const $ = (target) => document.querySelector(target);
const hashInput = $("#hash-input");
const sendButton = $("#send-hash-btn");
const remoteVideo = $("#remote-video");

function connect() {
  socket = new SockJS("/ws");
  stompClient = Stomp.over(socket);
  stompClient.connect({}, onConnected, onError);
}

function onConnected() {
  stompClient.subscribe("/user/topic/rooms/join", ondirectMessage);
}

function ondirectMessage(message) {
  const { type, roomURL, sender } = JSON.parse(message.body);

  isOffer = type === "MASTER";

  myName = sender;
  roomId = roomURL;

  stompClient.subscribe(`/topic/rooms/${roomId}`, onRTC);

  const message = {
    type: "START",
    sender,
  };
  stompClient.send(`/app/rooms/${roomId}`, {}, JSON.stringify(message));
}

function onRTC(message) {
  const description = JSON.parse(message.body);
  const { type, sender } = description;

  if (sender && sender === myName) return;

  switch (type) {
    case "start":
      {
        startConnect();
      }
      break;
    case "offer":
      {
        if (!isOffer) {
          startConnect();
        }
        pc.setRemoteDescription(new RTCSessionDescription(description)).then(
          () => doAnswer()
        );
      }
      break;
    case "answer":
      {
        if (isStarted)
          pc.setRemoteDescription(new RTCSessionDescription(description));
        break;
      }
      break;
    case "candidate":
      {
        if (!isStarted) break;
        const candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate,
        });

        pc.addIceCandidate(candidate);
        break;
      }
      break;
  }
}

function startConnect() {
  if (!isStarted) return;

  createConnection();
  pc.addStream(localStream);
  isStarted = true;

  if (isOffer) doCall();
}

function setLocalAndSendMessage(description) {
  pc.setLocalDescription(description);
  description.sender = myName;
  emitSignerEvent(description);
}

function doCall() {
  pc.createOffer(setLocalAndSendMessage, (e) => log(e + "\n call"));
}

function doAnswer() {
  pc.createAnswer(setLocalAndSendMessage, (e) => log(e + "\n answer"));
}

function createConnection() {
  pc = new RTCPeerConnection(pcConfig);
  pc.onicecandidate = icecandidateHandler;
  pc.onstream = remoteStream;
}

function icecandidateHandler(message) {
  const { candidate } = JSON.parse(message.body);
  if (!candidate) return;

  const message = {
    type: "CANDIDATE",
    label: candidate.sdpMLineIndex,
    id: candidate.sdpMid,
    candidate: candidate.candidate,
  };

  emitSignerEvent(message);
}

function remoteStream(event) {
  remoteVideo.srcObjec = event.stream;
}

function onSubmitHash() {
  const hashqueue = hashInput.value.trim();
  stompClient.send("/app/hash/" + hashqueue + "/join");
}

function onError(e) {
  console.error(e);
}

function getNavigator() {
  navigator.getUserMedia({ video: false, audio: true }, (stream) => {
    localStream = stream;
  });
}

getNavigator();

function emitSignerEvent(data) {
  stompClient.send(`/app/rooms/${roomId}`, {}, JSON.stringify(data));
}

/*
function startConnection() {
  
  if (!isStarted && typeof local_track !== "undefined" && isReady) {
    createConnection();
    pc.addTrack(local_track);
    isStarted = true;

    if (isOffer) {
      doCall();
    }
  }
}
 */

/*

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

*/

/*

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

*/
