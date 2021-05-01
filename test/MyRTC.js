import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import io from 'socket.io-client';

const pcConfig = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
};

export default class MyRTC {
  constructor(s, setRemoteStream) {
    this.socket = io('http://localhost:8080');
    this.isOffer = false;
    this.isReady = false;
    this.isStarted = false;
    this.localTrack = s;
    this.setEvent();
    this.setRemoteStream = setRemoteStream;
  }

  emitSinerEvent(message) {
    this.socket.emit('message', message);
  }

  joinRoom() {
    if (this.isReady || this.isStarted) return;

    this.socket.emit('join');
    this.emitSinerEvent('start');
  }

  setEvent() {
    this.socket.on('master', () => {
      this.isOffer = true;
    });
    this.socket.on('joined', () => {
      console.log('joined');
      this.isReady = true;
    });
    this.socket.on('message', message => {
      console.log(message);
      if (message === 'start') {
        this.startConnection();
        return;
      }

      switch (message.type) {
        case 'offer': {
          if (!this.isOffer && !this.isStarted) {
            this.startConnection();
          }

          this.pc
            .setRemoteDescription(new RTCSessionDescription(message))
            .then(() => this.doAnswer());
          break;
        }
        case 'answer': {
          if (this.isStarted) {
            this.pc.setRemoteDescription(new RTCSessionDescription(message));
          }
          break;
        }
        case 'candidate': {
          if (this.isStarted) {
            break;
          }

          const candidate = new RTCIceCandidate({
            sdpMLineIndex: message.lable,
            candidate: message.candidate,
            sdpMid: message.id,
          });

          this.pc.addIceCandidate(candidate);
          break;
        }
      }
    });
  }

  startConnection() {
    console.log(typeof this.localTrack);
    if (
      !this.isStarted &&
      (typeof this.localTrack !== 'undefined') & this.isReady
    ) {
      console.log('s ', this.isStarted, ' ', this.isReady);
      this.createConnection();
      this.pc.addStream(this.localTrack);
      this.isStarted = true;

      if (this.isOffer) {
        this.doCall();
      }
    }
  }

  createConnection() {
    this.pc = new RTCPeerConnection(pcConfig);

    this.pc.onaddstream = this.remoTrackHandler;
    this.pc.onicecandidate = this.icecandidateHandler;
  }

  icecandidateHandler({candidate}) {
    if (!candidate) {
      return;
    }

    const message = {
      type: 'candidate',
      label: candidate.sdpMLineIndex,
      id: candidate.sdpMid,
      candidate: candidate.candidate,
    };

    this.emitSinerEvent(message);
  }

  remoTrackHandler(e) {
    console.log(e.track);
    console.log(e.stream);
    // const remoteStream = new MediaStream(e.track);
    this.remoteTrack = e.stream;
    // console.log(this.remoteTrack);
    this.setRemoteStream(e.stream);
  }

  doCall() {
    this.pc.createOffer(this.setLocalDescription);
  }

  doAnswer() {
    this.pc.createAnswer(this.setLocalDescription);
  }

  setLocalDescription(description) {
    this.pc.setLocalDescription(description);
    this.emitSinerEvent(description);
  }
}
