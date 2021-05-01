import React, {useEffect, useState} from 'react';
import {Button, StyleSheet, View} from 'react-native';
import {mediaDevices, RTCView} from 'react-native-webrtc';
import MyRTC from './MyRTC';

function App() {
  const [stream, setStream] = useState();
  const [rtc, setRTC] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const setRemote = value => {
    setRemoteStream(value);
  };
  useEffect(() => {
    mediaDevices
      .getUserMedia({video: true, audio: false})
      .then(s => {
        setStream(s);
        const myRTC = new MyRTC(s, setRemote);
        setRTC(myRTC);
      })
      .catch(e => console.log(e));
  }, []);

  const joinHandler = () => {
    if (rtc) {
      rtc.joinRoom();
    }
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      {stream && (
        <>
          <RTCView
            streamURL={stream.toURL()}
            key={1}
            zOrder={2}
            objectFit="cover"
            style={{width: 300, height: 300, alignSelf: 'center'}}
          />
          <Button title="join" onPress={joinHandler} />
        </>
      )}
      {remoteStream && (
        <RTCView
          streamURL={remoteStream.toURL()}
          key={1}
          zOrder={2}
          objectFit="cover"
          style={{width: 300, height: 300, alignSelf: 'center'}}
        />
      )}
    </View>
  );
}
export default App;
