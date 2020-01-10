import React from 'react'
import VideoCall from '../helpers/simple-peer'
import '../styles/video.css'
import io from 'socket.io-client'

import ShareScreenIcon from './icons/ShareScreenIcon';
import AudioIcon from './icons/AudioIcon';
import AudioMuteIcon from './icons/AudioMuteIcon';
import VideoMuteIcon from './icons/VideoMuteIcon';
import VideoIcon from './icons/VideoIcon';
import LeaveChatIcon from './icons/LeaveChatIcon';
import ChatIcon from './icons/ChatIcon'

var socket;
var messages;
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
      message: null,
      handle: null,
    }
    var myStream;
    
  }
  
  videoCall = new VideoCall()
  componentDidMount() {
    socket = io("http://localhost:8080")
    messages = []
    const component = this
    this.setState({ socket })
    const { roomId } = this.props.match.params
    this.getUserMedia().then(() => {
      socket.emit('join', { roomId: roomId })
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

    socket.on('chat', function(data){
      messages.concat(data)
    });
  }

  getUserMedia(cb) {
    return new Promise((resolve, reject) => {
      // This is for the different browsers
      navigator.getUserMedia = navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia
      // Setting up constraints
      const constraints = {
        video: {
          width: { min: 160, ideal: 640, max: 1280 },
          height: { min: 120, ideal: 360, max: 720 }
        },
        audio: true
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
  }

  openChat = () => {
    this.setState({viewChat: !this.state.viewChat})
    console.log(this.state.viewChat)
  }

  sendMessage = (handle, message) => {
    socket.emit('chat', {
      message: message,
      handle: handle
    });

    this.setState({ message: '', handle: ''});
    console.log(messages);
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
    const { data } = this.state;
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

          <button className="chat-btn" onClick={() => {this.openChat()}}>
            <ChatIcon/>}
          </button>

          <button className="leave-button" onClick={() => {this.leaveChat()}}>
            <LeaveChatIcon/> 
          </button>

          <div className="members">
            <h2>Members: {this.state.waiting ? "1" : "2"}</h2>
          </div>

          {this.state.viewChat ? 
              <div id="mario-chat">
              <div id="chat-window">
                    <div id="output">
                    {data.length <= 0
                      ? ''
                      : messages.map((message) => (
                        <h3 className="message" key={data.message}>
                          <span style={{ color: 'red' }}> id: </span> {message.handle} <br />
                          <span style={{ color: 'red', paddingLeft: 10 }}> data: </span>
                          {message.message}
                        </h3>
                  ))}
                    </div>
                    <div id="feedback"></div>
              </div>
              <input 
                className="input" 
                type="text" 
                id="handle" 
                onChange={(e) => this.setState({ handle: e.target.value })}
                placeholder="Handle"/>
              <input 
                className="input" 
                type="text" 
                id="message"
                onChange={(e) => this.setState({ textMessage: e.target.value })}
                placeholder="Message"/>
              <button className="sendbutton" id="send" onClick={() => this.sendMessage(this.state.handle, this.state.message)}>Send</button>
              </div> : 
          <div></div> }
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
