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

var pcConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

connect();
function connect() {
  socket = new SockJS("http://localhost:8080/ws");
  stompClient = Stomp.over(socket);
  stompClient.connect({}, onConnected, onError);
  stompClient.debug = null;
}

function onConnected() {
  stompClient.subscribe("/user/topic/rooms/join", ondirectMessage);
}

function ondirectMessage(message) {
  const { type, roomId: roomURL, sender } = JSON.parse(message.body);

  isOffer = type === "master";

  myName = sender;
  roomId = roomURL;

  stompClient.subscribe(`/topic/rooms/${roomId}`, onRTC);

  const message2 = {
    type: "start",
    sender,
  };

  startConnect();
  if (isOffer) {
    stompClient.send(`/app/rooms/${roomId}`, {}, JSON.stringify(message2));
  }
}

function onRTC(message) {
  const description = JSON.parse(message.body);
  const { type, sender } = description;

  if (sender && sender === myName) return;
  console.log(type);
  switch (type) {
    case "start": {
      startConnect();
      break;
    }
    case "offer": {
      if (!isOffer) {
        startConnect();
      }
      pc.setRemoteDescription(new RTCSessionDescription(description)).then(() =>
        doAnswer()
      );
      break;
    }
    case "answer": {
      if (isStarted) {
        pc.setRemoteDescription(new RTCSessionDescription(description));
      }
      break;
    }

    case "candidate": {
      if (!isStarted) break;
      const candidate = new RTCIceCandidate({
        sdpMLineIndex: description.label,
        candidate: description.candidate,
      });
      pc.addIceCandidate(candidate);

      break;
    }
  }
}

function startConnect() {
  if (isStarted) return;

  createConnection();
  pc.addStream(localStream);
  isStarted = true;
  if (isOffer) {
    doCall();
  }
}

function setLocalAndSendMessage(description) {
  pc.setLocalDescription(description);
  description.sender = myName;

  emitSignerEvent(description);
}

async function doCall() {
  pc.createOffer(setLocalAndSendMessage, (e) => console.error(e + "\n call"));
}

function doAnswer() {
  pc.createAnswer(setLocalAndSendMessage, (e) =>
    console.error(e + "\n answer")
  );
}

function createConnection() {
  pc = new RTCPeerConnection(pcConfig);

  pc.onicecandidate = icecandidateHandler;
  pc.onaddstream = remoteStream;
}

function icecandidateHandler(message) {
  let candidate;
  if (typeof message === "string") {
    candidate = JSON.parse(message.body).candidate;
  } else {
    candidate = message.candidate;
  }

  if (!candidate) return;

  const message2 = {
    type: "candidate",
    label: candidate.sdpMLineIndex,
    id: candidate.sdpMid,
    candidate: candidate.candidate,
    sender: myName,
  };

  emitSignerEvent(message2);
}

function remoteStream(event) {
  remoteVideo.srcObject = event.stream;
}

sendButton.addEventListener("click", onSubmitHash);
function onSubmitHash() {
  const hashqueue = hashInput.value.trim();
  stompClient.send("/app/hash/" + hashqueue + "/join");
}

function onError(e) {
  console.error(e);
}

function getNavigator() {
  navigator.getUserMedia(
    { video: true, audio: false },
    (stream) => {
      localStream = stream;
    },
    (e) => {
      console.log(e);
    }
  );
}

getNavigator();

function emitSignerEvent(data) {
  if (data.type === "offer" || data.type === "answer")
    stompClient.send(
      `/app/rooms/${roomId}`,
      {},
      JSON.stringify({ sender: data.sender, type: data.type, sdp: data.sdp })
    );
  else stompClient.send(`/app/rooms/${roomId}`, {}, JSON.stringify(data));
}
