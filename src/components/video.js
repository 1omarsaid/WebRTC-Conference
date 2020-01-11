import React from 'react'
import VideoCall from '../helpers/simple-peer'
import '../styles/video.css'
import io from 'socket.io-client'
import ReactDOM from "react-dom";
import ShareScreenIcon from './icons/ShareScreenIcon';
import AudioIcon from './icons/AudioIcon';
import AudioMuteIcon from './icons/AudioMuteIcon';
import VideoMuteIcon from './icons/VideoMuteIcon';
import VideoIcon from './icons/VideoIcon';
import LeaveChatIcon from './icons/LeaveChatIcon';
import Select from 'react-select';

var socket;
class Video extends React.Component {
  constructor() {
    super()
    this.state = {
      localStream: {},
      remoteStreamUrl: '',
      streamUrl: '',
      initiator: false,
      peer: {},
      connecting: false,
      waiting: true,
      audioMute: false,
      videoMute: false,
      data: [],
      viewChat: false,
      leaveChat: false,
      audioInputOptions: [],
      audioOutputOptions: [],
      videoSourceOptions: [],
      audioSource:'default',
      audioConfigRecieved: false
    }
    
  }
  
  videoCall = new VideoCall()
  componentDidMount() {

    socket = io("http://localhost:8080")
    const component = this
    this.setState({ socket })
    const { roomId } = this.props.match.params
    navigator.mediaDevices.enumerateDevices().then(input => this.gotDevices(input)).catch(this.handleError);
    this.getUserMedia(this.state.audioSource).then(() => {
      socket.emit('join', { roomId: roomId })
      console.log("recived permission")
    })
    
    socket.on('init', () => {
      component.setState({ initiator: true })
    })
    socket.on('ready', () => {
      // Entering room (there are 2 people)
      component.enter(roomId)
    })
    socket.on('desc', data => {
      if (data.type === 'offer' && component.state.initiator) return
      if (data.type === 'answer' && !component.state.initiator) return
      component.call(data)
    })
    socket.on('disconnected', () => {
      component.setState({ initiator: true })
      // this.state.localStream.getVideoTracks()[0].enabled = !(this.state.localStream.getVideoTracks()[0].enabled);
    })
    socket.on('full', () => {
      component.setState({ full: true })
    })
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.audioSource !== this.state.audioSource) {
      this.getUserMedia(this.state.audioSource)
    }
    
  }

  getUserMedia = (audioInput) => {
    return new Promise((resolve, reject) => {
      // This is for the different browsers
      navigator.getUserMedia = navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia
      // Setting up constraints
      
      console.log(audioInput)
      const constraints = {
        video: {
          width: { min: 160, ideal: 640, max: 1280 },
          height: { min: 120, ideal: 360, max: 720 }
        },
        audio: {deviceId: audioInput}
      }
      
      navigator.getUserMedia(
        constraints,
        stream => {
          this.setState({ streamUrl: stream, localStream: stream })
          this.localVideo.srcObject = stream
          resolve()
        },
        () => {}
      )
      console.log(constraints.audio)
    })
  }

  getDisplay(){
    navigator.mediaDevices.getDisplayMedia().then(stream => {
      stream.oninactive = () => {
        this.state.peer.removeStream(this.state.localStream)  
        this.getUserMedia().then(() => {
          this.state.peer.addStream(this.state.localStream)  
        })
      }

      this.setState({ streamUrl: stream, localStream: stream })
      this.localVideo.srcObject = stream   
      this.state.peer.addStream(stream)   
    })
  }

  stopStreamingVideo = () => {
    this.state.localStream.getVideoTracks()[0].enabled = !(this.state.localStream.getVideoTracks()[0].enabled);
    this.setState({videoMute: !this.state.videoMute})
  }

  stopStreamingAudio = () => {
    this.state.localStream.getAudioTracks()[0].enabled = !(this.state.localStream.getAudioTracks()[0].enabled);
    this.setState({audioMute: !this.state.audioMute})
  }

  leaveChat = () => {
    this.state.localStream.getVideoTracks()[0].enabled = !(this.state.localStream.getVideoTracks()[0].enabled);
    this.props.history.push('/')
    socket.on('disconnected', () => {
      this.setState({ initiator: true })
      this.state.localStream.getVideoTracks()[0].enabled = !(this.state.localStream.getVideoTracks()[0].enabled);
    })
  }

  gotDevices(deviceInfos) {
    const document = ReactDOM.findDOMNode(this);
    const videoElement = document.querySelector('video');
    const audioInputSelect = document.querySelector('select#audioSource');
    const audioOutputSelect = document.querySelector('select#audioOutput');
    const videoSelect = document.querySelector('select#videoSource');
    const selectors = [audioInputSelect, audioOutputSelect, videoSelect];
    const values = selectors.map(select => select.value);
    selectors.forEach(select => {
      while (select.firstChild) {
        select.removeChild(select.firstChild);
      }
    });
    

    for (let i = 0; i < deviceInfos.length; i++) {
      var deviceInfo = deviceInfos[i];
      if (deviceInfo.kind === 'audioinput') {
        this.state.audioInputOptions.push(<option key={i} value={deviceInfo.deviceId}>{deviceInfo.label}</option>)
      } else if (deviceInfo.kind === 'audiooutput') {
        this.state.audioOutputOptions.push(<option key={i} value={deviceInfo.deviceId}>{deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`}</option>)
      } else if (deviceInfo.kind === 'videoinput') {
        this.state.videoSourceOptions.push(<option key={i} value={deviceInfo.deviceId}>{deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`}</option>)
      } else {
        console.log('Some other kind of source/device: ', deviceInfo);
      }
    }

    selectors.forEach((select, selectorIndex) => {
      if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
        select.value = values[selectorIndex];
      }
    });
  }

  handleError(){

  }

  onChangeAudio = ({target}) => {
    this.setState({
      audioSource: target.value
    })
    // this.getUserMedia(this.state.audioSource)
    console.log(this.state.audioSource)
  }


  enter = roomId => {
    this.setState({ connecting: true })
    const peer = this.videoCall.init(
      this.state.localStream,
      this.state.initiator
    )
    this.setState({peer})
    
    peer.on('signal', data => {
      const signal = {
        room: roomId,
        desc: data
      }
      this.state.socket.emit('signal', signal)
    })

    peer.on('stream', stream => {
      // Got remote video stream, now showing in the video tag
      this.remoteVideo.srcObject = stream
      this.setState({ connecting: false, waiting: false })
    })

    peer.on('error', function(err) {
      console.log(err)
    })
  }

  call = otherId => {
    this.videoCall.connect(otherId)
  }


  render() {
    return (
      <div className="video-wrapper">
        <div className="local-video-wrapper" >
          <video
            autoPlay
            id="localVideo"
            muted
            ref={video => (this.localVideo = video)}
            style={this.state.waiting ? {width:"90%", height:"90%", justifyContent:"center"}: {}}
          />

          {this.state.audioMute ? <div className="video-mute-logo">
            <AudioMuteIcon/> 
          </div> : <div></div>}
          {this.state.waiting ? <div></div> :
            <div className="local-video-user-name">
              <p>User(you)</p>
            </div>
        }
          
        </div>
        <video
          autoPlay
          className={`${
            this.state.connecting || this.state.waiting ? 'hide' : ''
          }`}
          id="remoteVideo"
          ref={video => (this.remoteVideo = video)}
        />
        <div className="lower-banner">
          <button className="share-screen-btn" onClick={() => {
            this.getDisplay()
          }}><ShareScreenIcon/></button>

          <button className={this.state.videoMute ? "mute-video-btn-red" : "mute-video-btn"} onClick={() => {
            this.stopStreamingVideo()
          }}>{this.state.videoMute ? <VideoMuteIcon/> : <VideoIcon/>}</button>

          <button className={this.state.audioMute ? "mute-Audio-btn-red" : "mute-Audio-btn"} onClick={() => {this.stopStreamingAudio()}}>
            {this.state.audioMute ? <AudioMuteIcon/> : <AudioIcon/>}
          </button>

          <button className="leave-button" onClick={() => {this.leaveChat()}}>
            <LeaveChatIcon/> 
          </button>

          <div className="members">
            <h2>Members: {this.state.waiting ? "1" : "2"}</h2>
          </div>
        </div>

        <div className="configurations">
          <div className="select">
            <label htmlFor="audioSource">Audio input source: </label><select id="audioSource" onChange={this.onChangeAudio}>{this.state.audioInputOptions}</select>
          </div>
          <div className="select">
            <label htmlFor="audioOutput">Audio output destination: </label><select id="audioOutput">{this.state.audioOutputOptions}</select>
          </div>
          <div className="select">
            <label htmlFor="videoSource">Video source: </label><select id="videoSource">{this.state.videoSourceOptions}</select>
          </div>
        </div>
        
        {this.state.connecting && (
          <div className="status">
            <p>Connecting...</p>
          </div>
        )}
      </div>
    )
  }
}

export default Video
