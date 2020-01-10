import React, { useState } from 'react'

const goToRoom = (history, roomId) => {
  history.push(`/${roomId}`)
}


export function goToRoomInput({history}) {
  let [roomId, setRoomId] = useState();

  return (<div className="enter-room-container">
        <h1 className="title">WebRTC Application</h1>
        <h3 className="sub-title">By Omar Said</h3>
        <form>
            <input type="text" placeholder="Room id" onChange={(event) => {
              setRoomId(event.target.value)
            }}/>
            
            <button onClick={() => {
              goToRoom(history, roomId)
            }}>Enter</button>
          </form>
    </div>)
}